import OpenAI from "openai"
import { LEGACY_ANALYSIS_PROMPTS, buildGeneralChatSystemPrompt } from "@/lib/prompts"

// ─── Model Configuration ───────────────────────────────────────────
// Change these to switch which OpenRouter model powers each feature.
// Browse available models at: https://openrouter.ai/models
const CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL || "anthropic/claude-sonnet-4"
const ANALYSIS_MODEL = process.env.OPENROUTER_ANALYSIS_MODEL || "anthropic/claude-sonnet-4"
// ────────────────────────────────────────────────────────────────────

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

export async function callOpenRouterFallback(
  type: string,
  idea: string,
  name: string,
  userSelectedModel?: string
): Promise<{ content: string; source: "openrouter"; model: string }> {
  const promptFn = LEGACY_ANALYSIS_PROMPTS[type]

  if (!promptFn) {
    throw new Error(`Unknown analysis type: ${type}`)
  }

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured")
  }

  const modelToUse = userSelectedModel || ANALYSIS_MODEL

  const response = await openrouter.chat.completions.create({
    model: modelToUse,
    messages: [
      {
        role: "user",
        content: promptFn(idea, name),
      },
    ],
    max_tokens: 4096,
  })

  const content = response.choices[0]?.message?.content

  if (!content) {
    throw new Error("No content returned from OpenRouter")
  }

  return { content, source: "openrouter", model: modelToUse }
}

// Chat completion for the chat interface
export async function chatCompletion(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  idea: string
): Promise<{ content: string; source: "openrouter"; model: string }> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured")
  }

  const systemMessage = {
    role: "system" as const,
    content: buildGeneralChatSystemPrompt(idea),
  }

  const response = await openrouter.chat.completions.create({
    model: CHAT_MODEL,
    messages: [systemMessage, ...messages.slice(-20)], // Keep last 20 messages for context
    max_tokens: 2048,
  })

  const content = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again."

  return { content, source: "openrouter", model: CHAT_MODEL }
}
