import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CREDIT_COSTS } from "@/lib/utils"
import Anthropic from "@anthropic-ai/sdk"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { buildAppGenerationPrompt } from "@/lib/prompts"

const APP_TYPE_CREDITS: Record<string, number> = {
  static: CREDIT_COSTS["app-static"],
  dynamic: CREDIT_COSTS["app-dynamic"],
  spa: CREDIT_COSTS["app-spa"],
  pwa: CREDIT_COSTS["app-pwa"],
}

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let creditsConsumed = 0
  let modelUsed: string | undefined
  let aiSource: "openrouter" | "anthropic" | "n8n" | undefined
  let userId: string | undefined
  let projectId: string | undefined

  try {
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
    const { appType, idea, name } = body

    if (!projectId || !appType || !idea || !name) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, appType, idea, and name are required"
      return NextResponse.json(
        { error: "projectId, appType, idea, and name are required" },
        { status: 400 }
      )
    }

    // Validate app type
    if (!APP_TYPE_CREDITS[appType]) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = `Invalid app type: ${appType}`
      return NextResponse.json(
        { error: `Invalid app type: ${appType}` },
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

    // Check and deduct credits
    const creditCost = APP_TYPE_CREDITS[appType]
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_action: `app-${appType}`,
      p_description: `${appType} app generation for "${name}"`,
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

    // Get context from previous analyses
    const { data: analyses } = await supabase
      .from("analyses")
      .select("type, content")
      .eq("project_id", projectId)
      .limit(5)

    const { data: prds } = await supabase
      .from("prds")
      .select("content")
      .eq("project_id", projectId)
      .limit(1)

    const { data: techSpecs } = await supabase
      .from("tech_specs")
      .select("content")
      .eq("project_id", projectId)
      .limit(1)

    // Build context from available data
    let context = ""
    if (analyses?.length) {
      context += "\n\n## Previous Analyses:\n"
      analyses.forEach((a) => {
        context += `\n### ${a.type}:\n${a.content.slice(0, 1000)}...\n`
      })
    }
    if (prds?.length) {
      context += `\n\n## PRD Summary:\n${prds[0].content.slice(0, 1500)}...\n`
    }
    if (techSpecs?.length) {
      context += `\n\n## Tech Spec Summary:\n${techSpecs[0].content.slice(0, 1500)}...\n`
    }

    // Create deployment record
    const { data: deployment, error: deployError } = await supabase
      .from("deployments")
      .insert({
        project_id: projectId,
        status: "generating",
      })
      .select()
      .single()

    if (deployError) {
      statusCode = 500
      errorType = "server_error"
      errorMessage = deployError.message
      return NextResponse.json({ error: deployError.message }, { status: 500 })
    }

    // Generate code using Anthropic Claude API
    // Track model and source
    modelUsed = "claude-sonnet-4-20250514"
    aiSource = "anthropic"

    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("Anthropic API key not configured")
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })

      const prompt = buildAppGenerationPrompt(appType, name, idea, context)

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      })

      const generatedCode = response.content[0].type === "text"
        ? response.content[0].text
        : ""

      // Update deployment with generated code
      await supabase
        .from("deployments")
        .update({
          status: "generated",
          build_logs: generatedCode.slice(0, 10000), // Store code as build_logs for now
          updated_at: new Date().toISOString(),
        })
        .eq("id", deployment.id)

      return NextResponse.json({
        deploymentId: deployment.id,
        status: "generated",
        message: "App code generated successfully. Deployment pending.",
      })
    } catch (genError) {
      console.error("Code generation error:", genError)

      // Update deployment as failed
      await supabase
        .from("deployments")
        .update({
          status: "failed",
          error_message: genError instanceof Error ? genError.message : "Generation failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", deployment.id)

      statusCode = 500
      errorType = "ai_model_error"
      errorMessage = genError instanceof Error ? genError.message : "Generation failed"
      return NextResponse.json(
        { error: "Failed to generate app. Credits have been deducted." },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("App generation error:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  } finally {
    // Track metrics (fire and forget - won't block response)
    if (userId) {
      trackAPIMetrics({
        endpoint: "/api/generate-app",
        method: "POST",
        featureType: "app-generation",
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
