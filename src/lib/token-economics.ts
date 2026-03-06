export type TokenBillableAction =
  | "competitive-analysis"
  | "gap-analysis"
  | "prd"
  | "mvp-plan"
  | "tech-spec"
  | "mockup"
  | "app-static"
  | "app-dynamic"
  | "app-spa"
  | "app-pwa"
  | "chat"
  | "document-edit"

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// Keep this configurable from one place.
// 20 = $0.20 per token.
export const TOKEN_VALUE_CENTS = toNumber(
  process.env.NEXT_PUBLIC_TOKEN_VALUE_CENTS || process.env.TOKEN_VALUE_CENTS,
  20
)

export const BASE_ACTION_TOKENS: Record<TokenBillableAction, number> = {
  "competitive-analysis": 5,
  "gap-analysis": 5,
  prd: 10,
  "mvp-plan": 10,
  "tech-spec": 10,
  mockup: 15,
  "app-static": 50,
  "app-dynamic": 100,
  "app-spa": 150,
  "app-pwa": 200,
  chat: 1,
  "document-edit": 1,
}

const DEFAULT_MODEL_MULTIPLIER = toNumber(
  process.env.NEXT_PUBLIC_TOKEN_MODEL_DEFAULT_MULTIPLIER || process.env.TOKEN_MODEL_DEFAULT_MULTIPLIER,
  1
)

const MODEL_MULTIPLIERS: Array<{ match: string; multiplier: number }> = [
  { match: "gpt-5", multiplier: 1.5 },
  { match: "claude-opus", multiplier: 1.35 },
  { match: "gemini-3", multiplier: 1.25 },
  { match: "claude-sonnet", multiplier: 1.15 },
  { match: "gpt-4", multiplier: 1.1 },
  { match: "gemini-2.5-flash", multiplier: 0.9 },
  { match: "gpt-5-mini", multiplier: 0.85 },
  { match: "grok-4-1-fast", multiplier: 0.8 },
  { match: "deepseek", multiplier: 0.8 },
  { match: ":free", multiplier: 0.5 },
]

export function getModelTokenMultiplier(modelId?: string) {
  if (!modelId) return DEFAULT_MODEL_MULTIPLIER
  const normalized = modelId.toLowerCase()
  const match = MODEL_MULTIPLIERS.find((m) => normalized.includes(m.match))
  return match?.multiplier ?? DEFAULT_MODEL_MULTIPLIER
}

export function getTokenCost(action: TokenBillableAction, modelId?: string) {
  const base = BASE_ACTION_TOKENS[action]
  const multiplier = getModelTokenMultiplier(modelId)
  return Math.max(1, Math.ceil(base * multiplier))
}

export function estimateFullReportTokens(modelId?: string) {
  const actions: TokenBillableAction[] = [
    "competitive-analysis",
    "prd",
    "mvp-plan",
    "tech-spec",
  ]

  return actions.reduce((sum, action) => sum + getTokenCost(action, modelId), 0)
}

export function tokensToUsdCents(tokens: number) {
  return Math.round(tokens * TOKEN_VALUE_CENTS)
}

export const PRICING_CARD_TOKENS = {
  free: 40,
  starter: 250,
  pro: 900,
}
