"use client"

import { useState, useRef, useEffect, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { Send, Bot, User, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  project_id: string
  role: string
  content: string
  metadata: unknown
  created_at: string | null
}

interface ChatInterfaceProps {
  projectId: string
  initialMessages: Message[]
  credits: number
}

type StreamEvent =
  | { type: "start"; userMessage: Message }
  | { type: "token"; content: string }
  | { type: "done"; userMessage: Message; assistantMessage: Message }
  | { type: "error"; error: string }

const MESSAGE_PAGE_SIZE = 30

export function ChatInterface({ projectId, initialMessages, credits }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [visibleMessageCount, setVisibleMessageCount] = useState(MESSAGE_PAGE_SIZE)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const visibleMessages = useMemo(() => {
    return messages.slice(-Math.min(visibleMessageCount, messages.length))
  }, [messages, visibleMessageCount])
  const canLoadMore = visibleMessages.length < messages.length

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const loadMoreMessages = () => {
    setVisibleMessageCount((prev) => Math.min(prev + MESSAGE_PAGE_SIZE, messages.length))
  }

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const parseChatStream = async (response: Response, userTempId: string, assistantTempId: string) => {
    if (!response.body) {
      throw new Error("Chat stream did not provide response body")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    const appendToken = (token: string) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantTempId
            ? { ...message, content: `${message.content}${token}` }
            : message
        )
      )
    }

    const finalizeMessage = (userMessage: Message, assistantMessage: Message) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id === userTempId) return userMessage
          if (message.id === assistantTempId) return assistantMessage
          return message
        })
      )
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue

        const event = JSON.parse(line) as StreamEvent
        if (event.type === "start") {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === userTempId ? event.userMessage : message
            )
          )
          continue
        }

        if (event.type === "token") {
          appendToken(event.content)
          continue
        }

        if (event.type === "done") {
          finalizeMessage(event.userMessage, event.assistantMessage)
          return
        }

        if (event.type === "error") {
          throw new Error(event.error || "Chat stream error")
        }
      }
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setLoading(true)

    // Optimistic update - add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      project_id: projectId,
      role: "user",
      content: userMessage,
      metadata: null,
      created_at: new Date().toISOString(),
    }
    const assistantTempMsg: Message = {
      id: `assistant-temp-${Date.now()}`,
      project_id: projectId,
      role: "assistant",
      content: "",
      metadata: {
        source: "openrouter",
        model: "pending",
      },
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempUserMsg, assistantTempMsg])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: userMessage,
          stream: true,
        }),
      })

      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/x-ndjson")) {
        if (!response.ok && response.status !== 200) {
          const errorText = await response.text()
          throw new Error(errorText || "Failed to send message")
        }
        await parseChatStream(response, tempUserMsg.id, assistantTempMsg.id)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message")
      }

      if (data.userMessage && data.assistantMessage) {
        setMessages((prev) =>
          prev
            .filter((message) => message.id !== tempUserMsg.id)
            .filter((message) => message.id !== assistantTempMsg.id)
            .concat([data.userMessage, data.assistantMessage])
        )
        return
      }

      if (data.messages) {
        setMessages(dedupeMessages([...(data.messages as Message[])]) )
      } else {
        throw new Error("No message data returned")
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) =>
        prev.filter((message) => message.id !== tempUserMsg.id && message.id !== assistantTempMsg.id).concat([
          {
            id: `error-${Date.now()}`,
            project_id: projectId,
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            metadata: null,
            created_at: new Date().toISOString(),
          },
        ])
      )
    } finally {
      setLoading(false)
    }
  }

  const dedupeMessages = (items: Message[]) => {
    const seen = new Set<string>()
    const deduped: Message[] = []

    for (const message of items) {
      if (seen.has(message.id)) continue
      seen.add(message.id)
      deduped.push(message)
    }

    return deduped
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {canLoadMore && (
          <div className="px-4 pt-2">
            <button
              onClick={loadMoreMessages}
              className="mx-auto block rounded-lg border border-surface-strong bg-surface-ink-soft px-3 py-1.5 text-xs text-foreground hover:bg-surface-mid transition-colors"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 group",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role !== "user" && (
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[var(--color-accent-primary-soft)] to-[#7c3aed]/20 border border-[var(--color-accent-primary)] flex items-center justify-center shrink-0 mt-1">
                <Bot className={uiStylePresets.chatBrandIcon} />
              </div>
            )}

            <div
              className={cn(
                "rounded-2xl px-4 py-3 max-w-[80%] relative",
                message.role === "user"
                  ? "bg-gradient-to-r from-[var(--color-text-accent)] to-[#7c3aed] text-white shadow-[0_0_15px_var(--color-accent-primary)]"
                  : "bg-[var(--color-surface-ink-soft)] backdrop-blur-sm border border-surface-mid"
              )}
            >
              {message.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-[var(--color-text-accent)] [&_code]:text-[var(--color-text-accent)] [&_code]:bg-[var(--color-accent-primary-whisper)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Copy button */}
              <button
                onClick={() => handleCopy(message.content, message.id)}
                className={cn(
                  "absolute -bottom-3 right-2 p-1.5 rounded-lg bg-[var(--color-surface-ink-strong)] border border-surface-strong opacity-0 group-hover:opacity-100 transition-all duration-200 hover:border-[var(--color-accent-primary-mid)]",
                  message.role === "user" && "hidden"
                )}
              >
                {copiedId === message.id ? (
                  <Check className="h-3 w-3 text-[#34d399]" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>

            {message.role === "user" && (
              <div className="h-8 w-8 rounded-xl bg-surface-mid border border-surface-strong flex items-center justify-center shrink-0 mt-1">
                <User className="ui-icon-16 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && visibleMessages.length > 0 && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[var(--color-accent-primary-soft)] to-[#7c3aed]/20 border border-[var(--color-accent-primary)] flex items-center justify-center shrink-0">
                <Bot className={uiStylePresets.chatBrandIcon} />
            </div>
            <div className="bg-[var(--color-surface-ink-soft)] border border-surface-mid rounded-2xl px-4 py-3">
              <div className="ui-row-gap-2">
                <Spinner size="sm" />
                <span className="ui-text-sm-muted">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-surface-mid pt-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your business idea or ask a question..."
              className="w-full rounded-2xl border border-surface-strong bg-surface-soft px-4 py-3 pr-12 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary-light)] focus-visible:ring-offset-0 focus-visible:border-[var(--color-accent-primary-mid)] placeholder:text-text-secondary min-h-[48px] max-h-[200px] transition-all duration-200"
              rows={1}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-12 w-12 rounded-2xl shrink-0"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <Send className="ui-icon-16" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {credits >= 999999 ? "Unlimited credits" : `${credits} credits remaining`} | Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

function dedupeMessages(messages: Message[]) {
  const seen = new Set<string>()
  const deduped: Message[] = []
  for (const message of messages) {
    if (seen.has(message.id)) continue
    seen.add(message.id)
    deduped.push(message)
  }
  return deduped
}
