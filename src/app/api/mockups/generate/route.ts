import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CREDIT_COSTS } from "@/lib/utils"
import OpenAI from "openai"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { buildMockupPrompt } from "@/lib/prompts"

const encoder = new TextEncoder()

const OPTION_HEADER_RE = /^#{1,6}\s*Option\s*[A-C]/im
const JSON_BLOCK_RE = /```json[\s\S]*?```/gi
const OPTION_LABELS = ["A", "B", "C"]

interface LegacyOptionChunk {
  title: string
  json: string
}

function isValidMockupStructure(content: string): boolean {
  const optionHeaders = content.match(OPTION_HEADER_RE) || []
  const jsonBlocks = content.match(JSON_BLOCK_RE) || []
  const pros = [...content.matchAll(/^\s*[#*_`\s]*pros\s*: ?\s*$/gim)]
  const cons = [...content.matchAll(/^\s*[#*_`\s]*cons\s*: ?\s*$/gim)]

  return optionHeaders.length >= 3 && jsonBlocks.length >= 3 && pros.length >= 3 && cons.length >= 3
}

function extractLegacyOptionChunks(content: string): LegacyOptionChunk[] {
  const lines = content.split("\n")
  const chunks: LegacyOptionChunk[] = []
  let currentTitle = "Screen"

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    const headingMatch = line.match(/^(#{1,6})\s*(.+)$/)
    if (headingMatch) {
      currentTitle = headingMatch[2]
        .replace(/^`+|`+$/g, "")
        .replace(/:\s*$/, "")
        .trim() || "Screen"
      i += 1
      continue
    }

    if (/^```json\s*$/i.test(line)) {
      const startLine = i
      i += 1

      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        i += 1
      }

      if (i < lines.length) {
        const block = lines.slice(startLine, i + 1).join("\n")
        chunks.push({ title: currentTitle, json: block })
      }
      i += 1
      continue
    }

    i += 1
  }

  return chunks
}

function buildLegacyTemplate(content: string): string | null {
  return normalizeLegacyOptionTemplate(content)
}

function cleanSectionTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^(\`|\`{3,})\s*|\s+\`?\`{3,}$/g, "")
    .replace(/^\s*Option\s*[A-C]\s*-\s*Option\s*[A-C]\s*[-:]?\s*/i, "")
    .replace(/^\s*Option\s*[A-C]\s*[-:]?/i, "")
    .replace(/^\s*-\s*/, "")
    .trim()
}

function buildFallbackProsCons(title: string, json: string, optionLabel: string): { pros: string[]; cons: string[] } {
  const normalizedTitle = (title || "").toLowerCase()
  const normalizedJson = (json || "").toLowerCase()
  const text = `${normalizedTitle} ${normalizedJson}`
  const has = (pattern: RegExp) => pattern.test(text)

  const pros: string[] = []
  const cons: string[] = []

  if (has(/wizard|step|\btab\b|\btabs?\b/)) {
    pros.push(`${optionLabel}: Uses an explicit progression pattern to reduce cognitive load during setup.`)
  }

  if (has(/faq|question|table|faqs?|help/)) {
    pros.push("Groups operational details into structured blocks, making information easy to scan and maintain.")
  }

  if (has(/nav|menu|sidebar|navigation/)) {
    pros.push("Provides obvious wayfinding so users can jump between configuration, analytics, and content tasks quickly.")
  }

  if (has(/form|input|textbox|combobox|select/)) {
    pros.push("Keeps agent setup and management operations directly editable in a single screen.")
  }

  if (has(/card|grid/)) {
    pros.push("Uses modular cards/grids to keep functional areas visually separated and scannable.")
  }

  if (has(/button/) && has(/save|deploy|preview|play/)) {
    pros.push("Places high-value actions near relevant content, making completion flow straightforward.")
  }

  if (pros.length < 2) {
    pros.push(`${optionLabel}: Keeps layout hierarchy explicit for faster handoff to implementation.`)
    pros.push("Reduces visual ambiguity with short labels and clearly grouped controls.")
  }

  if (has(/dashboard|chart|stat|analytics/)) {
    cons.push("Adds data synchronization and freshness requirements that raise backend implementation complexity.")
  }

  if (has(/integration|api|webhook|voice|tts|booking/)) {
    cons.push("Needs platform/API integration work, which increases testing surface and operational assumptions.")
  }

  if (has(/wizard|step|flow|onboard/)) {
    cons.push("Requires explicit state and validation logic to avoid getting users stuck between flow stages.")
  }

  if (has(/faq|table|responsive|mobile/)) {
    cons.push("Dense content-heavy sections need careful responsive tuning for mobile readability.")
  }

  if (cons.length < 2) {
    cons.push("Multiple interactive regions demand stronger keyboard/focus treatment for accessibility.")
    cons.push("Live business data should be validated before exposing advanced controls in production.")
  }

  return {
    pros: pros.slice(0, 4),
    cons: cons.slice(0, 4),
  }
}

function normalizeLegacyOptionTemplate(content: string): string | null {
  const chunks = extractLegacyOptionChunks(content)

  if (!chunks.length) return null

  const sections = [...chunks]

  while (sections.length < 3 && sections.length > 0) {
    sections.push({
      title: `Alternative ${sections.length + 1}`,
      json: sections[sections.length - 1].json,
    })
  }

  const selectedSections = sections.slice(0, 3)

  const output: string[] = []

  for (let i = 0; i < selectedSections.length; i += 1) {
    const section = selectedSections[i]
    const label = OPTION_LABELS[i] || `${i + 1}`
    const cleanedTitle = cleanSectionTitle(section.title)
    const title = cleanedTitle || `Option ${label}`
    const fallback = buildFallbackProsCons(title, section.json, `Option ${label}`)

    output.push(`### Option ${label} - ${title}`)
    output.push("Pros:")
    fallback.pros.forEach((item) => {
      output.push(`- ${item}`)
    })
    output.push("Cons:")
    fallback.cons.forEach((item) => {
      output.push(`- ${item}`)
    })
    output.push(section.json)
    output.push("")
  }

  return output.join("\n")
}

function sanitizeMockupProsCons(content: string): string {
  const chunks = extractLegacyOptionChunks(content)
  if (chunks.length < 3) return content

  const selected = chunks.slice(0, 3)
  const lines: string[] = []

  for (let i = 0; i < selected.length; i += 1) {
    const section = selected[i]
    const label = OPTION_LABELS[i] || `${i + 1}`
    const title = cleanSectionTitle(section.title) || `Option ${label}`
    const fallback = buildFallbackProsCons(title, section.json, `Option ${label}`)

    lines.push(`### Option ${label} - ${title}`)
    lines.push("Pros:")
    fallback.pros.forEach((item) => lines.push(`- ${item}`))
    lines.push("Cons:")
    fallback.cons.forEach((item) => lines.push(`- ${item}`))
    lines.push(section.json)
    lines.push("")
  }

  return lines.join("\n")
}

async function enforceMockupFormat({
  client,
  content,
  mvpPlan,
  projectName,
  model,
}: {
  client: OpenAI,
  content: string,
  mvpPlan: string,
  projectName: string,
  model: string,
}): Promise<string> {
  if (isValidMockupStructure(content)) {
    return sanitizeMockupProsCons(content)
  }

  const fallbackPrompt =
    `You are a strict formatter. Convert the mockup result below into the required template exactly.\n` +
    `Required: exactly 3 options labeled Option A/B/C.\n` +
    `For each option include: heading, Pros section (2-4 bullets), Cons section (2-4 bullets), and ONE json-render code block.\n` +
    `Preserve the JSON blocks whenever possible; only adjust surrounding prose as needed.\n\n` +
    `Source output:\n\n${content}\n\n` +
    `Project name: ${projectName}\n` +
    `MVP context: ${mvpPlan}`

  try {
    const rewriteResp = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: fallbackPrompt }],
      max_tokens: 20000,
    })

    const rewritten = rewriteResp.choices?.[0]?.message?.content?.trim() || ""
    if (rewritten && isValidMockupStructure(rewritten)) {
      return sanitizeMockupProsCons(rewritten)
    }

    const normalizedRewrite = normalizeLegacyOptionTemplate(rewritten)
    if (normalizedRewrite) {
      return normalizedRewrite
    }

    const legacy = buildLegacyTemplate(content)
    if (legacy) {
      return legacy
    }
  } catch (error) {
    console.warn("[Mockup] format enforcement failed, using deterministic fallback", error)
  }

  const legacy = buildLegacyTemplate(content)
  if (legacy) {
    return legacy
  }

  console.warn("[Mockup] format enforcement failed, using original generated content")
  return content
}

function createStreamSender(controller: ReadableStreamDefaultController) {
  return (event: object) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
}

export const maxDuration = 300 // 5 min — AI generation can be slow

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let creditsConsumed = 0
  let modelUsed: string | undefined
  let userId: string | undefined
  let projectId: string | undefined
  let isStreaming = false

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
    const { mvpPlan, projectName, model, stream: streamRequested } = body

    if (!projectId || !mvpPlan || !projectName) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, mvpPlan, and projectName are required"
      return NextResponse.json(
        { error: "projectId, mvpPlan, and projectName are required" },
        { status: 400 }
      )
    }

    // Validate model (optional - if not provided, use default)
    const selectedModel = model || process.env.OPENROUTER_ANALYSIS_MODEL || "anthropic/claude-sonnet-4"

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
    const creditCost = CREDIT_COSTS['mockup']
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_action: 'mockup',
      p_description: `Mockup generation for "${projectName}"`,
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

    // ─── Streaming path ─────────────────────────────────────────────────
    if (streamRequested === true) {
      isStreaming = true

      const readableStream = new ReadableStream({
        async start(controller) {
          const send = createStreamSender(controller)

          try {
            const openrouterClient = new OpenAI({
              baseURL: "https://openrouter.ai/api/v1",
              apiKey: process.env.OPENROUTER_API_KEY || "",
            })

            if (!process.env.OPENROUTER_API_KEY) {
              throw new Error("OpenRouter API key not configured")
            }

            send({ type: "stage", message: "Generating UI mockups...", step: 1, totalSteps: 2 })

            const streamResp = await openrouterClient.chat.completions.create({
              model: selectedModel,
              messages: [{ role: "user", content: buildMockupPrompt(mvpPlan, projectName) }],
              max_tokens: 16384,
              stream: true,
            })

            let generatedContent = ""
            for await (const chunk of streamResp) {
              const token = chunk.choices?.[0]?.delta?.content ?? ""
              if (token) {
                generatedContent += token
                send({ type: "token", content: token })
              }
            }

            if (!generatedContent) throw new Error("No content returned from OpenRouter")

            const normalizedContent = await enforceMockupFormat({
              client: openrouterClient,
              content: generatedContent,
              mvpPlan,
              projectName,
              model: selectedModel,
            })

            send({ type: "stage", message: "Saving mockups...", step: 2, totalSteps: 2 })
            modelUsed = selectedModel

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from("mockups").insert({
              project_id: projectId!,
              content: normalizedContent,
              model_used: selectedModel,
              metadata: { source: "openrouter", model: selectedModel, generated_at: new Date().toISOString() },
            })

            await supabase
              .from("projects")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("id", projectId!)

            send({ type: "done", model: selectedModel })

            // Track metrics for successful streaming request
            trackAPIMetrics({
              endpoint: `/api/mockups/generate`,
              method: "POST",
              featureType: "mockup",
              userId: userId!,
              projectId: projectId ?? null,
              statusCode: 200,
              responseTimeMs: timer.getElapsedMs(),
              creditsConsumed,
              modelUsed: selectedModel,
              aiSource: "openrouter",
              errorType: undefined,
              errorMessage: undefined,
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Mockup generation failed"
            send({ type: "error", message: msg })
            statusCode = 500
            errorType = "generation_error"
            errorMessage = msg

            // Track metrics for failed streaming request
            trackAPIMetrics({
              endpoint: `/api/mockups/generate`,
              method: "POST",
              featureType: "mockup",
              userId: userId!,
              projectId: projectId ?? null,
              statusCode: 500,
              responseTimeMs: timer.getElapsedMs(),
              creditsConsumed,
              modelUsed: undefined,
              aiSource: "openrouter",
              errorType: "generation_error",
              errorMessage: msg,
            })
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: { "Content-Type": "application/x-ndjson" },
      })
    }
    // ─── End streaming path ─────────────────────────────────────────────

    // Generate mockup using OpenRouter
    const openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "",
    })

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not configured")
    }

    const response = await openrouter.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "user",
          content: buildMockupPrompt(mvpPlan, projectName),
        },
      ],
      max_tokens: 16384, // Large limit for multiple JSON spec pages
    })

    const rawContent = response.choices[0]?.message?.content

    if (!rawContent) {
      throw new Error("No content returned from OpenRouter")
    }

    const content = await enforceMockupFormat({
      client: openrouter,
      content: rawContent,
      mvpPlan,
      projectName,
      model: selectedModel,
    })

    modelUsed = selectedModel

    const metadata = {
      source: "openrouter",
      model: selectedModel,
      generated_at: new Date().toISOString(),
    }

    // Store the mockup in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("mockups").insert({
      project_id: projectId,
      content,
      model_used: selectedModel,
      metadata,
    })

    // Update project
    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    console.log(`[Mockup] project=${projectId} model=${selectedModel}`)

    return NextResponse.json({
      content,
      model: selectedModel,
      source: "openrouter",
    })
  } catch (error) {
    console.error("Mockup generation error:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json(
      { error: "Failed to generate mockup. Please try again." },
      { status: 500 }
    )
  } finally {
    // Track metrics (fire and forget - won't block response)
    if (!isStreaming && userId) {
      trackAPIMetrics({
        endpoint: `/api/mockups/generate`,
        method: "POST",
        featureType: "mockup",
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
