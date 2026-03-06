import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runCompetitiveAnalysis, runPRD, runMVPPlan, runTechSpec } from "@/lib/analysis-pipelines"
import { callOpenRouterFallback } from "@/lib/openrouter"
import { type AnalysisType } from "@/lib/utils"
import { getTokenCost } from "@/lib/token-economics"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { linkifyBareUrls } from "@/lib/markdown-links"

export const maxDuration = 300 // 5 min — competitive analysis pipeline (Perplexity + Tavily + synthesis) can take up to ~70s

interface AnalysisParams {
  params: Promise<{ type: string }>
}

export async function POST(request: Request, { params }: AnalysisParams) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let creditsConsumed = 0
  let modelUsed: string | undefined
  let aiSource: "openrouter" | "anthropic" | "n8n" | "inhouse" | undefined
  let userId: string | undefined
  let projectId: string | undefined
  let analysisType: string | undefined

  try {
    const { type } = await params
    analysisType = type
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id

    const body = await request.json()
    projectId = body.projectId
    const { idea, name, competitiveAnalysis, prd, model } = body

    if (!projectId || !idea || !name) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, idea, and name are required"
      return NextResponse.json(
        { error: "projectId, idea, and name are required" },
        { status: 400 }
      )
    }

    // Validate analysis type
    const validTypes = ["competitive-analysis", "prd", "mvp-plan", "tech-spec"]
    if (!validTypes.includes(type)) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = `Invalid analysis type: ${type}`
      return NextResponse.json(
        { error: `Invalid analysis type: ${type}` },
        { status: 400 }
      )
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      statusCode = 404
      errorType = "not_found"
      errorMessage = "Project not found"
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check and deduct tokens (stored in credits balance)
    const creditCost = getTokenCost(type as AnalysisType, model)
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_action: type,
      p_description: `${type} for "${name}"`,
    })

    if (!consumed) {
      statusCode = 402
      errorType = "insufficient_credits"
      errorMessage = "Insufficient credits"
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 402 }
      )
    }

    creditsConsumed = creditCost

    // Route to the appropriate in-house pipeline
    let result: { content: string; source: string; model: string }

    if (type === "competitive-analysis") {
      result = await runCompetitiveAnalysis({ idea, name, model })
    } else if (type === "prd") {
      result = await runPRD({ idea, name, competitiveAnalysis, model })
    } else if (type === "mvp-plan") {
      result = await runMVPPlan({ idea, name, prd, model })
    } else if (type === "tech-spec") {
      result = await runTechSpec({ idea, name, prd, model })
    } else {
      // gap-analysis still uses OpenRouter fallback
      result = await callOpenRouterFallback(type, idea, name, model)
    }

    // Track AI model and source
    modelUsed = result.model
    aiSource = result.source as "openrouter" | "inhouse"

    const contentWithLinks = linkifyBareUrls(result.content)

    const metadata = {
      source: result.source,
      model: result.model,
      generated_at: new Date().toISOString(),
    }

    // Store the result based on type — always include source/model metadata
    if (type === "prd") {
      await supabase.from("prds").insert({
        project_id: projectId,
        content: contentWithLinks,
      })
    } else if (type === "mvp-plan") {
      await supabase.from("mvp_plans").insert({
        project_id: projectId,
        content: contentWithLinks,
      })
    } else if (type === "tech-spec") {
      await supabase.from("tech_specs").insert({
        project_id: projectId,
        content: contentWithLinks,
      })
    } else {
      await supabase.from("analyses").insert({
        project_id: projectId,
        type,
        content: contentWithLinks,
        metadata,
      })
    }

    // Update project
    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    console.log(`[Analysis] type=${type} project=${projectId} source=${result.source} model=${result.model}`)

    return NextResponse.json({
      content: contentWithLinks,
      source: result.source,
      model: result.model,
      type,
    })
  } catch (error) {
    console.error("Analysis error:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json(
      { error: "Failed to generate analysis. Please try again." },
      { status: 500 }
    )
  } finally {
    // Track metrics (fire and forget - won't block response)
    if (userId && analysisType) {
      trackAPIMetrics({
        endpoint: `/api/analysis/${analysisType}`,
        method: "POST",
        featureType: "analysis",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed,
        modelUsed,
        aiSource,
        errorType,
        errorMessage,
      })
    }
  }
}
