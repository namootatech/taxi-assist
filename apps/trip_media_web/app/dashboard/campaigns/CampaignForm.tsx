"use client"

import { useTransition } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createCampaign } from "./actions"

const formSchema = z
  .object({
    advertiser: z.string().trim().min(2, "Add a campaign name."),
    creative_id: z.string().uuid("Pick a creative."),
    schedule_band: z.enum(["peak", "off_peak", "all_day", "night", "all"]),
    max_views: z.coerce.number().int().positive("Set a positive view cap.").max(1_000_000),
    reward_per_view: z.coerce.number().min(0).max(100),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  })
  .refine(
    (values) => {
      if (!values.start_date || !values.end_date) return true
      return values.start_date <= values.end_date
    },
    { path: ["end_date"], message: "End date must be on or after the start date." },
  )

type FormValues = z.infer<typeof formSchema>

interface CampaignFormProps {
  creatives: Array<{ id: string; title: string; status: string }>
}

export function CampaignForm({ creatives }: CampaignFormProps) {
  const [pending, startTransition] = useTransition()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      advertiser: "",
      creative_id: creatives[0]?.id ?? "",
      schedule_band: "all_day",
      max_views: 1000,
      reward_per_view: 0,
      start_date: "",
      end_date: "",
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createCampaign(values)
      if (!result.success) {
        toast.error(result.message || "Could not create campaign.")
        return
      }
      toast.success("Draft created. Submit it for review when ready.")
      form.reset({
        advertiser: "",
        creative_id: values.creative_id,
        schedule_band: "all_day",
        max_views: 1000,
        reward_per_view: 0,
        start_date: "",
        end_date: "",
      })
    })
  })

  if (creatives.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-400/40 bg-amber-300/10 p-4 text-sm text-amber-100">
        Upload and submit at least one creative before planning a campaign.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold">
        Campaign name
        <input
          {...form.register("advertiser")}
          className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
        />
        {form.formState.errors.advertiser ? (
          <span className="text-xs text-red-200">{form.formState.errors.advertiser.message}</span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Creative
        <select
          {...form.register("creative_id")}
          className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
        >
          {creatives.map((creative) => (
            <option key={creative.id} className="text-slate-900" value={creative.id}>
              {creative.title} {creative.status === "approved" ? "(approved)" : `(${creative.status})`}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Schedule band
        <select
          {...form.register("schedule_band")}
          className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
        >
          <option className="text-slate-900" value="all_day">All day</option>
          <option className="text-slate-900" value="peak">Peak</option>
          <option className="text-slate-900" value="off_peak">Off-peak</option>
          <option className="text-slate-900" value="night">Night</option>
          <option className="text-slate-900" value="all">Any time</option>
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          View cap
          <input
            type="number"
            min={1}
            {...form.register("max_views", { valueAsNumber: true })}
            className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
          />
          {form.formState.errors.max_views ? (
            <span className="text-xs text-red-200">{form.formState.errors.max_views.message}</span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Reward per view (R)
          <input
            type="number"
            min={0}
            step="0.01"
            {...form.register("reward_per_view", { valueAsNumber: true })}
            className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Start date (optional)
          <input
            type="date"
            {...form.register("start_date")}
            className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          End date (optional)
          <input
            type="date"
            {...form.register("end_date")}
            className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
          />
          {form.formState.errors.end_date ? (
            <span className="text-xs text-red-200">{form.formState.errors.end_date.message}</span>
          ) : null}
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="focus-ring rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Create campaign draft"}
      </button>
    </form>
  )
}
