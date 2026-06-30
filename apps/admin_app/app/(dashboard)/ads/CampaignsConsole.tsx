"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { StatusPill } from "@/components/trip-media/Surface"
import { PromptDialog } from "@/components/trip-media/PromptDialog"
import {
  adjustCampaignDeliveryAction,
  cancelCampaignCreditPartnerAction,
  setCampaignStatusAction,
} from "@/lib/trip-media/server-actions"
import type { CampaignRow, CampaignStatus } from "@/lib/trip-media/campaigns"

const STATUS_OPTIONS: Array<{ value: CampaignStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "DRAFT", label: "Drafts" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ENDED", label: "Ended" },
  { value: "REJECTED", label: "Rejected" },
  { value: "FORCE_STOPPED", label: "Force-stopped" },
]

const tone = (status: CampaignStatus): "success" | "warning" | "danger" | "muted" | "default" => {
  if (status === "ACTIVE") return "success"
  if (status === "PAUSED" || status === "PENDING_REVIEW") return "warning"
  if (status === "FORCE_STOPPED" || status === "REJECTED") return "danger"
  return "muted"
}

const formatDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleString() : "—")
const formatCurrency = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n)

const adjustSchema = z.object({
  maxViews: z
    .union([z.number().int().nonnegative("Use a non-negative whole number."), z.null()])
    .optional(),
  rewardPerView: z
    .union([z.number().nonnegative("Use a non-negative number."), z.null()])
    .optional(),
  reason: z.string().min(8, "Add a short reason. The audit log keeps it.").max(600),
})

const stopSchema = z.object({
  reason: z.string().min(8, "Add a reason. The advertiser sees this.").max(600),
})

type AdjustValues = z.infer<typeof adjustSchema>
type StopValues = z.infer<typeof stopSchema>

export function CampaignsConsole({
  campaigns,
  selectedStatus,
  counts,
}: {
  campaigns: Array<CampaignRow>
  selectedStatus: CampaignStatus | "ALL"
  counts: Record<CampaignStatus | "ALL", number>
}) {
  const [activeId, setActiveId] = useState<string | null>(campaigns[0]?.campaignId ?? null)
  const active = useMemo(
    () => campaigns.find((c) => c.campaignId === activeId) ?? campaigns[0] ?? null,
    [campaigns, activeId],
  )

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = opt.value === selectedStatus
          return (
            <a
              key={opt.value}
              href={`/ads?status=${opt.value}`}
              className={[
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-[var(--brand-red)] bg-[var(--brand-red)]/5"
                  : "border-token surface-1 hover:border-[var(--brand-red)]",
              ].join(" ")}
            >
              <span>{opt.label}</span>
              <span className="rounded-full border border-token bg-[color:var(--surface-2)] px-2 text-[11px] muted">
                {counts[opt.value] ?? 0}
              </span>
            </a>
          )
        })}
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
          <table className="w-full text-sm">
            <thead className="border-b border-token bg-[color:var(--surface-2)] text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Campaign</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Views</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Spend so far</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const isActive = c.campaignId === active?.campaignId
                const spend = c.currentViews * c.rewardPerView
                return (
                  <tr
                    key={c.campaignId}
                    className={[
                      "cursor-pointer border-b border-token transition",
                      isActive ? "bg-[var(--brand-red)]/5" : "hover:bg-black/5",
                    ].join(" ")}
                    onClick={() => setActiveId(c.campaignId)}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold">{c.advertiser}</div>
                      <div className="mt-1 text-xs muted">
                        {c.partnerName ?? "—"} • {c.scheduleBand}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill tone={tone(c.status)}>{c.status.toLowerCase().replace(/_/g, " ")}</StatusPill>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div>{c.currentViews.toLocaleString()}{c.maxViews != null ? <span className="muted"> / {c.maxViews.toLocaleString()}</span> : null}</div>
                      <div className="mt-1 text-xs muted">{formatCurrency(c.rewardPerView)}/view</div>
                    </td>
                    <td className="px-4 py-3 align-top font-semibold">{formatCurrency(spend)}</td>
                  </tr>
                )
              })}
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm muted">
                    No campaigns matched this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div>
          {active ? (
            <CampaignDrawer key={active.campaignId} campaign={active} />
          ) : (
            <div className="rounded-2xl border border-dashed border-token p-10 text-center text-sm muted">
              Pick a campaign to inspect spend, creative preview, and admin actions.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CampaignDrawer({ campaign }: { campaign: CampaignRow }) {
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [promptKind, setPromptKind] = useState<null | "pause" | "resume" | "reject" | "cancel">(null)

  const adjustForm = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      maxViews: campaign.maxViews,
      rewardPerView: campaign.rewardPerView,
      reason: "",
    },
  })

  const stopForm = useForm<StopValues>({
    resolver: zodResolver(stopSchema),
    defaultValues: { reason: "" },
  })

  const runStatusChange = (label: string, status: "PAUSED" | "ACTIVE" | "FORCE_STOPPED" | "REJECTED", reason?: string) => {
    setPendingLabel(label)
    startTransition(async () => {
      const result = await setCampaignStatusAction({ campaignId: campaign.campaignId, status, reason })
      setPendingLabel(null)
      if (result.ok) toast.success(`${label} • ${campaign.advertiser}`)
      else toast.error(result.error ?? "Action failed.")
    })
  }

  const submitAdjust = (values: AdjustValues) => {
    setPendingLabel("Delivery updated")
    startTransition(async () => {
      const result = await adjustCampaignDeliveryAction({
        campaignId: campaign.campaignId,
        maxViews: values.maxViews ?? null,
        rewardPerView: values.rewardPerView ?? null,
        reason: values.reason,
      })
      setPendingLabel(null)
      if (result.ok) {
        toast.success(`Delivery updated • ${campaign.advertiser}`)
        adjustForm.reset({
          maxViews: values.maxViews ?? campaign.maxViews,
          rewardPerView: values.rewardPerView ?? campaign.rewardPerView,
          reason: "",
        })
      } else {
        toast.error(result.error ?? "Action failed.")
      }
    })
  }

  const submitForceStop = (values: StopValues) => {
    runStatusChange("Force-stopped", "FORCE_STOPPED", values.reason)
    stopForm.reset({ reason: "" })
  }

  const spend = campaign.currentViews * campaign.rewardPerView

  return (
    <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-2 border-b border-token p-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold tracking-tight">{campaign.advertiser}</div>
          <div className="text-xs muted">
            {campaign.partnerName ?? "—"} • {campaign.scheduleBand}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill tone={tone(campaign.status)}>{campaign.status.toLowerCase().replace(/_/g, " ")}</StatusPill>
            {campaign.startDate ? <StatusPill tone="muted">From {campaign.startDate}</StatusPill> : null}
            {campaign.endDate ? <StatusPill tone="muted">To {campaign.endDate}</StatusPill> : null}
          </div>
        </div>
        <div className="text-right text-xs muted">
          <div>Created {formatDate(campaign.createdAt)}</div>
          {campaign.lastAdminActionAt ? <div>Last admin action {formatDate(campaign.lastAdminActionAt)}</div> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="overflow-hidden rounded-xl border border-token bg-black/30">
          {campaign.creativeSignedUrl && campaign.creativeMimeType?.startsWith("video/") ? (
            <video
              key={campaign.creativeId ?? campaign.campaignId}
              src={campaign.creativeSignedUrl}
              controls
              playsInline
              className="aspect-video w-full bg-black"
            />
          ) : campaign.creativeSignedUrl && campaign.creativeMimeType?.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaign.creativeSignedUrl} alt={campaign.creativeTitle ?? "Creative"} className="aspect-video w-full object-contain" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-[color:var(--surface-2)] text-sm muted">
              {campaign.creativeTitle ? "No preview available" : "Legacy campaign — no linked creative"}
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Views" value={campaign.currentViews.toLocaleString()} sub={campaign.maxViews != null ? `Cap ${campaign.maxViews.toLocaleString()}` : "No cap"} />
            <Stat label="Reward / view" value={formatCurrency(campaign.rewardPerView)} sub="ZAR" />
            <Stat label="Spend" value={formatCurrency(spend)} sub="Estimated" />
          </div>

          {campaign.forceStopReason ? (
            <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide muted">Force-stop note</div>
              <div className="mt-1 whitespace-pre-wrap">{campaign.forceStopReason}</div>
              <div className="mt-1 text-[11px] muted">Stopped {formatDate(campaign.forceStoppedAt)}</div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {campaign.status === "PENDING_REVIEW" ? (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runStatusChange("Approved", "ACTIVE")}
                  className="h-10 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setPromptKind("reject")}
                  className="h-10 rounded-lg border border-red-400/40 bg-red-500/10 px-3 text-sm font-semibold text-red-100 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            ) : null}
            <button
              type="button"
              disabled={isPending || campaign.status !== "ACTIVE"}
              onClick={() => setPromptKind("pause")}
              className="h-10 rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingLabel === "Paused" ? "Pausing…" : "Pause"}
            </button>
            <button
              type="button"
              disabled={isPending || (campaign.status !== "PAUSED" && campaign.status !== "FORCE_STOPPED")}
              onClick={() => setPromptKind("resume")}
              className="h-10 rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingLabel === "Resumed" ? "Resuming…" : "Resume"}
            </button>
          </div>

          <div className="text-xs muted">
            <Link href={`/trip-media/fraud?campaign=${campaign.campaignId}`} className="text-[var(--brand-red)] hover:underline">
              Look at fraud signals for this campaign →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-token p-4 md:grid-cols-2">
        <form onSubmit={adjustForm.handleSubmit(submitAdjust)} className="space-y-2 rounded-xl border border-token bg-[color:var(--surface-2)] p-3">
          <div className="text-sm font-semibold tracking-tight">Adjust delivery</div>
          <p className="text-xs muted">Change view cap or per-view reward. Audit logged.</p>
          <label className="block text-xs font-semibold muted">View cap</label>
          <input
            type="number"
            inputMode="numeric"
            {...adjustForm.register("maxViews", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
            className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm"
          />
          <label className="block text-xs font-semibold muted">Reward per view (ZAR)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...adjustForm.register("rewardPerView", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
            className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm"
          />
          <label className="block text-xs font-semibold muted">Reason</label>
          <textarea
            {...adjustForm.register("reason")}
            className="min-h-20 w-full rounded-lg border border-token bg-transparent p-2 text-sm"
            placeholder="Why are you changing this?"
          />
          {adjustForm.formState.errors.reason ? (
            <p className="text-xs text-red-500">{adjustForm.formState.errors.reason.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="h-10 w-full rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save delivery change"}
          </button>
        </form>

        <form onSubmit={stopForm.handleSubmit(submitForceStop)} className="space-y-2 rounded-xl border border-red-400/30 bg-red-500/5 p-3">
          <div className="text-sm font-semibold tracking-tight">Force-stop campaign</div>
          <p className="text-xs muted">Use only when the campaign needs to stop now. Advertiser is notified.</p>
          <label className="block text-xs font-semibold muted">Reason</label>
          <textarea
            {...stopForm.register("reason")}
            className="min-h-20 w-full rounded-lg border border-token bg-transparent p-2 text-sm"
            placeholder="What happened?"
          />
          {stopForm.formState.errors.reason ? (
            <p className="text-xs text-red-500">{stopForm.formState.errors.reason.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={isPending || campaign.status === "FORCE_STOPPED"}
            className="h-10 w-full rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingLabel === "Force-stopped" ? "Stopping…" : "Force-stop now"}
          </button>
        </form>
      </div>

      <PromptDialog
        open={promptKind === "pause"}
        title="Pause this campaign"
        description="Pausing stops new views immediately. The advertiser sees the reason."
        label="Why are you pausing it?"
        placeholder="Short note for the advertiser and audit log"
        submitLabel="Pause campaign"
        onClose={() => setPromptKind(null)}
        onSubmit={async (reason) => {
          setPromptKind(null)
          runStatusChange("Paused", "PAUSED", reason)
        }}
      />
      <PromptDialog
        open={promptKind === "reject"}
        title="Reject this campaign"
        description="The advertiser can fix issues and resubmit. They will see your reason."
        label="Rejection reason"
        placeholder="What needs to change?"
        submitLabel="Reject campaign"
        onClose={() => setPromptKind(null)}
        onSubmit={async (reason) => {
          setPromptKind(null)
          runStatusChange("Rejected", "REJECTED", reason)
        }}
      />
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-token bg-[color:var(--surface-2)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide muted">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
      <div className="text-[11px] muted">{sub}</div>
    </div>
  )
}
