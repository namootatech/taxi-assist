"use client"

import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { setTripMediaSettingAction } from "@/lib/trip-media/server-actions"
import { tripMediaSettingsKeys } from "@/lib/trip-media/policy-constants"
import type {
  RewardCaps,
  RiskThresholds,
  RiderPayoutMultiplier,
  TripMediaSettings,
  WatchRules,
} from "@/lib/trip-media/settings"

const rewardCapsSchema = z.object({
  per_trip_max_reward_cents: z.number().int().min(0, "Use 0 or higher."),
  per_day_max_reward_cents: z.number().int().min(0, "Use 0 or higher."),
  default_reward_per_view_cents: z.number().int().min(0, "Use 0 or higher."),
})

const reasonsSchema = z.object({
  reasons: z
    .array(
      z.object({
        slug: z.string().min(2, "Slug needs at least 2 characters."),
        label: z.string().min(2, "Label needs at least 2 characters."),
        description: z.string().min(4, "Add a one-line description."),
      }),
    )
    .min(1, "Keep at least one reason."),
})

const riskSchema = z.object({
  rapid_completion_per_hour: z.number().int().min(1, "Use a positive number."),
  unique_devices_per_account: z.number().int().min(1, "Use a positive number."),
  emulator_score_high: z.number().min(0).max(1, "Use a value between 0 and 1."),
  shared_ip_per_hour: z.number().int().min(1, "Use a positive number."),
})

const watchSchema = z.object({
  min_watch_ratio: z.number().min(0).max(1, "Use a value between 0 and 1."),
  min_rating: z.number().int().min(0).max(5, "Use a value between 0 and 5."),
  min_comment_length: z.number().int().min(0, "Use 0 or higher."),
})

const payoutMultiplierSchema = z.object({
  multiplier: z.number().min(0.1).max(5, "Use a value between 0.1 and 5."),
})

export function SettingsForms({ initial }: { initial: TripMediaSettings }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <RiderPayoutMultiplierForm initial={initial.riderPayoutMultiplier} />
      <RewardCapsForm initial={initial.rewardCaps} />
      <RejectionReasonsForm initial={initial.rejectionReasons} />
      <RiskThresholdsForm initial={initial.riskThresholds} />
      <WatchRulesForm initial={initial.watchRules} />
    </div>
  )
}

function FormShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-token surface-1 p-5 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-1 border-b border-token pb-3">
        <div className="text-base font-semibold tracking-tight">{title}</div>
        <div className="text-sm muted">{description}</div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function ActionButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Saving…" : children}
    </button>
  )
}

function RiderPayoutMultiplierForm({ initial }: { initial: RiderPayoutMultiplier }) {
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState(false)
  const form = useForm<RiderPayoutMultiplier>({
    resolver: zodResolver(payoutMultiplierSchema),
    defaultValues: initial,
  })

  const submit = (values: RiderPayoutMultiplier) => {
    setPending(true)
    startTransition(async () => {
      const result = await setTripMediaSettingAction(tripMediaSettingsKeys.riderPayoutMultiplier, values)
      setPending(false)
      if (result.ok) toast.success("Rider payout multiplier saved")
      else toast.error(result.error ?? "Action failed.")
    })
  }

  return (
    <FormShell
      title="Rider payout multiplier"
      description="Applied at trip end on top of each campaign's rider payout rate. Use above 1.0 for launch incentives, then reduce as rider supply stabilises."
    >
      <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
        <NumberField
          label="Multiplier (e.g. 1.25 = 25% higher)"
          step="0.01"
          {...form.register("multiplier", { setValueAs: (v) => Number(v) })}
        />
        <div className="flex items-end justify-end md:col-span-2">
          <ActionButton pending={pending}>Save multiplier</ActionButton>
        </div>
      </form>
    </FormShell>
  )
}

function RewardCapsForm({ initial }: { initial: RewardCaps }) {
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState(false)
  const form = useForm<RewardCaps>({ resolver: zodResolver(rewardCapsSchema), defaultValues: initial })

  const submit = (values: RewardCaps) => {
    setPending(true)
    startTransition(async () => {
      const result = await setTripMediaSettingAction(tripMediaSettingsKeys.rewardCaps, values)
      setPending(false)
      if (result.ok) toast.success("Reward caps saved")
      else toast.error(result.error ?? "Action failed.")
    })
  }

  return (
    <FormShell title="Reward caps" description="The maximum amounts that can be paid out to a rider per trip and per day.">
      <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={form.handleSubmit(submit)}>
        <NumberField label="Per-trip max (cents)" {...form.register("per_trip_max_reward_cents", { setValueAs: (v) => Number(v) })} />
        <NumberField label="Per-day max (cents)" {...form.register("per_day_max_reward_cents", { setValueAs: (v) => Number(v) })} />
        <NumberField label="Default per view (cents)" {...form.register("default_reward_per_view_cents", { setValueAs: (v) => Number(v) })} />
        <div className="md:col-span-3 flex justify-end">
          <ActionButton pending={pending}>Save reward caps</ActionButton>
        </div>
      </form>
    </FormShell>
  )
}

function RejectionReasonsForm({ initial }: { initial: TripMediaSettings["rejectionReasons"] }) {
  const form = useForm<{ reasons: TripMediaSettings["rejectionReasons"] }>({
    resolver: zodResolver(reasonsSchema),
    defaultValues: { reasons: initial },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "reasons" })
  const [pending, setPending] = useState(false)
  const [, startTransition] = useTransition()

  const submit = (values: { reasons: TripMediaSettings["rejectionReasons"] }) => {
    setPending(true)
    startTransition(async () => {
      const result = await setTripMediaSettingAction(tripMediaSettingsKeys.rejectionReasons, values.reasons)
      setPending(false)
      if (result.ok) toast.success("Rejection reasons updated")
      else toast.error(result.error ?? "Action failed.")
    })
  }

  return (
    <FormShell
      title="Rejection reasons"
      description="The drop-down options moderators choose from when rejecting a creative."
    >
      <form className="space-y-3" onSubmit={form.handleSubmit(submit)}>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-2 rounded-xl border border-token bg-[color:var(--surface-2)] p-3 md:grid-cols-[1fr_1fr_2fr_auto]">
              <TextField label="Slug" {...form.register(`reasons.${index}.slug`)} />
              <TextField label="Label" {...form.register(`reasons.${index}.label`)} />
              <TextField label="Description" {...form.register(`reasons.${index}.description`)} />
              <button
                type="button"
                className="h-10 rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)]"
                onClick={() => remove(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => append({ slug: "", label: "", description: "" })}
            className="h-10 rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)]"
          >
            Add reason
          </button>
          <ActionButton pending={pending}>Save reasons</ActionButton>
        </div>
      </form>
    </FormShell>
  )
}

function RiskThresholdsForm({ initial }: { initial: RiskThresholds }) {
  const form = useForm<RiskThresholds>({ resolver: zodResolver(riskSchema), defaultValues: initial })
  const [pending, setPending] = useState(false)
  const [, startTransition] = useTransition()

  const submit = (values: RiskThresholds) => {
    setPending(true)
    startTransition(async () => {
      const result = await setTripMediaSettingAction(tripMediaSettingsKeys.riskThresholds, values)
      setPending(false)
      if (result.ok) toast.success("Risk thresholds updated")
      else toast.error(result.error ?? "Action failed.")
    })
  }

  return (
    <FormShell title="Risk thresholds" description="Automatic candidate detection uses these values.">
      <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
        <NumberField label="Rapid completions per hour" {...form.register("rapid_completion_per_hour", { setValueAs: (v) => Number(v) })} />
        <NumberField label="Unique devices per account" {...form.register("unique_devices_per_account", { setValueAs: (v) => Number(v) })} />
        <NumberField label="Emulator score (high)" step="0.01" {...form.register("emulator_score_high", { setValueAs: (v) => Number(v) })} />
        <NumberField label="Shared IP per hour" {...form.register("shared_ip_per_hour", { setValueAs: (v) => Number(v) })} />
        <div className="md:col-span-2 flex justify-end">
          <ActionButton pending={pending}>Save thresholds</ActionButton>
        </div>
      </form>
    </FormShell>
  )
}

function WatchRulesForm({ initial }: { initial: WatchRules }) {
  const form = useForm<WatchRules>({ resolver: zodResolver(watchSchema), defaultValues: initial })
  const [pending, setPending] = useState(false)
  const [, startTransition] = useTransition()

  const submit = (values: WatchRules) => {
    setPending(true)
    startTransition(async () => {
      const result = await setTripMediaSettingAction(tripMediaSettingsKeys.watchRules, values)
      setPending(false)
      if (result.ok) toast.success("Watch rules updated")
      else toast.error(result.error ?? "Action failed.")
    })
  }

  return (
    <FormShell title="Watch & rating rules" description="Minimum rider behaviour required before a reward is credited.">
      <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={form.handleSubmit(submit)}>
        <NumberField label="Min watch ratio (0–1)" step="0.01" {...form.register("min_watch_ratio", { setValueAs: (v) => Number(v) })} />
        <NumberField label="Min rating (1–5)" {...form.register("min_rating", { setValueAs: (v) => Number(v) })} />
        <NumberField label="Min comment length" {...form.register("min_comment_length", { setValueAs: (v) => Number(v) })} />
        <div className="md:col-span-3 flex justify-end">
          <ActionButton pending={pending}>Save watch rules</ActionButton>
        </div>
      </form>
    </FormShell>
  )
}

function TextField({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide muted">{label}</span>
      <input
        type="text"
        className="h-10 rounded-lg border border-token bg-transparent px-2 text-sm"
        {...rest}
      />
    </label>
  )
}

function NumberField({ label, step, ...rest }: { label: string; step?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide muted">{label}</span>
      <input
        type="number"
        step={step ?? "1"}
        className="h-10 rounded-lg border border-token bg-transparent px-2 text-sm"
        {...rest}
      />
    </label>
  )
}
