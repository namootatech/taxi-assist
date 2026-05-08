"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import {
  adjustPartnerCreditsAction,
  setPartnerStatusAction,
} from "@/lib/trip-media/server-actions"

const statusSchema = z.object({
  reason: z.string().min(8, "Add a short reason. The advertiser sees this.").max(600),
})
type StatusValues = z.infer<typeof statusSchema>

const creditsSchema = z.object({
  delta: z
    .number({ message: "Enter a number." })
    .refine((v) => Number.isInteger(v) && v !== 0, "Use a non-zero whole number."),
  reason: z.string().min(8, "Add a short reason. Audited.").max(600),
})
type CreditsValues = z.infer<typeof creditsSchema>

export function AdvertiserActions({
  partnerId,
  status,
  promotionalCreditsBalance,
}: {
  partnerId: string
  status: string
  promotionalCreditsBalance: number
}) {
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const suspendForm = useForm<StatusValues>({ resolver: zodResolver(statusSchema), defaultValues: { reason: "" } })
  const restoreForm = useForm<StatusValues>({ resolver: zodResolver(statusSchema), defaultValues: { reason: "" } })
  const creditsForm = useForm<CreditsValues>({
    resolver: zodResolver(creditsSchema),
    defaultValues: { delta: 0, reason: "" },
  })

  const submitStatus = (label: string, target: "suspended" | "active" | "closed") => async (values: StatusValues) => {
    setPendingLabel(label)
    startTransition(async () => {
      const result = await setPartnerStatusAction({ partnerId, status: target, reason: values.reason })
      setPendingLabel(null)
      if (result.ok) {
        toast.success(label)
        suspendForm.reset({ reason: "" })
        restoreForm.reset({ reason: "" })
      } else {
        toast.error(result.error ?? "Action failed.")
      }
    })
  }

  const submitCredits = (values: CreditsValues) => {
    setPendingLabel("Credits adjusted")
    startTransition(async () => {
      const result = await adjustPartnerCreditsAction({
        partnerId,
        delta: values.delta,
        reason: values.reason,
      })
      setPendingLabel(null)
      if (result.ok) {
        toast.success("Credits adjusted")
        creditsForm.reset({ delta: 0, reason: "" })
      } else {
        toast.error(result.error ?? "Action failed.")
      }
    })
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {status !== "suspended" && status !== "closed" ? (
        <form
          onSubmit={suspendForm.handleSubmit(submitStatus("Advertiser suspended", "suspended"))}
          className="space-y-2 rounded-xl border border-token bg-[color:var(--surface-2)] p-3"
        >
          <div className="text-sm font-semibold tracking-tight">Suspend advertiser</div>
          <p className="text-xs muted">Pauses every active campaign and notifies the workspace.</p>
          <textarea
            {...suspendForm.register("reason")}
            className="min-h-20 w-full rounded-lg border border-token bg-transparent p-2 text-sm"
            placeholder="What happened?"
          />
          {suspendForm.formState.errors.reason ? (
            <p className="text-xs text-red-500">{suspendForm.formState.errors.reason.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="h-10 w-full rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingLabel === "Advertiser suspended" ? "Suspending…" : "Suspend now"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={restoreForm.handleSubmit(submitStatus("Advertiser restored", "active"))}
          className="space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3"
        >
          <div className="text-sm font-semibold tracking-tight">Restore advertiser</div>
          <p className="text-xs muted">Brings the workspace back. Active campaigns must be resumed individually.</p>
          <textarea
            {...restoreForm.register("reason")}
            className="min-h-20 w-full rounded-lg border border-token bg-transparent p-2 text-sm"
            placeholder="Why are you restoring?"
          />
          {restoreForm.formState.errors.reason ? (
            <p className="text-xs text-red-500">{restoreForm.formState.errors.reason.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="h-10 w-full rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingLabel === "Advertiser restored" ? "Restoring…" : "Restore advertiser"}
          </button>
        </form>
      )}

      <form
        onSubmit={creditsForm.handleSubmit(submitCredits)}
        className="space-y-2 rounded-xl border border-token bg-[color:var(--surface-2)] p-3"
      >
        <div className="text-sm font-semibold tracking-tight">Adjust promotional credits</div>
        <p className="text-xs muted">Current balance: {promotionalCreditsBalance.toLocaleString()} credits.</p>
        <label className="block text-xs font-semibold muted">Change (positive to add, negative to remove)</label>
        <input
          type="number"
          step="1"
          {...creditsForm.register("delta", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
          className="h-10 w-full rounded-lg border border-token bg-transparent px-2 text-sm"
        />
        {creditsForm.formState.errors.delta ? (
          <p className="text-xs text-red-500">{creditsForm.formState.errors.delta.message}</p>
        ) : null}
        <label className="block text-xs font-semibold muted">Reason</label>
        <textarea
          {...creditsForm.register("reason")}
          className="min-h-20 w-full rounded-lg border border-token bg-transparent p-2 text-sm"
          placeholder="What is this credit for?"
        />
        {creditsForm.formState.errors.reason ? (
          <p className="text-xs text-red-500">{creditsForm.formState.errors.reason.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="h-10 w-full rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingLabel === "Credits adjusted" ? "Saving…" : "Save adjustment"}
        </button>
      </form>

      <div className="space-y-2 rounded-xl border border-token bg-[color:var(--surface-2)] p-3">
        <div className="text-sm font-semibold tracking-tight">Quick links</div>
        <ul className="space-y-2 text-sm">
          <li>
            <a className="text-[var(--brand-red)] hover:underline" href={`/creatives?status=pending_review`}>
              Open creative queue
            </a>
          </li>
          <li>
            <a className="text-[var(--brand-red)] hover:underline" href={`/ads?partner=${partnerId}`}>
              Filter campaigns to this advertiser
            </a>
          </li>
          <li>
            <a className="text-[var(--brand-red)] hover:underline" href={`/trip-media/fraud?partner=${partnerId}`}>
              Look at fraud signals for this advertiser
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
