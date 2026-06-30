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
  adjustCampaignPackageAction,
  cancelCampaignCreditPartnerAction,
  setCampaignStatusAction,
} from "@/lib/trip-media/server-actions"
import type { CampaignRow, CampaignStatus } from "@/lib/trip-media/campaigns"
import type { CampaignPackageRow } from "@/lib/trip-media/packages"

const STATUS_OPTIONS: Array<{ value: CampaignStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "CANCELLATION_PENDING", label: "Cancellation requests" },
  { value: "DRAFT", label: "Drafts" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ENDED", label: "Ended" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "FORCE_STOPPED", label: "Force-stopped" },
]

const tone = (status: CampaignStatus): "success" | "warning" | "danger" | "muted" | "default" => {
  if (status === "ACTIVE") return "success"
  if (status === "PAUSED" || status === "PENDING_REVIEW" || status === "CANCELLATION_PENDING") return "warning"
  if (status === "FORCE_STOPPED" || status === "REJECTED" || status === "CANCELLED") return "danger"
  return "muted"
}

const formatDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleString() : "—")
const formatCurrency = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n)
const formatCents = (cents: number) => formatCurrency(cents / 100)

const packageAdjustSchema = z.object({
  packageId: z.string().optional(),
  impressionsPurchased: z.number().int().min(1).optional(),
  impressionsBonus: z.number().int().min(0).optional(),
  riderPayoutCents: z.number().int().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().min(8, "Add a short reason. The audit log keeps it.").max(600),
})

const legacyAdjustSchema = z.object({
  maxViews: z.union([z.number().int().nonnegative(), z.null()]).optional(),
  rewardPerView: z.union([z.number().nonnegative(), z.null()]).optional(),
  reason: z.string().min(8).max(600),
})

const stopSchema = z.object({
  reason: z.string().min(8, "Add a reason. The advertiser sees this.").max(600),
})

type PackageAdjustValues = z.infer<typeof packageAdjustSchema>
type LegacyAdjustValues = z.infer<typeof legacyAdjustSchema>
type StopValues = z.infer<typeof stopSchema>

export function CampaignsConsole({
  campaigns,
  packages,
  selectedStatus,
  counts,
}: {
  campaigns: Array<CampaignRow>
  packages: Array<CampaignPackageRow>
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
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Impressions</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Payment</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const isActive = c.campaignId === active?.campaignId
                const total = (c.impressionsPurchased ?? 0) + c.impressionsBonus
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
                        {c.packageName ?? "Legacy"} • {c.partnerName ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill tone={tone(c.status)}>{c.status.toLowerCase().replace(/_/g, " ")}</StatusPill>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div>
                        {c.impressionsUsed.toLocaleString()}
                        <span className="muted"> / {total.toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-xs muted">{c.impressionsRemaining.toLocaleString()} left</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill tone={c.paymentStatus === "paid" ? "success" : "warning"}>
                        {c.paymentStatus}
                      </StatusPill>
                      {c.totalPaidCents > 0 ? (
                        <div className="mt-1 text-xs font-semibold">{formatCents(c.totalPaidCents)}</div>
                      ) : null}
                    </td>
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
            <CampaignDrawer key={active.campaignId} campaign={active} packages={packages} />
          ) : (
            <div className="rounded-2xl border border-dashed border-token p-10 text-center text-sm muted">
              Pick a campaign to inspect impressions, escrow, creative preview, and admin actions.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CampaignDrawer({
  campaign,
  packages,
}: {
  campaign: CampaignRow
  packages: Array<CampaignPackageRow>
}) {
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [promptKind, setPromptKind] = useState<null | "pause" | "resume" | "reject" | "cancel">(null)

  const packageForm = useForm<PackageAdjustValues>({
    resolver: zodResolver(packageAdjustSchema),
    defaultValues: {
      packageId: campaign.packageId ?? undefined,
      impressionsPurchased: campaign.impressionsPurchased ?? undefined,
      impressionsBonus: campaign.impressionsBonus,
      riderPayoutCents: campaign.riderPayoutCents ?? undefined,
      startDate: campaign.startDate ?? undefined,
      endDate: campaign.endDate ?? undefined,
      reason: "",
    },
  })

  const legacyForm = useForm<LegacyAdjustValues>({
    resolver: zodResolver(legacyAdjustSchema),
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

  const submitPackageAdjust = (values: PackageAdjustValues) => {
    setPendingLabel("Package updated")
    startTransition(async () => {
      const result = await adjustCampaignPackageAction({
        campaignId: campaign.campaignId,
        packageId: values.packageId || null,
        impressionsPurchased: values.impressionsPurchased ?? null,
        impressionsBonus: values.impressionsBonus ?? null,
        riderPayoutCents: values.riderPayoutCents ?? null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        reason: values.reason,
      })
      setPendingLabel(null)
      if (result.ok) {
        toast.success(`Campaign updated • ${campaign.advertiser}`)
        packageForm.reset({ ...values, reason: "" })
      } else {
        toast.error(result.error ?? "Action failed.")
      }
    })
  }

  const submitLegacyAdjust = (values: LegacyAdjustValues) => {
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
        legacyForm.reset({ ...values, reason: "" })
      } else {
        toast.error(result.error ?? "Action failed.")
      }
    })
  }

  const submitForceStop = (values: StopValues) => {
    runStatusChange("Force-stopped", "FORCE_STOPPED", values.reason)
    stopForm.reset({ reason: "" })
  }

  const creditCancellation = (reason: string) => {
    setPendingLabel("Credits issued")
    startTransition(async () => {
      const result = await cancelCampaignCreditPartnerAction(campaign.campaignId, reason)
      setPendingLabel(null)
      if (result.ok) toast.success(`Partner credited • ${campaign.advertiser}`)
      else toast.error(result.error ?? "Action failed.")
    })
  }

  const totalImpressions = (campaign.impressionsPurchased ?? 0) + campaign.impressionsBonus
  const canApprove = campaign.paymentStatus === "paid"

  return (
    <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-2 border-b border-token p-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold tracking-tight">{campaign.advertiser}</div>
          <div className="text-xs muted">
            {campaign.companyName ?? campaign.partnerName ?? "—"} • {campaign.packageName ?? "Legacy package"}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill tone={tone(campaign.status)}>{campaign.status.toLowerCase().replace(/_/g, " ")}</StatusPill>
            <StatusPill tone={campaign.paymentStatus === "paid" ? "success" : "warning"}>
              Payment {campaign.paymentStatus}
            </StatusPill>
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
              className="aspect-[9/16] w-full max-h-[420px] bg-black object-contain mx-auto"
            />
          ) : campaign.creativeSignedUrl && campaign.creativeMimeType?.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaign.creativeSignedUrl} alt={campaign.creativeTitle ?? "Creative"} className="aspect-[9/16] w-full max-h-[420px] object-contain mx-auto" />
          ) : (
            <div className="flex aspect-[9/16] w-full max-h-[420px] items-center justify-center bg-[color:var(--surface-2)] text-sm muted">
              {campaign.creativeTitle ? "No preview available" : "No linked creative"}
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Impressions used" value={campaign.impressionsUsed.toLocaleString()} sub={`of ${totalImpressions.toLocaleString()}`} />
            <Stat label="Remaining" value={campaign.impressionsRemaining.toLocaleString()} sub="Valid views only" />
            <Stat label="Paid" value={formatCents(campaign.totalPaidCents)} sub={campaign.discountCents > 0 ? `${formatCents(campaign.discountCents)} discount` : "Partner payment"} />
            <Stat label="Rider escrow" value={formatCents(campaign.escrowRiderCents)} sub={`Trip ${formatCents(campaign.escrowTripCents)}`} />
          </div>

          {campaign.riderPayoutCents != null ? (
            <div className="rounded-xl border border-token bg-[color:var(--surface-2)] p-3 text-xs">
              <div className="font-semibold">Rider payout (hidden from partner)</div>
              <div className="mt-1">{formatCents(campaign.riderPayoutCents)} per valid impression</div>
            </div>
          ) : null}

          {campaign.destinationValue ? (
            <div className="rounded-xl border border-token bg-[color:var(--surface-2)] p-3 text-xs">
              <div className="font-semibold">{campaign.destinationType === "whatsapp" ? "WhatsApp" : "Website"}</div>
              <div className="mt-1 break-all">{campaign.destinationValue}</div>
            </div>
          ) : null}

          {campaign.campaignNotes ? (
            <div className="rounded-xl border border-token bg-[color:var(--surface-2)] p-3 text-xs">
              <div className="font-semibold">Partner notes</div>
              <div className="mt-1 whitespace-pre-wrap">{campaign.campaignNotes}</div>
            </div>
          ) : null}

          {(campaign.forceStopReason || campaign.reviewNote || campaign.cancellationReason) ? (
            <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-3">
              {campaign.forceStopReason ? (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide muted">Force-stop note</div>
                  <div className="mt-1 whitespace-pre-wrap">{campaign.forceStopReason}</div>
                </>
              ) : null}
              {campaign.reviewNote ? (
                <>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-wide muted">Rejection note</div>
                  <div className="mt-1 whitespace-pre-wrap">{campaign.reviewNote}</div>
                </>
              ) : null}
              {campaign.cancellationReason ? (
                <>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-wide muted">Cancellation request</div>
                  <div className="mt-1 whitespace-pre-wrap">{campaign.cancellationReason}</div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {campaign.status === "PENDING_REVIEW" ? (
              <>
                <button
                  type="button"
                  disabled={isPending || !canApprove}
                  onClick={() => runStatusChange("Approved", "ACTIVE")}
                  className="h-10 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                  title={canApprove ? undefined : "Payment must be confirmed before approval"}
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
                {!canApprove ? (
                  <p className="col-span-2 text-xs text-amber-600">Payment not confirmed. Campaign cannot go live yet.</p>
                ) : null}
              </>
            ) : null}
            {campaign.status === "CANCELLATION_PENDING" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setPromptKind("cancel")}
                className="col-span-2 h-10 rounded-lg bg-amber-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Credit remaining impressions
              </button>
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

      <div className="grid grid-cols-1 gap-4 border-t border-token p-4 lg:grid-cols-2">
        {campaign.packageId ? (
          <form onSubmit={packageForm.handleSubmit(submitPackageAdjust)} className="space-y-2 rounded-xl border border-token bg-[color:var(--surface-2)] p-3">
            <div className="text-sm font-semibold tracking-tight">Adjust package & impressions</div>
            <p className="text-xs muted">Change package, purchased/bonus impressions, rider payout, or schedule. Audit logged.</p>
            <label className="block text-xs font-semibold muted">Package</label>
            <select
              {...packageForm.register("packageId")}
              className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <label className="block text-xs font-semibold muted">Impressions purchased</label>
            <input
              type="number"
              {...packageForm.register("impressionsPurchased", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
              className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm"
            />
            <label className="block text-xs font-semibold muted">Bonus impressions</label>
            <input
              type="number"
              {...packageForm.register("impressionsBonus", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
              className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm"
            />
            <label className="block text-xs font-semibold muted">Rider payout (cents)</label>
            <input
              type="number"
              {...packageForm.register("riderPayoutCents", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
              className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold muted">Start date</label>
                <input type="date" {...packageForm.register("startDate")} className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold muted">End date</label>
                <input type="date" {...packageForm.register("endDate")} className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm" />
              </div>
            </div>
            <label className="block text-xs font-semibold muted">Reason</label>
            <textarea {...packageForm.register("reason")} className="min-h-20 w-full rounded-lg border border-token bg-transparent p-2 text-sm" placeholder="Why are you changing this?" />
            <button type="submit" disabled={isPending} className="h-10 w-full rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:opacity-50">
              {isPending ? "Saving…" : "Save package change"}
            </button>
          </form>
        ) : (
          <form onSubmit={legacyForm.handleSubmit(submitLegacyAdjust)} className="space-y-2 rounded-xl border border-token bg-[color:var(--surface-2)] p-3">
            <div className="text-sm font-semibold tracking-tight">Adjust delivery (legacy)</div>
            <label className="block text-xs font-semibold muted">View cap</label>
            <input type="number" {...legacyForm.register("maxViews", { setValueAs: (v) => (v === "" ? null : Number(v)) })} className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm" />
            <label className="block text-xs font-semibold muted">Reward per view (ZAR)</label>
            <input type="number" step="0.01" {...legacyForm.register("rewardPerView", { setValueAs: (v) => (v === "" ? null : Number(v)) })} className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm" />
            <label className="block text-xs font-semibold muted">Reason</label>
            <textarea {...legacyForm.register("reason")} className="min-h-20 w-full rounded-lg border border-token bg-transparent p-2 text-sm" />
            <button type="submit" disabled={isPending} className="h-10 w-full rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:opacity-50">
              {isPending ? "Saving…" : "Save delivery change"}
            </button>
          </form>
        )}

        <form onSubmit={stopForm.handleSubmit(submitForceStop)} className="space-y-2 rounded-xl border border-red-400/30 bg-red-500/5 p-3">
          <div className="text-sm font-semibold tracking-tight">Force-stop campaign</div>
          <p className="text-xs muted">Use only when the campaign needs to stop now. Advertiser is notified.</p>
          <textarea {...stopForm.register("reason")} className="min-h-20 w-full rounded-lg border border-token bg-transparent p-2 text-sm" placeholder="What happened?" />
          <button type="submit" disabled={isPending || campaign.status === "FORCE_STOPPED"} className="h-10 w-full rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50">
            {pendingLabel === "Force-stopped" ? "Stopping…" : "Force-stop now"}
          </button>
        </form>
      </div>

      <PromptDialog open={promptKind === "pause"} title="Pause this campaign" description="Pausing stops new impressions immediately." label="Why are you pausing it?" placeholder="Short note for the advertiser and audit log" submitLabel="Pause campaign" onClose={() => setPromptKind(null)} onSubmit={async (reason) => { setPromptKind(null); runStatusChange("Paused", "PAUSED", reason) }} />
      <PromptDialog open={promptKind === "reject"} title="Reject this campaign" description="The advertiser can fix issues and resubmit." label="Rejection reason" placeholder="What needs to change?" submitLabel="Reject campaign" onClose={() => setPromptKind(null)} onSubmit={async (reason) => { setPromptKind(null); runStatusChange("Rejected", "REJECTED", reason) }} />
      <PromptDialog open={promptKind === "cancel"} title="Credit remaining impressions" description="Cancels the campaign and credits unused impressions to the partner balance for a future campaign." label="Admin cancellation reason" placeholder="Why are you crediting this partner?" submitLabel="Credit & cancel" onClose={() => setPromptKind(null)} onSubmit={async (reason) => { setPromptKind(null); creditCancellation(reason) }} />
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
