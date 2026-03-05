"use client"

import React, { useState, useRef, useEffect } from "react"
import { Sparkles, Check, X, Loader2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Popular OpenRouter models for document editing
const AVAILABLE_MODELS = [
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", provider: "Google" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", provider: "Meta" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", provider: "DeepSeek" },
]

type ModelId = typeof AVAILABLE_MODELS[number]["id"]

interface InlineAiEditorProps {
  selectedText: string
  fullContent: string
  onApply: (newText: string) => void
  onCancel: () => void
  onSuggestionReady?: (suggestedText: string) => void
  position: { top: number; left: number }
  projectId: string
}

export function InlineAiEditor({
  selectedText,
  fullContent,
  onApply,
  onCancel,
  onSuggestionReady,
  position,
  projectId,
}: InlineAiEditorProps) {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedEdit, setSuggestedEdit] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelId>(AVAILABLE_MODELS[0].id)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-focus input when mounted
    inputRef.current?.focus()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/document-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fullContent,
          selectedText,
          editPrompt: prompt,
          model: selectedModel,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate edit")
      }

      setSuggestedEdit(data.suggestedEdit)
      // Notify parent that suggestion is ready for inline display
      onSuggestionReady?.(data.suggestedEdit)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = () => {
    if (suggestedEdit) {
      onApply(suggestedEdit)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel()
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/5 backdrop-blur-[1px] z-40 animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Editor popup */}
      <div
        ref={containerRef}
        className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{
          top: `clamp(20px, ${position.top}px, calc(100vh - 500px))`,
          left: `clamp(260px, ${position.left}px, calc(100vw - 260px))`,
          transform: "translateX(-50%)",
        }}
      >
        <div className="w-[480px] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
          {/* Header with selected text preview */}
          <div className="ui-px-4 ui-py-3 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Sparkles className="ui-icon-16 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 ui-font-medium mb-1">
                  Selected Text
                </p>
                <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed ui-font-mono">
                  {selectedText}
                </p>
              </div>
            </div>
          </div>

          {/* Input form - show if no suggestion yet */}
          {!suggestedEdit ? (
            <form onSubmit={handleSubmit} className="ui-p-4">
              {/* Model selector */}
              <div className="mb-3" ref={dropdownRef}>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="ui-row-gap-2 px-2.5 ui-py-1_5 text-xs ui-font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
                  >
                    <span className="text-gray-400">Model:</span>
                    <span className="text-gray-900">
                      {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}
                    </span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-gray-400 transition-transform",
                      showModelDropdown && "rotate-180"
                    )} />
                  </button>

                  {showModelDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
                      {AVAILABLE_MODELS.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(model.id)
                            setShowModelDropdown(false)
                          }}
                          className={cn(
                            "w-full ui-px-3 ui-py-2 text-left text-xs hover:bg-gray-50 transition-colors ui-row-between",
                            selectedModel === model.id && "bg-primary/5"
                          )}
                        >
                          <span className={cn(
                            "ui-font-medium",
                            selectedModel === model.id ? "text-primary" : "text-gray-900"
                          )}>
                            {model.name}
                          </span>
                          <span className="text-gray-400 text-[10px]">{model.provider}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your edit... (⌘+Enter to submit)"
                  className="w-full min-h-[80px] ui-px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={isLoading}
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <div className="ui-row-gap-2 text-sm text-gray-600">
                      <Loader2 className="ui-icon-16 animate-spin" />
                      <span className="ui-font-medium">Generating edit...</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-3 ui-px-3 ui-py-2 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="mt-3 ui-row-between">
                <p className="text-[10px] text-gray-500 ui-font-mono">
                  ESC to cancel • ⌘+Enter to submit
                </p>
                <div className="ui-row-gap-2">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="ui-px-3 ui-py-1_5 text-xs ui-font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isLoading}
                    className={cn(
                      "ui-px-4 ui-py-1_5 text-xs ui-font-semibold rounded-md transition-all",
                      prompt.trim() && !isLoading
                        ? "bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    Generate
                  </button>
                </div>
              </div>
            </form>
          ) : (
            // Diff preview - split into scrollable content + fixed buttons
            <>
              {/* Scrollable diff content */}
              <div className="ui-p-4 overflow-y-auto max-h-[300px]">
                <div className="space-y-3">
                  {/* Before */}
                  <div className="relative">
                    <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-red-200 rounded-full" />
                    <div className="pl-3">
                      <p className="text-[9px] uppercase tracking-wider text-red-600 font-bold mb-1.5">
                        Original
                      </p>
                      <div className="ui-px-3 ui-py-2 bg-red-50/50 border border-red-100 rounded-lg">
                        <p className="text-xs text-gray-600 leading-relaxed line-through decoration-red-300 ui-font-mono whitespace-pre-wrap">
                          {selectedText}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* After */}
                  <div className="relative">
                    <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-emerald-300 rounded-full" />
                    <div className="pl-3">
                      <p className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold mb-1.5">
                        Suggested Edit
                      </p>
                      <div className="ui-px-3 ui-py-2 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                        <p className="text-xs text-gray-900 leading-relaxed ui-font-mono whitespace-pre-wrap">
                          {suggestedEdit}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed action buttons at bottom */}
              <div className="ui-px-4 ui-py-3 border-t border-gray-100 ui-row-gap-2 bg-white shrink-0">
                <button
                  onClick={onCancel}
                  className="flex-1 flex items-center justify-center gap-2 ui-px-4 py-2.5 text-sm ui-font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center gap-2 ui-px-4 py-2.5 text-sm ui-font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm hover:shadow transition-all"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply Edit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
