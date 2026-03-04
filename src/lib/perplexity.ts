import OpenAI from "openai"
import { COMPETITOR_SEARCH_SYSTEM_PROMPT, buildCompetitorSearchUserPrompt } from "@/lib/prompts"

// Perplexity uses an OpenAI-compatible interface with a different base URL
const perplexity = new OpenAI({
  baseURL: "https://api.perplexity.ai",
  apiKey: process.env.PERPLEXITY_API_KEY || "",
})

export interface PerplexityCompetitorResult {
  competitors: Array<{
    name: string
    description: string
    whyCompetes: string
    url: string
  }>
  rawResponse: string
}

export async function searchCompetitors(
  idea: string,
  name: string
): Promise<PerplexityCompetitorResult> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured")
  }

  const response = await perplexity.chat.completions.create({
    model: "sonar-pro",
    messages: [
      { role: "system", content: COMPETITOR_SEARCH_SYSTEM_PROMPT },
      { role: "user", content: buildCompetitorSearchUserPrompt(idea, name) },
    ],
    max_tokens: 2048,
    temperature: 0.2,
  })

  const rawResponse = response.choices[0]?.message?.content || ""

  try {
    // Extract JSON from response (Perplexity may wrap it in markdown code blocks)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { competitors: [] }
    return { competitors: parsed.competitors || [], rawResponse }
  } catch {
    // If JSON parsing fails, return empty competitors but preserve raw response
    // The synthesis step will still run with whatever context is available
    console.warn("[Perplexity] Failed to parse JSON response, using raw text")
    return { competitors: [], rawResponse }
  }
}
