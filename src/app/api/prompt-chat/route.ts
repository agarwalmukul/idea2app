import { NextResponse } from "next/server"
import OpenAI from "openai"

import { createClient } from "@/lib/supabase/server"
import { PROMPT_CHAT_SYSTEM, IDEA_SUMMARY_PROMPT, POST_SUMMARY_SYSTEM } from "@/lib/prompt-chat-config"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

const CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL || "anthropic/claude-sonnet-4"
const DEFAULT_PAGE_SIZE = 40
const MAX_PAGE_SIZE = 200

type PromptChatMessage = {
  id?: string
  role?: string | null
  content?: string | null
  created_at?: string | null
  metadata?: unknown
}

type PromptChatStreamEvent =
  | { type: "start"; userMessage: unknown }
  | { type: "token"; content: string }
  | { type: "done"; userMessage: unknown; assistantMessage: unknown; stage: string; summary: string | null }
  | { type: "error"; error: string }

function dedupePromptChatMessages(messages: PromptChatMessage[] = []) {
  const deduped: PromptChatMessage[] = []
  const lastSeen = new Map<string, number>()

  for (const message of messages) {
    const content = typeof message.content === "string" ? message.content.trim() : ""
    const role = message.role || ""
    const key = `${role}:${content}`
    const currentTime = message.created_at ? new Date(message.created_at).getTime() : NaN
    const lastTime = lastSeen.get(key)
    const isDuplicate = Number.isFinite(lastTime) && Number.isFinite(currentTime)
      ? Math.abs(currentTime - (lastTime as number)) <= 5000
      : false

    if (!isDuplicate) {
      deduped.push(message)
    }

    if (Number.isFinite(currentTime)) {
      lastSeen.set(key, currentTime)
    }
  }

  return deduped
}

function parseBoolean(value: unknown) {
  return value === true || value === "true"
}

function parsePageSize(value: string | null | undefined) {
  const parsed = Number.parseInt(value || "", 10)
  if (Number.isNaN(parsed)) return DEFAULT_PAGE_SIZE
  return Math.min(Math.max(parsed, 10), MAX_PAGE_SIZE)
}

export async function GET(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let userId: string | undefined
  let projectId: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id
    const { searchParams } = new URL(request.url)
    projectId = searchParams.get("projectId")
    const limit = parsePageSize(searchParams.get("limit"))
    const before = searchParams.get("before")

    if (!projectId) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId is required"
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
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

    // Get message history page (latest messages first, then return ascending)
    let query = supabase
      .from("prompt_chat_messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit + 1)

    if (before) {
      query = query.lt("created_at", before)
    }

    const { data: rawMessages, error: messagesError } = await query

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
      return NextResponse.json({ messages: [], hasMore: false, cursor: null, stage: "initial" })
    }

    const page = (rawMessages || [])
    const hasMore = page.length > limit
    const messagesForPage = hasMore ? page.slice(0, limit) : page
    const orderedMessages = messagesForPage.reverse()
    const dedupedMessages = dedupePromptChatMessages(orderedMessages)

    // Determine conversation stage based on messages
    let stage = "initial"
    if (dedupedMessages && dedupedMessages.length > 0) {
      const lastAssistantMsg = dedupedMessages.filter(m => m.role === "assistant").pop()
      const metadata = lastAssistantMsg?.metadata as { stage?: string } | null
      if (metadata?.stage === "summary") {
        stage = "summarized"
      } else if (dedupedMessages.length > 0) {
        stage = "refining"
      }
    }

    return NextResponse.json({
      messages: dedupedMessages,
      hasMore,
      cursor: dedupedMessages[0]?.created_at || null,
      stage,
    })
  } catch (error) {
    console.error("GET /api/prompt-chat error:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    // Track metrics for GET endpoint
    if (userId) {
      trackAPIMetrics({
        endpoint: "/api/prompt-chat",
        method: "GET",
        featureType: "prompt-chat",
        userId,
        projectId,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        errorType,
        errorMessage,
      })
    }
  }
}

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let creditsConsumed = 0
  let modelUsed: string | undefined
  let userId: string | undefined
  let projectId: string | undefined

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id
    const body = await request.json()
    projectId = body.projectId
    const message = body.message
    const model = body.model
    const isInitial = body.isInitial
    const streamEnabled = parseBoolean(body.stream)

    if (!projectId || !message) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId and message are required"
      return NextResponse.json(
        { error: "projectId and message are required" },
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

    // Check credits (1 credit per message)
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: 1,
      p_action: "prompt_chat",
      p_description: "Prompt chat message",
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

    creditsConsumed = 1

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from("prompt_chat_messages")
      .insert({
        project_id: projectId,
        role: "user",
        content: message,
      })
      .select()
      .single()

    if (userMsgError) {
      console.error("Error saving user message:", userMsgError)
      statusCode = 500
      errorType = "server_error"
      errorMessage = userMsgError.message
      return NextResponse.json({ error: userMsgError.message }, { status: 500 })
    }

    // Get conversation history
    const { data: history } = await supabase
      .from("prompt_chat_messages")
      .select("role, content, metadata, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    // Check if we already have a summary
    const hasSummary = history?.some(m => {
      const metadata = m.metadata as { stage?: string } | null
      return m.role === "assistant" && metadata?.stage === "summary"
    })
    const messageCount = history?.length || 0

    // Determine conversation stage and system prompt
    let stage: "questions" | "gathering" | "summary" | "post_summary" = "gathering"
    let systemPrompt = PROMPT_CHAT_SYSTEM

    if (isInitial) {
      // First AI response - ask questions
      stage = "questions"
      systemPrompt = PROMPT_CHAT_SYSTEM
    } else if (!hasSummary && messageCount >= 2) {
      // After user answers questions (initial idea + AI questions + user answer = 3 messages, so >= 2)
      // Generate summary immediately
      stage = "summary"
      systemPrompt = PROMPT_CHAT_SYSTEM
    } else if (hasSummary) {
      // Post-summary conversation - check if message is idea-related
      stage = "post_summary"
      systemPrompt = POST_SUMMARY_SYSTEM

      // If the message seems to be refining the idea, trigger re-summarization
      const ideaRelatedKeywords = [
        "change", "update", "modify", "different", "instead", "actually", "rather",
        "target", "audience", "feature", "problem", "solution", "model", "price",
        "market", "customer", "user", "business", "revenue", "competitor"
      ]
      const messageWords = message.toLowerCase().split(/\s+/)
      const hasIdeaKeywords = ideaRelatedKeywords.some(keyword =>
        messageWords.some((word: string) => word.includes(keyword))
      )

      if (hasIdeaKeywords || message.length > 50) {
        // Likely refining the idea - trigger re-summarization
        stage = "summary"
      }
    }

    // Build messages for AI
    const aiMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      { role: "system", content: systemPrompt },
    ]

    // Add conversation history
    if (history && history.length > 0) {
      history.forEach((msg) => {
        if (msg.role === "user" || msg.role === "assistant") {
          aiMessages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })
        }
      })
    }

    // Add summary instruction if needed
    if (stage === "summary") {
      aiMessages.push({
        role: "system",
        content: IDEA_SUMMARY_PROMPT,
      })
    }

    const selectedModel = model || CHAT_MODEL

    if (streamEnabled) {
      const completionStream = await openrouter.chat.completions.create({
        model: selectedModel,
        messages: aiMessages,
        max_tokens: 2048,
        stream: true,
      })

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          const sendEvent = (event: PromptChatStreamEvent) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
          }

          sendEvent({ type: "start", userMessage })
          let assistantContent = ""

          try {
            for await (const chunk of completionStream) {
              const token = chunk.choices?.[0]?.delta?.content
              if (!token) continue
              assistantContent += token
              sendEvent({ type: "token", content: token })
            }

            const { data: assistantMessage, error: assistantMsgError } = await supabase
              .from("prompt_chat_messages")
              .insert({
                project_id: projectId,
                role: "assistant",
                content: assistantContent,
                metadata: {
                  model: selectedModel,
                  stage: stage,
                  responded_at: new Date().toISOString(),
                },
              })
              .select()
              .single()

            if (assistantMsgError) {
              throw new Error(assistantMsgError.message)
            }

            // Update project description with the latest summary if this was a summary stage
            if (stage === "summary" && assistantContent) {
              await supabase
                .from("projects")
                .update({
                  description: assistantContent,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", projectId)
            }

            modelUsed = selectedModel

            let conversationStage: "refining" | "summarized" = "refining"
            if (stage === "summary") {
              conversationStage = "summarized"
            } else if (isInitial) {
              conversationStage = "refining"
            }

            sendEvent({
              type: "done",
              userMessage,
              assistantMessage,
              stage: conversationStage,
              summary: stage === "summary" ? assistantContent : null,
            })
          } catch (streamError) {
            console.error("Prompt chat stream error:", streamError)
            statusCode = 500
            errorType = getErrorType(500, streamError)
            errorMessage = getErrorMessage(streamError)
            sendEvent({
              type: "error",
              error: errorMessage || "Failed to generate chat response",
            })
          } finally {
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    // Call OpenRouter API
    const response = await openrouter.chat.completions.create({
      model: selectedModel,
      messages: aiMessages,
      max_tokens: 2048,
    })

    const assistantContent = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again."

    // Track model used
    modelUsed = selectedModel

    // Save assistant message
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from("prompt_chat_messages")
      .insert({
        project_id: projectId,
        role: "assistant",
        content: assistantContent,
        metadata: {
          model: selectedModel,
          stage: stage,
          responded_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (assistantMsgError) {
      console.error("Error saving assistant message:", assistantMsgError)
      statusCode = 500
      errorType = "server_error"
      errorMessage = assistantMsgError.message
      return NextResponse.json({ error: assistantMsgError.message }, { status: 500 })
    }

    // Determine overall conversation stage
    let conversationStage = "refining"
    if (stage === "summary") {
      conversationStage = "summarized"
    } else if (isInitial) {
      conversationStage = "refining"
    }

    // Update project description with the latest summary if this was a summary stage
    if (stage === "summary" && assistantContent) {
      await supabase
        .from("projects")
        .update({
          description: assistantContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
    }

    console.log(`[PromptChat] project=${projectId} model=${selectedModel} stage=${stage}`)

    return NextResponse.json({
      userMessage,
      assistantMessage,
      stage: conversationStage,
      summary: stage === "summary" ? assistantContent : null,
    })
  } catch (error) {
    console.error("POST /api/prompt-chat error:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  } finally {
    // Track metrics for POST endpoint
    if (userId) {
      trackAPIMetrics({
        endpoint: "/api/prompt-chat",
        method: "POST",
        featureType: "prompt-chat",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed,
        modelUsed,
        aiSource: "openrouter",
        errorType,
        errorMessage,
      })
    }
  }
}
