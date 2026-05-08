"use client"

import { useMemo, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { setCreativeStatusAction } from "@/lib/trip-media/server-actions"
import { StatusPill } from "@/components/trip-media/Surface"
import { PromptDialog } from "@/components/trip-media/PromptDialog"
import type { CreativeRow, CreativeStatus, CreativeStatusCounts } from "@/lib/trip-media/creatives"
import type { RejectionReason } from "@/lib/trip-media/policy-constants"

const STATUS_TABS: Array<{ value: CreativeStatus; label: string }> = [
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "rejected", label: "Rejected" },
  { value: "flagged", label: "Flagged" },
  { value: "suspended", label: "Suspended" },
  { value: "draft", label: "Drafts" },
]

const statusTone = (status: CreativeStatus) => {
  if (status === "approved") return "success"
  if (status === "rejected" || status === "suspended") return "danger"
  if (status === "changes_requested" || status === "flagged" || status === "pending_review") return "warning"
  return "muted"
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

const rejectSchema = z.object({
  reasonSlug: z.string().min(1, "Pick a reason."),
  reason: z
    .string()
    .min(8, "Add a short note. The advertiser sees this.")
    .max(600, "Keep it under 600 characters."),
})
type RejectValues = z.infer<typeof rejectSchema>

const noteSchema = z.object({
  reason: z
    .string()
    .min(8, "Add a short note for the advertiser.")
    .max(600, "Keep it under 600 characters."),
})
type NoteValues = z.infer<typeof noteSchema>

export function CreativesQueue({
  creatives,
  selectedStatus,
  counts,
  rejectionReasons,
}: {
  creatives: Array<CreativeRow>
  selectedStatus: CreativeStatus
  counts: CreativeStatusCounts
  rejectionReasons: Array<RejectionReason>
}) {
  const [activeId, setActiveId] = useState<string | null>(creatives[0]?.id ?? null)
  const active = useMemo(
    () => creatives.find((c) => c.id === activeId) ?? creatives[0] ?? null,
    [creatives, activeId],
  )

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === selectedStatus
          return (
            <a
              key={tab.value}
              href={`/creatives?status=${tab.value}`}
              className={[
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-[var(--brand-red)] bg-[var(--brand-red)]/5"
                  : "border-token surface-1 hover:border-[var(--brand-red)]",
              ].join(" ")}
            >
              <span>{tab.label}</span>
              <span className="rounded-full border border-token bg-[color:var(--surface-2)] px-2 text-[11px] muted">
                {counts[tab.value] ?? 0}
              </span>
            </a>
          )
        })}
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(0,1.1fr)]">
        <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
          <div className="max-h-[70vh] divide-y divide-[color:var(--border)] overflow-y-auto">
            {creatives.length === 0 ? (
              <div className="p-8 text-center text-sm muted">
                Nothing here right now. Switch tabs or come back later.
              </div>
            ) : null}
            {creatives.map((c) => {
              const isActive = c.id === active?.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={[
                    "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition",
                    isActive ? "bg-[var(--brand-red)]/5" : "hover:bg-black/5",
                  ].join(" ")}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.title}</div>
                    <div className="mt-1 truncate text-xs muted">
                      {c.partnerName ?? "—"} • {formatDate(c.createdAt)}
                    </div>
                  </div>
                  <StatusPill tone={statusTone(c.status)}>{c.status.replace(/_/g, " ")}</StatusPill>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          {active ? (
            <CreativeReviewPanel creative={active} rejectionReasons={rejectionReasons} />
          ) : (
            <div className="rounded-2xl border border-dashed border-token p-10 text-center text-sm muted">
              Pick a creative to see the preview and review controls.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CreativeReviewPanel({
  creative,
  rejectionReasons,
}: {
  creative: CreativeRow
  rejectionReasons: Array<RejectionReason>
}) {
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [promptKind, setPromptKind] = useState<null | "flag" | "suspend">(null)

  const runAction = (
    label: string,
    payload: Parameters<typeof setCreativeStatusAction>[0],
    onDone?: () => void,
  ) => {
    setPendingAction(label)
    startTransition(async () => {
      const result = await setCreativeStatusAction(payload)
      setPendingAction(null)
      if (result.ok) {
        toast.success(`${label} • ${creative.title}`)
        onDone?.()
      } else {
        toast.error(result.error ?? "Action failed. Try again.")
      }
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-2 border-b border-token p-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold tracking-tight">{creative.title}</div>
          <div className="text-xs muted">
            {creative.partnerName ?? "—"} • {creative.partnerId ?? ""}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] muted">
            <StatusPill tone={statusTone(creative.status)}>{creative.status.replace(/_/g, " ")}</StatusPill>
            {creative.category ? <StatusPill tone="muted">{creative.category}</StatusPill> : null}
            {creative.durationSeconds ? <StatusPill tone="muted">{creative.durationSeconds}s</StatusPill> : null}
            {creative.mimeType ? <StatusPill tone="muted">{creative.mimeType}</StatusPill> : null}
          </div>
        </div>
        <div className="text-right text-xs muted">
          <div>Submitted {formatDate(creative.createdAt)}</div>
          {creative.reviewedAt ? <div>Last reviewed {formatDate(creative.reviewedAt)}</div> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-token bg-black/30">
          {creative.signedPreviewUrl && creative.mimeType?.startsWith("video/") ? (
            <video
              key={creative.id}
              src={creative.signedPreviewUrl}
              controls
              playsInline
              className="aspect-video w-full bg-black"
            />
          ) : creative.signedPreviewUrl && creative.mimeType?.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creative.signedPreviewUrl} alt={creative.title} className="aspect-video w-full object-contain" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-[color:var(--surface-2)] text-sm muted">
              No preview available
            </div>
          )}
        </div>

        <div className="space-y-3">
          {creative.ctaUrl ? (
            <div className="rounded-xl border border-token bg-[color:var(--surface-2)] p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide muted">Click-through link</div>
              <a
                href={creative.ctaUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 inline-flex break-all text-sm font-medium text-[var(--brand-red)] hover:underline"
              >
                {creative.ctaUrl}
              </a>
            </div>
          ) : null}

          {creative.reviewNote ? (
            <div className="rounded-xl border border-token bg-[color:var(--surface-2)] p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide muted">Last review note</div>
              <div className="mt-1 whitespace-pre-wrap">{creative.reviewNote}</div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isPending || creative.status === "approved"}
              onClick={() =>
                runAction("Approved", { creativeId: creative.id, status: "approved", reason: "Approved" })
              }
              className="h-10 rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingAction === "Approved" ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setPromptKind("flag")}
              className="h-10 rounded-lg border border-token bg-transparent px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Flag for review
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setPromptKind("suspend")}
              className="h-10 rounded-lg border border-token bg-transparent px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suspend
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                runAction("Returned to pending", {
                  creativeId: creative.id,
                  status: "pending_review",
                  reason: "Reset to pending review",
                })
              }
              className="h-10 rounded-lg border border-token bg-transparent px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset to pending
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-token p-4 md:grid-cols-2">
        <RejectForm
          isPending={isPending}
          rejectionReasons={rejectionReasons}
          onSubmit={(values) =>
            runAction("Rejected", {
              creativeId: creative.id,
              status: "rejected",
              reason: values.reason,
              reasonSlug: values.reasonSlug,
            })
          }
        />
        <RequestChangesForm
          isPending={isPending}
          onSubmit={(values) =>
            runAction("Changes requested", {
              creativeId: creative.id,
              status: "changes_requested",
              reason: values.reason,
            })
          }
        />
      </div>

      <PromptDialog
        open={promptKind === "flag"}
        title="Flag this creative"
        description="The team will see your note. The advertiser will not."
        label="Why are you flagging it?"
        placeholder="Short reason for the moderation team"
        defaultValue={creative.reviewNote ?? ""}
        submitLabel="Flag creative"
        onClose={() => setPromptKind(null)}
        onSubmit={async (note) => {
          setPromptKind(null)
          runAction("Flagged for review", {
            creativeId: creative.id,
            status: "flagged",
            reason: note,
          })
        }}
      />
      <PromptDialog
        open={promptKind === "suspend"}
        title="Suspend this creative"
        description="Suspending pulls this creative from delivery immediately. Both the advertiser and the team will see the reason."
        label="Why are you suspending it?"
        placeholder="What policy did this creative violate?"
        defaultValue={creative.reviewNote ?? ""}
        destructive
        submitLabel="Suspend creative"
        onClose={() => setPromptKind(null)}
        onSubmit={async (note) => {
          setPromptKind(null)
          runAction("Suspended", {
            creativeId: creative.id,
            status: "suspended",
            reason: note,
          })
        }}
      />
    </div>
  )
}

function RejectForm({
  isPending,
  rejectionReasons,
  onSubmit,
}: {
  isPending: boolean
  rejectionReasons: Array<RejectionReason>
  onSubmit: (values: RejectValues) => void
}) {
  const form = useForm<RejectValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reasonSlug: rejectionReasons[0]?.slug ?? "", reason: "" },
  })

  return (
    <form
      onSubmit={form.handleSubmit((v) => {
        onSubmit(v)
        form.reset({ reasonSlug: v.reasonSlug, reason: "" })
      })}
      className="space-y-3 rounded-xl border border-token bg-[color:var(--surface-2)] p-3"
    >
      <div className="text-sm font-semibold tracking-tight">Reject this creative</div>
      <p className="text-xs muted">Pick a reason and add a short note. The advertiser sees both.</p>

      <label className="block text-xs font-semibold muted">Reason</label>
      <select
        {...form.register("reasonSlug")}
        className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm"
      >
        {rejectionReasons.map((r) => (
          <option key={r.slug} value={r.slug}>
            {r.label}
          </option>
        ))}
      </select>
      {form.formState.errors.reasonSlug ? (
        <p className="text-xs text-red-500">{form.formState.errors.reasonSlug.message}</p>
      ) : null}

      <label className="block text-xs font-semibold muted">Note to advertiser</label>
      <textarea
        {...form.register("reason")}
        className="min-h-24 w-full rounded-lg border border-token bg-transparent p-2 text-sm"
        placeholder="What needs to change?"
      />
      {form.formState.errors.reason ? (
        <p className="text-xs text-red-500">{form.formState.errors.reason.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Send rejection"}
      </button>
    </form>
  )
}

function RequestChangesForm({
  isPending,
  onSubmit,
}: {
  isPending: boolean
  onSubmit: (values: NoteValues) => void
}) {
  const form = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { reason: "" },
  })

  return (
    <form
      onSubmit={form.handleSubmit((v) => {
        onSubmit(v)
        form.reset({ reason: "" })
      })}
      className="space-y-3 rounded-xl border border-token bg-[color:var(--surface-2)] p-3"
    >
      <div className="text-sm font-semibold tracking-tight">Request changes</div>
      <p className="text-xs muted">Use this when the creative is close, but needs an edit before approval.</p>

      <label className="block text-xs font-semibold muted">What should the advertiser change?</label>
      <textarea
        {...form.register("reason")}
        className="min-h-24 w-full rounded-lg border border-token bg-transparent p-2 text-sm"
        placeholder="Describe the change needed."
      />
      {form.formState.errors.reason ? (
        <p className="text-xs text-red-500">{form.formState.errors.reason.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Send change request"}
      </button>
    </form>
  )
}
