"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { freezeRewardAction, reverseRewardAction } from "@/lib/trip-media/server-actions"
import { PromptDialog } from "@/components/trip-media/PromptDialog"

export function RewardActionButtons({ adViewId, hasRewardCredited }: { adViewId: string; hasRewardCredited: boolean }) {
  const [pending, setPending] = useState<string | null>(null)
  const [open, setOpen] = useState<null | "freeze" | "reverse">(null)
  const [, startTransition] = useTransition()

  const runFreeze = (reason: string) => {
    setOpen(null)
    setPending("freeze")
    startTransition(async () => {
      const result = await freezeRewardAction({ adViewId, reason })
      setPending(null)
      if (result.ok) toast.success("Reward frozen")
      else toast.error(result.error ?? "Action failed.")
    })
  }

  const runReverse = (reason: string) => {
    setOpen(null)
    setPending("reverse")
    startTransition(async () => {
      const result = await reverseRewardAction({ adViewId, reason })
      setPending(null)
      if (result.ok) toast.success("Reward reversed")
      else toast.error(result.error ?? "Action failed.")
    })
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setOpen("freeze")}
        disabled={pending !== null}
        className="rounded-lg border border-token px-2 py-1 text-xs font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending === "freeze" ? "Freezing…" : "Freeze"}
      </button>
      <button
        type="button"
        onClick={() => setOpen("reverse")}
        disabled={pending !== null || !hasRewardCredited}
        title={hasRewardCredited ? undefined : "Reverse only applies to credited rewards"}
        className="rounded-lg bg-[var(--brand-red)] px-2 py-1 text-xs font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending === "reverse" ? "Reversing…" : "Reverse"}
      </button>

      <PromptDialog
        open={open === "freeze"}
        title="Freeze this reward"
        description="Freezing puts a hold on the reward while you investigate. The rider's wallet is not changed."
        label="Why are you freezing it?"
        placeholder="Short reason — saved to the audit trail"
        submitLabel="Freeze reward"
        onClose={() => setOpen(null)}
        onSubmit={async (reason) => runFreeze(reason)}
      />
      <PromptDialog
        open={open === "reverse"}
        title="Reverse this reward"
        description="Reversing debits the rider's wallet. Use only after the freeze has been investigated."
        label="Why are you reversing it?"
        placeholder="Reason for the reversal"
        submitLabel="Reverse reward"
        destructive
        onClose={() => setOpen(null)}
        onSubmit={async (reason) => runReverse(reason)}
      />
    </div>
  )
}
