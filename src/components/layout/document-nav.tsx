"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  PenLine,
  Search,
  FileText,
  Target,
  LayoutGrid,
  Code,
  Megaphone,
} from "lucide-react"

export type DocumentType = "prompt" | "competitive" | "prd" | "mvp" | "mockups" | "techspec" | "deploy" | "launch"

interface DocumentStatus {
  type: DocumentType
  status: "done" | "in_progress" | "pending"
}

interface DocumentNavProps {
  projectName: string
  activeDocument: DocumentType
  onDocumentSelect: (type: DocumentType) => void
  documentStatuses: DocumentStatus[]
  isNewProject?: boolean
  shouldFocusName?: boolean
  onProjectNameUpdate?: (name: string) => Promise<void> | void
}

const documents: {
  type: DocumentType
  label: string
  description: string
  icon: React.ElementType
}[] = [
  { type: "prompt", label: "Explain the idea", description: "", icon: PenLine },
  { type: "competitive", label: "Competitive Research", description: "", icon: Search },
  { type: "prd", label: "PRD", description: "", icon: FileText },
  { type: "mvp", label: "MVP Plan", description: "", icon: Target },
  { type: "mockups", label: "Mockups", description: "", icon: LayoutGrid },
  { type: "techspec", label: "Tech Spec", description: "", icon: Code },
  { type: "launch", label: "Marketing", description: "", icon: Megaphone },
]

function StatusBadge({ status }: { status: "done" | "in_progress" | "pending" }) {
  const statusConfig = {
    done: { label: "Done", className: "status-done" },
    in_progress: { label: "In Progress", className: "status-in-progress" },
    pending: { label: "Pending", className: "status-pending" },
  }

  const config = statusConfig[status]

  return (
    <span className={cn("text-[9px] font-medium font-mono px-2 py-0.5 rounded-sm", config.className)}>
      {config.label}
    </span>
  )
}

export function DocumentNav({
  projectName,
  activeDocument,
  onDocumentSelect,
  documentStatuses,
  isNewProject = false,
  shouldFocusName = false,
  onProjectNameUpdate,
}: DocumentNavProps) {
  const [isEditingProjectName, setIsEditingProjectName] = useState(shouldFocusName)
  const [projectNameDraft, setProjectNameDraft] = useState(projectName)
  const projectNameInputRef = useRef<HTMLInputElement>(null)

  const getStatus = (type: DocumentType): "done" | "in_progress" | "pending" => {
    const docStatus = documentStatuses.find(d => d.type === type)
    return docStatus?.status || "pending"
  }

  const canSelectDocument = (type: DocumentType) => {
    return !(isNewProject && type !== "prompt")
  }

  useEffect(() => {
    setProjectNameDraft(projectName)
  }, [projectName])

  useEffect(() => {
    if (shouldFocusName) {
      setIsEditingProjectName(true)
    }
  }, [shouldFocusName])

  useEffect(() => {
    if (isEditingProjectName) {
      projectNameInputRef.current?.focus()
      projectNameInputRef.current?.setSelectionRange(projectNameDraft.length, projectNameDraft.length)
    }
  }, [isEditingProjectName, projectNameDraft.length])

  const saveProjectName = async () => {
    const trimmedName = projectNameDraft.trim() || "Untitled"
    setProjectNameDraft(trimmedName)
    setIsEditingProjectName(false)

    try {
      if (onProjectNameUpdate) {
        await onProjectNameUpdate(trimmedName)
      }
    } catch (error) {
      console.error("Failed to update project name:", error)
      setProjectNameDraft(projectName)
      setIsEditingProjectName(true)
    }
  }

  const cancelProjectNameEdit = () => {
    setProjectNameDraft(projectName)
    setIsEditingProjectName(false)
  }

  return (
    <div className="flex h-full w-[280px] flex-col bg-card border-r border-border">
      {/* Project label */}
      <div className="px-6 pt-6 pb-3">
        {isEditingProjectName ? (
          <input
            ref={projectNameInputRef}
            value={projectNameDraft}
            onChange={(e) => setProjectNameDraft(e.target.value)}
            onBlur={saveProjectName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                saveProjectName()
              }

              if (event.key === "Escape") {
                event.preventDefault()
                cancelProjectNameEdit()
              }
            }}
            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm font-semibold leading-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingProjectName(true)}
            className="text-sm font-semibold text-foreground leading-tight truncate text-left hover:text-primary transition-colors"
            aria-label="Rename project"
          >
            {projectName}
          </button>
        )}
      </div>

      {/* Section Label */}
      <div className="px-6 pt-6 pb-3">
        <p className="text-[10px] font-medium tracking-[1px] font-mono text-muted-foreground">
          DOCUMENTS
        </p>
      </div>

      {/* Document List */}
      <nav className="flex-1 overflow-y-auto">
        {documents.map((doc, index) => {
          const isActive = activeDocument === doc.type
          const status = getStatus(doc.type)
          const isLast = index === documents.length - 1

          return (
            <button
              key={doc.type}
              onClick={() => onDocumentSelect(doc.type)}
              disabled={!canSelectDocument(doc.type)}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors",
                !canSelectDocument(doc.type)
                  ? "cursor-not-allowed opacity-50"
                  : "",
                isActive
                  ? "bg-background border-l-[3px] border-l-primary"
                  : "border-b border-border hover:bg-muted/50",
                isLast && !isActive && "border-b-0"
              )}
            >
              <doc.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-[13px] truncate",
                    isActive ? "font-semibold text-foreground" : "font-medium text-foreground"
                  )}
                >
                  {doc.label}
                </p>
                {doc.description && isActive && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {doc.description}
                  </p>
                )}
              </div>
              {doc.type !== "prompt" && <StatusBadge status={status} />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
