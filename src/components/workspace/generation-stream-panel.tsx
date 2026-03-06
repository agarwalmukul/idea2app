"use client"

import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import type { StreamStage } from "@/lib/parse-document-stream"

interface GenerationStreamPanelProps {
  documentTitle: string
  stages: StreamStage[]
  currentStep: number  // 0 = not started, 1+ = that step is active
  streamContent: string
  projectId: string
}

export function GenerationStreamPanel({
  documentTitle,
  stages,
  currentStep,
  streamContent,
  projectId,
}: GenerationStreamPanelProps) {
  return (
    <div className="flex flex-col gap-6 py-8 px-4">
      {/* Stage progress */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground mb-3">
          Generating {documentTitle}...
        </p>
        {stages.length > 0 && Array.from(
          { length: stages[stages.length - 1].totalSteps },
          (_, i) => i + 1
        ).map((stepNum) => {
          const knownStage = stages.find(s => s.step === stepNum)
          const isDone = stepNum < currentStep
          const isActive = stepNum === currentStep
          return (
            <div key={stepNum} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span
                className={
                  isDone
                    ? "text-sm text-muted-foreground line-through"
                    : isActive
                    ? "text-sm font-medium text-foreground"
                    : "text-sm text-muted-foreground/50"
                }
              >
                {knownStage?.message ?? "..."}
              </span>
            </div>
          )
        })}
      </div>

      {/* Live streaming content */}
      {streamContent && (
        <>
          <div className="border-t border-border" />
          <MarkdownRenderer
            content={streamContent}
            projectId={projectId}
            enableInlineEditing={false}
          />
        </>
      )}

      {/* Waiting state before first token arrives */}
      {!streamContent && currentStep > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Waiting for content...</span>
        </div>
      )}
    </div>
  )
}
