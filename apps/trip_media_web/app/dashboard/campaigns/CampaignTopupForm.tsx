"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { formatZarFromCents } from "@/lib/campaign/types"
import { initiateImpressionTopup } from "./actions"

export function CampaignTopupForm({
  campaignId,
  costPerThousand,
}: {
  campaignId: string
  costPerThousand: number
}) {
  const [impressions, setImpressions] = useState(500)
  const [pending, startTransition] = useTransition()
  const amount = Math.round((costPerThousand * impressions) / 1000)

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white/5 p-4">
      <h2 className="text-lg font-bold">Add impressions</h2>
      <p className="mt-1 text-sm text-slate-400">No minimum on extra impressions once your campaign is live.</p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="grid gap-2 text-sm font-semibold">
          Extra impressions
          <input
            type="number"
            min={1}
            value={impressions}
            onChange={(e) => setImpressions(Number(e.target.value))}
            className="rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
          />
        </label>
        <div className="text-sm">
          Estimated cost: <span className="font-bold">{formatZarFromCents(amount)}</span>
        </div>
        <button
          type="button"
          disabled={pending || impressions <= 0}
          onClick={() =>
            startTransition(async () => {
              try {
                await initiateImpressionTopup(campaignId, impressions)
              } catch {
                toast.error("Could not start top-up checkout.")
              }
            })
          }
          className="focus-ring rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {pending ? "Redirecting..." : "Pay for extra impressions"}
        </button>
      </div>
    </section>
  )
}
