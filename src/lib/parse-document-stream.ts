// NDJSON stream parser for document generation endpoints.
// Mirrors the parseChatStream pattern in src/components/chat/chat-interface.tsx.

export interface StreamStage {
  message: string
  step: number
  totalSteps: number
}

export interface ParseDocumentStreamCallbacks {
  onStage: (stage: StreamStage) => void
  onToken: (content: string) => void
  onDone: (model: string) => void
  onError: (message: string) => void
}

export async function parseDocumentStream(
  response: Response,
  callbacks: ParseDocumentStreamCallbacks
): Promise<void> {
  if (!response.body) {
    callbacks.onError("No response body")
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    let receivedDone = false
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? "" // keep incomplete last line in buffer

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          const event = JSON.parse(trimmed) as
            | { type: "stage"; message: string; step: number; totalSteps: number }
            | { type: "token"; content: string }
            | { type: "done"; model: string }
            | { type: "error"; message: string }

          if (event.type === "stage") {
            callbacks.onStage({ message: event.message, step: event.step, totalSteps: event.totalSteps })
          } else if (event.type === "token") {
            callbacks.onToken(event.content)
          } else if (event.type === "done") {
            receivedDone = true
            callbacks.onDone(event.model)
            return
          } else if (event.type === "error") {
            callbacks.onError(event.message)
            return
          }
        } catch {
          // Skip malformed JSON lines — partial writes are safe to ignore
          if (process.env.NODE_ENV === "development") {
            console.warn("[parseDocumentStream] Skipped malformed NDJSON line:", trimmed)
          }
        }
      }
    }
    // Stream ended without a done event — signal error so the caller can clean up
    if (!receivedDone) {
      callbacks.onError("Stream ended unexpectedly")
    }
  } finally {
    reader.releaseLock()
  }
}
