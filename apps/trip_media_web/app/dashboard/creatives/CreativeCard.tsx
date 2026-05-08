"use client"

import { useEffect, useState, useTransition } from "react"
import { Eye, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteCreative, getCreativeSignedUrl, submitCreativeForReview } from "./actions"

interface CreativeCardProps {
  creative: {
    id: string
    title: string
    mime_type: string | null
    status: string
    duration_seconds: number | null
    created_at: string
    review_note: string | null
    storage_path: string | null
    linked_campaigns: number
  }
  canManage: boolean
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "In review",
  approved: "Approved",
  rejected: "Needs changes",
}

const STATUS_PALETTE: Record<string, string> = {
  draft: "border-slate-300/40 bg-slate-300/10 text-slate-100",
  pending_review: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  approved: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  rejected: "border-red-300/40 bg-red-500/10 text-red-100",
}

export function CreativeCard({ creative, canManage }: CreativeCardProps) {
  const [pending, startTransition] = useTransition()
  const [previewing, setPreviewing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const isVideo = creative.mime_type?.startsWith("video/")

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await submitCreativeForReview({ creativeId: creative.id })
      if (!result.success) {
        toast.error(result.message || "Could not submit.")
        return
      }
      toast.success("Submitted for review")
    })
  }

  const handleDelete = () => {
    if (!confirm("Delete this creative? This cannot be undone.")) return
    startTransition(async () => {
      const result = await deleteCreative({ creativeId: creative.id })
      if (!result.success) {
        toast.error(result.message || "Could not delete.")
        return
      }
      toast.success("Creative deleted")
    })
  }

  const handlePreview = async () => {
    setPreviewing(true)
    if (previewUrl) return
    setPreviewLoading(true)
    const result = await getCreativeSignedUrl({ creativeId: creative.id })
    setPreviewLoading(false)
    if (!result.success || !result.signedUrl) {
      toast.error(result.message || "Could not load preview.")
      setPreviewing(false)
      return
    }
    setPreviewUrl(result.signedUrl)
  }

  useEffect(() => {
    if (!previewing) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewing(false)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [previewing])

  return (
    <article className="panel rounded-2xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
              STATUS_PALETTE[creative.status] ?? "border-[var(--border)] bg-white/4 text-white"
            }`}
          >
            {STATUS_LABEL[creative.status] ?? creative.status}
          </span>
          <h3 className="mt-3 text-lg font-black tracking-[-0.02em]">{creative.title}</h3>
          <p className="mt-1 text-xs muted">
            {creative.mime_type ?? "unknown"}
            {creative.duration_seconds ? ` · ${creative.duration_seconds}s` : ""} · uploaded{" "}
            {new Date(creative.created_at).toLocaleDateString()}
          </p>
          <p className="mt-1 text-xs muted">
            {creative.linked_campaigns > 0
              ? `Linked to ${creative.linked_campaigns} campaign${creative.linked_campaigns === 1 ? "" : "s"}`
              : "Not linked to any campaigns yet"}
          </p>
          {creative.review_note ? (
            <p className="mt-3 rounded-xl border border-red-300/40 bg-red-500/10 p-3 text-xs text-red-100">
              {creative.review_note}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {creative.storage_path ? (
            <button
              type="button"
              onClick={handlePreview}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/8 px-3 py-1.5 text-xs font-bold"
            >
              <Eye className="size-3.5" aria-hidden /> Preview
            </button>
          ) : null}
          {canManage && creative.status === "draft" ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="focus-ring rounded-full bg-[var(--brand-red)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              Submit for review
            </button>
          ) : null}
          {canManage && creative.status !== "approved" ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-100 disabled:opacity-60"
            >
              <Trash2 className="size-3.5" aria-hidden /> Delete
            </button>
          ) : null}
        </div>
      </div>

      {previewing ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setPreviewing(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur" />
          <div
            className="panel relative z-10 w-full max-w-2xl rounded-3xl p-4"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">{creative.title}</p>
              <button
                type="button"
                onClick={() => setPreviewing(false)}
                className="focus-ring rounded-lg border border-[var(--border)] bg-white/5 px-3 py-1 text-xs"
              >
                Close
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl bg-black/40 p-2">
              {previewLoading || !previewUrl ? (
                <p className="text-center text-sm muted">Loading preview...</p>
              ) : isVideo ? (
                <video src={previewUrl} controls className="h-auto w-full rounded-xl" />
              ) : (
                <img src={previewUrl} alt={creative.title} className="h-auto w-full rounded-xl" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}
