"use client"

import Link from "next/link"
import { useTransition } from "react"
import { CreditCard, Pause, Play, Send, Square } from "lucide-react"
import { toast } from "sonner"
import { endCampaign, pauseCampaign, resumeCampaign, submitCampaignForReview } from "./actions"

interface CampaignActionsProps {
  campaignId: string
  status: string
  paymentStatus?: string
  canManage?: boolean
}

const buttonClass =
  "focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/8 px-3 py-1.5 text-xs font-bold disabled:opacity-60"

export function CampaignActions({
  campaignId,
  status,
  paymentStatus = "pending",
  canManage = true,
}: CampaignActionsProps) {
  const [pending, startTransition] = useTransition()

  if (!canManage) return <p className="text-xs text-slate-400">Read-only</p>

  const wrap = (
    fn: (input: { campaignId: string }) => Promise<{ success: boolean; message?: string }>,
    label: string,
  ) =>
    () =>
      startTransition(async () => {
        const result = await fn({ campaignId })
        if (!result.success) {
          toast.error(result.message || `Could not ${label}.`)
          return
        }
        toast.success(label)
      })

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "DRAFT" || status === "REJECTED") && paymentStatus !== "paid" ? (
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className={`${buttonClass} cursor-pointer bg-[var(--brand-red)] text-white`}
        >
          <CreditCard className="size-3.5" aria-hidden /> Pay & review
        </Link>
      ) : null}
      {(status === "DRAFT" || status === "REJECTED") && paymentStatus === "paid" ? (
        <button
          type="button"
          onClick={wrap(submitCampaignForReview, "submitted for review")}
          disabled={pending}
          className={`${buttonClass} bg-[var(--brand-red)] text-white`}
        >
          <Send className="size-3.5" aria-hidden /> Submit for review
        </button>
      ) : null}
      {status === "ACTIVE" ? (
        <button type="button" onClick={wrap(pauseCampaign, "paused")} disabled={pending} className={buttonClass}>
          <Pause className="size-3.5" aria-hidden /> Pause
        </button>
      ) : null}
      {status === "PAUSED" ? (
        <button type="button" onClick={wrap(resumeCampaign, "resumed")} disabled={pending} className={buttonClass}>
          <Play className="size-3.5" aria-hidden /> Resume
        </button>
      ) : null}
      {status === "ACTIVE" || status === "PAUSED" || status === "DRAFT" ? (
        <button
          type="button"
          onClick={wrap(endCampaign, "ended")}
          disabled={pending}
          className={`${buttonClass} border-red-400/40 bg-red-500/10 text-red-100`}
        >
          <Square className="size-3.5" aria-hidden /> End
        </button>
      ) : null}
    </div>
  )
}
