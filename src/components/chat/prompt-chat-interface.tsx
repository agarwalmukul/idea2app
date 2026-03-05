"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Bot, User, Copy, Check, ChevronDown, Sparkles, ArrowUp } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/prompt-chat-config"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  created_at: string
  metadata?: {
    model?: string
    stage?: "questions" | "gathering" | "summary"
  }
}

interface PromptChatInterfaceProps {
  projectId: string
  projectName: string
  initialIdea: string
  onIdeaSummary?: (summary: string) => void
}

type StreamEvent =
  | { type: "start"; userMessage: Message }
  | { type: "token"; content: string }
  | { type: "done"; userMessage: Message; assistantMessage: Message; stage: "refining" | "summarized"; summary: string | null }
  | { type: "error"; error: string }

const PAGE_SIZE = 40

export function PromptChatInterface({
  projectId,
  projectName,
  initialIdea,
  onIdeaSummary,
}: PromptChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [conversationStage, setConversationStage] = useState<"initial" | "refining" | "summarized">("initial")
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [earliestCursor, setEarliestCursor] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)
  const requestInFlight = useRef(false)

  const dedupeMessages = useCallback((messageList: Message[]) => {
    if (!messageList.length) return []

    const deduped: Message[] = []
    const lastSeen = new Map<string, number>()

    for (const message of messageList) {
      const key = `${message.role}:${message.content.trim()}`
      const currentTime = message.created_at
        ? new Date(message.created_at).getTime()
        : Date.now()
      const lastTime = lastSeen.get(key)
      const isDuplicate = typeof lastTime === "number" && Math.abs(currentTime - lastTime) <= 5000

      if (!isDuplicate) {
        deduped.push(message)
      }

      if (Number.isFinite(currentTime)) {
        lastSeen.set(key, currentTime)
      }
    }

    return deduped
  }, [])

  // Prevent hydration mismatch with Radix UI dropdowns
  useEffect(() => {
    setMounted(true)
  }, [])

  const loadMessages = useCallback(async (options?: { before?: string | null }) => {
    const before = options?.before
    const params = new URLSearchParams({
      projectId,
      limit: String(PAGE_SIZE),
    })
    if (before) {
      params.set("before", before)
    }

    const response = await fetch(`/api/prompt-chat?${params.toString()}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to load messages" }))
      throw new Error(errorData.error || "Failed to load messages")
    }

    const data = await response.json()
    const pageMessages = dedupeMessages(data.messages || [])

    return { pageMessages, hasMore: Boolean(data.hasMore), stage: data.stage || "initial" }
  }, [projectId, dedupeMessages])

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [input])

  // Load existing messages and start conversation if needed
  useEffect(() => {
    const loadInitialMessages = async () => {
      setMessagesLoading(true)
      try {
        const result = await loadMessages()

        setMessages(result.pageMessages)
        setHasMoreMessages(result.hasMore)
        setEarliestCursor(result.pageMessages[0]?.created_at || null)
        setConversationStage(result.stage)

        if (result.pageMessages.length === 0 && initialIdea && isFirstLoad) {
          setIsFirstLoad(false)
          await startConversation()
        }
      } catch (error) {
        console.error("Error loading messages:", error)
      } finally {
        setMessagesLoading(false)
      }
    }

    if (projectId) {
      loadInitialMessages()
    }
  }, [projectId, initialIdea, isFirstLoad, loadMessages])

  const startConversation = useCallback(async (overrideIdea?: string) => {
    if (requestInFlight.current) return

    const ideaToUse = overrideIdea || initialIdea
    if (!ideaToUse.trim()) return

    requestInFlight.current = true
    setLoading(true)
    try {
      const response = await fetch("/api/prompt-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: ideaToUse,
          model: selectedModel,
          isInitial: true,
          stream: true,
        }),
      })

      if (response.headers.get("content-type")?.includes("application/x-ndjson")) {
        const tempUserMsg: Message = {
          id: `temp-${Date.now()}`,
          role: "user",
          content: ideaToUse,
          created_at: new Date().toISOString(),
        }
        const assistantTempMsg: Message = {
          id: `assistant-temp-${Date.now()}`,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, tempUserMsg, assistantTempMsg])
        await parseStreamResponse(response, tempUserMsg.id, assistantTempMsg.id)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start conversation")
      }

      if (data.userMessage && data.assistantMessage) {
        setMessages(dedupeMessages([
          data.userMessage as Message,
          data.assistantMessage as Message,
        ]))
      } else if (Array.isArray(data.messages)) {
        setMessages(dedupeMessages(data.messages))
      }

      setConversationStage(data.stage || conversationStage)
    } catch (error) {
      console.error("Chat error:", error)
      alert(error instanceof Error ? error.message : "An error occurred")
    } finally {
      requestInFlight.current = false
      setLoading(false)
    }
  }, [conversationStage, initialIdea, loadMessages, projectId, selectedModel])

  const loadOlderMessages = async () => {
    if (!hasMoreMessages || !earliestCursor || isLoadingOlder || loading) return

    const container = messagesContainerRef.current
    const previousHeight = container?.scrollHeight || 0
    const previousTop = container?.scrollTop || 0

    try {
      setMessagesLoading(true)
      setIsLoadingOlder(true)
      const result = await loadMessages({ before: earliestCursor })
      setMessages((prev) => dedupeMessages([...result.pageMessages, ...prev]))
      setHasMoreMessages(result.hasMore)
      setEarliestCursor(result.pageMessages[0]?.created_at || earliestCursor)
      requestAnimationFrame(() => {
        if (!container) return
        const delta = container.scrollHeight - previousHeight
        container.scrollTop = previousTop + Math.max(delta, 0)
      })
    } catch (error) {
      console.error("Error loading older messages:", error)
    } finally {
      setMessagesLoading(false)
      setIsLoadingOlder(false)
    }
  }

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const parseStreamResponse = async (
    response: Response,
    tempUserMessageId: string,
    tempAssistantMessageId: string
  ) => {
    if (!response.body) {
      throw new Error("Stream response had no body")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    const appendToken = (token: string) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === tempAssistantMessageId
            ? { ...message, content: `${message.content}${token}` }
            : message
        )
      )
    }

    const finalizeMessages = (
      userMessage: Message,
      assistantMessage: Message,
      stage: "refining" | "summarized",
      summary: string | null
    ) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id === tempUserMessageId) return userMessage
          if (message.id === tempAssistantMessageId) return assistantMessage
          return message
        })
      )
      setConversationStage(stage)
      if (summary && onIdeaSummary) onIdeaSummary(summary)
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
              message.id === tempUserMessageId ? event.userMessage : message
            )
          )
        } else if (event.type === "token") {
          appendToken(event.content)
        } else if (event.type === "done") {
          finalizeMessages(
            event.userMessage,
            event.assistantMessage,
            event.stage,
            event.summary
          )
          return
        } else if (event.type === "error") {
          throw new Error(event.error || "Failed to process response")
        }
      }
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading || requestInFlight.current) return

    requestInFlight.current = true

    const userMessage = input.trim()
    setInput("")
    setLoading(true)

    // Optimistic update - add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    const tempAssistantMsg: Message = {
      id: `assistant-temp-${Date.now()}`,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => dedupeMessages([...prev, tempUserMsg, tempAssistantMsg]))

    try {
      const response = await fetch("/api/prompt-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: userMessage,
          model: selectedModel,
          isInitial: false,
          stream: true,
        }),
      })

      if (response.headers.get("content-type")?.includes("application/x-ndjson")) {
        if (!response.ok && response.status !== 200) {
          const errorText = await response.text()
          throw new Error(errorText || "Failed to send message")
        }
        await parseStreamResponse(response, tempUserMsg.id, tempAssistantMsg.id)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message")
      }

      if (data.userMessage && data.assistantMessage) {
        setMessages((prev) =>
          dedupeMessages(
            prev
              .filter((message) => message.id !== tempUserMsg.id)
              .filter((message) => message.id !== tempAssistantMsg.id)
              .concat(data.userMessage as Message, data.assistantMessage as Message)
          )
        )
      } else if (data.messages) {
        setMessages((prev) =>
          dedupeMessages(prev.concat(data.messages))
        )
      }

      setConversationStage(data.stage || conversationStage)

      // If we got a summary, notify parent
      if (data.stage === "summarized" && data.summary && onIdeaSummary) {
        onIdeaSummary(data.summary)
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempUserMsg.id && m.id !== tempAssistantMsg.id).concat({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          created_at: new Date().toISOString(),
        })
      )
      alert(error instanceof Error ? error.message : "An error occurred")
    } finally {
      requestInFlight.current = false
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel)
  const currentModelName = currentModel?.name || selectedModel

  // Get short model name for the pill
  const getShortModelName = (name: string) => {
    if (name.includes("Claude")) return name.replace("Claude ", "")
    if (name.includes("GPT-4")) return name.replace("GPT-", "")
    if (name.includes("Gemini")) return name.split(" ")[1] || name
    if (name.includes("Llama")) return "Llama 3.3"
    if (name.includes("DeepSeek")) return "DeepSeek"
    return name
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm ui-font-semibold text-foreground/80 tracking-wide">
                {projectName}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => messagesContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                  className="text-xs text-muted-foreground hover:text-foreground ui-row-gap-2"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                {mounted && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs ui-font-semibold hover:bg-muted/50">
                        {isFocused ? <Sparkles className="h-3 w-3 text-primary/70" /> : <Sparkles className="h-3 w-3 text-primary/70" />}
                        <span>{getShortModelName(currentModelName)}</span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          onPointerDown={() => setIsFocused(false)}
                        >
                          <span>{model.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 border border-primary/10 shadow-lg shadow-primary/5">
                <Bot className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2 tracking-tight">
                Welcome to {projectName}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                Start by sharing your idea. I&apos;ll ask focused questions to refine it, then help you move from concept to research and PRD-ready planning.
              </p>
              {initialIdea && (
                <div className="w-full max-w-xl bg-card border border-border/50 rounded-2xl p-5 mb-8 shadow-sm">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-widest">Your Initial Idea</p>
                  <p className="text-sm text-foreground leading-relaxed">{initialIdea}</p>
                </div>
              )}
            </div>
          )}

          {hasMoreMessages && (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={loadOlderMessages}
                disabled={isLoadingOlder}
                className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs ui-font-medium text-foreground/80 hover:bg-muted/50 disabled:opacity-60"
              >
                {isLoadingOlder ? "Loading..." : "Load earlier messages"}
              </button>
            </div>
          )}

          {messagesLoading && messages.length === 0 && (
            <div className="flex justify-center py-2">
              <Spinner size="sm" />
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 mb-6 group animate-fade-up",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 border border-primary/10 shadow-sm">
                  <Bot className="h-4 w-4 text-primary/70" />
                </div>
              )}

              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[85%] relative",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card border border-border/50 shadow-sm"
                )}
              >
                {message.role === "user" ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:text-foreground [&_p]:leading-relaxed [&_li]:text-foreground [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_code]:text-primary [&_code]:bg-primary/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_ol]:text-foreground [&_ul]:text-foreground [&_ol]:my-2 [&_ul]:my-2 [&_li]:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Copy button for assistant messages */}
                {message.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(message.content, message.id)}
                    className={cn(
                      "absolute -bottom-3 right-2 p-1.5 rounded-lg bg-background/90 border border-border/40 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:border-primary/50"
                    )}
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3 w-3 text-[#34d399]" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>

              {message.role === "user" && (
                <div className="h-8 w-8 rounded-xl bg-surface-mid border border-surface-strong flex items-center justify-center shrink-0 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {messagesLoading && messages.length > 0 && (
            <div className="flex gap-3 justify-start mb-4">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mt-0.5">
                <Bot className="h-4 w-4 text-primary/70" />
              </div>
              <div className="rounded-2xl px-4 py-3 border border-border/50 bg-card">
                <div className="ui-row-gap-2">
                  <Spinner size="sm" />
                  <span className="text-sm ui-text-muted">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border/70 p-4 bg-card/40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3" ref={composerRef}>
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Type your business idea update or question..."
                className="w-full rounded-2xl border border-surface-strong bg-background px-4 py-3 pr-12 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary-light)] focus-visible:ring-offset-0 focus-visible:border-[var(--color-accent-primary-mid)] placeholder:text-text-secondary min-h-[48px] max-h-[160px]"
                rows={1}
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim() || requestInFlight.current}
              className={cn(
                "h-12 w-12 rounded-2xl shrink-0 ui-row-gap-2 bg-primary text-primary-foreground transition-colors",
                (loading || !input.trim() || requestInFlight.current) && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? <Spinner size="sm" /> : <Sparkles className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
