"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Trash2 } from "lucide-react"
import type { MouseEvent } from "react"

interface DashboardProjectCardProps {
  id: string
  name: string
  description: string | null
  href: string
  showDelete?: boolean
}

export function DashboardProjectCard({
  id,
  name,
  description,
  href,
  showDelete = false,
}: DashboardProjectCardProps) {
  const router = useRouter()
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeletePrompt = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isDeleting) return

    setShowDeleteConfirmation(true)
  }

  const handleDelete = async () => {
    if (isDeleting) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE" })

      if (!response.ok) {
        let message = "Unable to delete project"
        try {
          const result = await response.json()
          if (result?.error) message = result.error
        } catch {
          // Ignore parse errors
        }
        throw new Error(message)
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete project")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="group relative">
      {/* TODO: keep #FF3B30 local as the destructive action color for delete confirmation actions. */}
      <Link
        href={href}
        className="block rounded-2xl border border-border-subtle bg-[#1A1A1A] p-5 transition hover:bg-[#1f1f1f] min-h-[176px] max-h-[176px]"
      >
        <div className="space-y-4">
          <h2 className="text-[18px] leading-tight font-bold tracking-[-0.4px] text-white line-clamp-1">
            {name}
          </h2>
          <p className="ui-font-mono text-[12px] leading-[1.5] text-text-muted line-clamp-2 overflow-hidden min-h-[36px]">
            {description || "No prompt captured yet."}
          </p>
          <div className="h-2" />
          <p className="inline-ui-row-gap-2 text-sm ui-font-medium text-white">
            Open project <ArrowRight className="ui-icon-16" />
          </p>
        </div>
      </Link>

      {showDelete && (
        <button
          type="button"
          onClick={handleDeletePrompt}
          disabled={isDeleting}
          aria-label={`Delete ${name}`}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FF3B30]/90 text-white opacity-100 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
        >
          <Trash2 className="ui-icon-16" />
        </button>
      )}

      {showDeleteConfirmation && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setShowDeleteConfirmation(false)}
            >
          <div
            className="w-full max-w-[560px] rounded-xl border border-border-strong bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[28px] leading-[1.1] font-bold tracking-[-1px] text-text-primary">
              Delete project?
            </h3>
            <p className="mt-4 text-[14px] leading-[1.5] text-text-secondary">
              You are about to permanently delete "{name}". This action removes all
              environments, deployment history, and collaborator access. This cannot be
              undone.
            </p>
            <p className="mt-4 text-[12px] leading-[1.5] ui-font-semibold text-[#FF3B30]">
              Warning: deleting this project is permanent.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={isDeleting}
                className="h-11 rounded-md border border-border-strong bg-white px-5 text-[13px] ui-font-semibold text-text-primary disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  handleDelete()
                }}
                disabled={isDeleting}
                className="h-11 rounded-md bg-[#FF3B30] px-5 text-[13px] ui-font-semibold text-white disabled:opacity-40"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
