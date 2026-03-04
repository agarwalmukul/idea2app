export { PROMPT_CHAT_SYSTEM, IDEA_SUMMARY_PROMPT, POST_SUMMARY_SYSTEM } from "@/lib/prompts"

// Available AI models from OpenRouter
export const AVAILABLE_MODELS = [
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "Balanced performance and speed",
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    description: "Most capable, best for complex tasks",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "Fast and capable",
  },
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "High performance",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash",
    description: "Fast and free",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    description: "Open source, capable",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    description: "Cost-effective alternative",
  },
]

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4"

// ─── Document Tab Model Selection ─────────────────────────────────
// These models appear in the AI model selector on document tabs
// (Competitive Research, PRD, MVP Plan, Mockups, Tech Spec, Deploy).
// The selected model is used when the OpenRouter fallback is triggered.

export interface DocumentModel {
  id: string
  name: string
  description: string
  badge?: string
}

export const DOCUMENT_PRIMARY_MODELS: DocumentModel[] = [
  {
    id: "x-ai/grok-4-1-fast",
    name: "Grok 4.1 Fast",
    description: "Fastest for quick answers",
    badge: "Fastest",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    description: "Most efficient for everyday tasks",
    badge: "Efficient",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    description: "Think longer for complex tasks",
    badge: "Thinking",
  },
]

export const DOCUMENT_MORE_MODELS: DocumentModel[] = [
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "Balanced performance and speed",
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    description: "Most capable from Anthropic",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "Fast and capable",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast and efficient from Google",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    description: "Advanced reasoning model",
  },
  {
    id: "x-ai/grok-3",
    name: "Grok 3",
    description: "Powerful model from xAI",
  },
  {
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    description: "Open source from Meta",
  },
]

export const DEFAULT_DOCUMENT_MODEL = "openai/gpt-5-mini"
