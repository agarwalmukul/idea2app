import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { DOCUMENT_EDIT_SYSTEM_PROMPT, buildDocumentEditUserPrompt } from "@/lib/prompts"

export const maxDuration = 60

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

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id

    // Parse request
    const body = await request.json()
    projectId = body.projectId
    const { fullContent, selectedText, editPrompt, model } = body

    // Validation
    if (!projectId || !fullContent || !selectedText || !editPrompt) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "Missing required fields"
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check credits (soft check - log warning but allow for testing)
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single()

    // Type assertion needed as the credits column might not be in generated types yet
    const profileData = profile as { credits?: number } | null
    const hasAppCredits = profileData && (profileData.credits ?? 0) >= 1
    if (!hasAppCredits) {
      console.warn(`User ${user.id} has insufficient app credits, but proceeding with OpenRouter`)
    }

    // Determine which model to use
    const selectedModel = model || process.env.OPENROUTER_ANALYSIS_MODEL || "anthropic/claude-sonnet-4"
    modelUsed = selectedModel
    aiSource = "openrouter"

    // Call OpenRouter API
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Idea2App Document Editor",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content: DOCUMENT_EDIT_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: buildDocumentEditUserPrompt(fullContent, selectedText, editPrompt),
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      }
    )

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json()
      console.error("OpenRouter API error:", errorData)
      statusCode = 500
      errorType = "ai_model_error"
      errorMessage = "Failed to generate edit"
      return NextResponse.json(
        { error: "Failed to generate edit" },
        { status: 500 }
      )
    }

    const data = await openRouterResponse.json()
    const suggestedEdit = data.choices?.[0]?.message?.content?.trim()

    if (!suggestedEdit) {
      statusCode = 500
      errorType = "ai_model_error"
      errorMessage = "No edit generated"
      return NextResponse.json(
        { error: "No edit generated" },
        { status: 500 }
      )
    }

    // Consume 1 credit only if user has app credits
    let creditsUsed = 0
    if (hasAppCredits) {
      const { error: creditError } = await supabase.rpc("consume_credits", {
        p_user_id: user.id,
        p_amount: 1,
        p_action: "document_edit",
        p_description: `Inline AI edit for project ${projectId}`,
      })

      if (creditError) {
        console.error("Error consuming credits:", creditError)
      } else {
        creditsUsed = 1
        creditsConsumed = 1
      }
    }

    return NextResponse.json({
      suggestedEdit,
      creditsUsed,
      modelUsed: selectedModel,
    })
  } catch (error) {
    console.error("Error in document-edit API:", error)
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
        endpoint: "/api/document-edit",
        method: "POST",
        featureType: "document-edit",
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
