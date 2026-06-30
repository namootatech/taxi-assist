"use client"

import { useMemo, useState, useTransition } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Check, ChevronLeft, ChevronRight, CreditCard } from "lucide-react"
import type { PartnerPackage } from "@/lib/campaign/types"
import { computeLocalPrice, formatZarFromCents } from "@/lib/campaign/types"
import { campaignDraftSchema, type CampaignDraftInput } from "@/lib/campaign/schema"
import { initiateCampaignPayment, saveCampaignDraft, submitCampaignForReview } from "./actions"

interface CreativeOption {
  id: string
  title: string
  status: string
}

interface CampaignWizardProps {
  packages: PartnerPackage[]
  creatives: CreativeOption[]
  prelaunchDiscountPct: number
  prelaunchBonusAvailable: boolean
  defaultCompanyName?: string
  initial?: Partial<CampaignDraftInput> & { campaign_id?: string; payment_status?: string }
}

const STEPS = ["Details", "Package", "Creative", "Destination", "Review"] as const

export function CampaignWizard({
  packages,
  creatives,
  prelaunchDiscountPct,
  prelaunchBonusAvailable,
  defaultCompanyName = "",
  initial,
}: CampaignWizardProps) {
  const [step, setStep] = useState(0)
  const [pending, startTransition] = useTransition()
  const [campaignId, setCampaignId] = useState(initial?.campaign_id)
  const [paymentStatus, setPaymentStatus] = useState(initial?.payment_status ?? "pending")

  const form = useForm<CampaignDraftInput>({
    resolver: zodResolver(campaignDraftSchema) as unknown as Resolver<CampaignDraftInput>,
    defaultValues: {
      campaign_id: initial?.campaign_id,
      advertiser: initial?.advertiser ?? "",
      company_name: initial?.company_name ?? defaultCompanyName,
      package_id: initial?.package_id ?? packages[0]?.id ?? "",
      impressions: initial?.impressions ?? 1000,
      creative_id: initial?.creative_id ?? creatives.find((c) => c.status === "approved")?.id,
      start_date: initial?.start_date ?? "",
      end_date: initial?.end_date ?? "",
      destination_type: initial?.destination_type,
      destination_value: initial?.destination_value ?? "",
      campaign_notes: initial?.campaign_notes ?? "",
      custom_requirements: initial?.custom_requirements ?? "",
    },
  })

  const selectedPackage = packages.find((p) => p.id === form.watch("package_id"))
  const impressions = form.watch("impressions")
  const pricing = useMemo(() => {
    if (!selectedPackage) return null
    const local = computeLocalPrice(
      selectedPackage.base_price_cents,
      selectedPackage.min_impressions,
      impressions,
      prelaunchDiscountPct,
    )
    return {
      ...local,
      bonus_impressions: prelaunchBonusAvailable ? 1000 : 0,
    }
  }, [selectedPackage, impressions, prelaunchDiscountPct, prelaunchBonusAvailable])

  const persistDraft = async (): Promise<string | undefined> => {
    const values = form.getValues()
    const result = await saveCampaignDraft({ ...values, campaign_id: campaignId })
    if (!result.success) {
      toast.error(result.message ?? "Could not save draft.")
      return undefined
    }
    if (result.campaignId) setCampaignId(result.campaignId)
    return result.campaignId
  }

  const handleNext = () => {
    const fieldsByStep: Array<Array<keyof CampaignDraftInput>> = [
      ["advertiser", "company_name", "start_date", "end_date", "campaign_notes", "custom_requirements"],
      ["package_id", "impressions"],
      ["creative_id"],
      ["destination_type", "destination_value"],
      [],
    ]
    startTransition(async () => {
      const valid = await form.trigger(fieldsByStep[step] as never)
      if (!valid) return
      const id = await persistDraft()
      if (!id && step < 4) return
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    })
  }

  const handlePay = () => {
    startTransition(async () => {
      const id = campaignId ?? (await persistDraft())
      if (!id) return
      await initiateCampaignPayment(id)
    })
  }

  const handleSubmitReview = () => {
    startTransition(async () => {
      const id = campaignId ?? (await persistDraft())
      if (!id) return
      const result = await submitCampaignForReview({ campaignId: id })
      if (!result.success) {
        toast.error(result.message ?? "Could not submit.")
        return
      }
      toast.success("Campaign submitted for review.")
    })
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              index === step
                ? "border-[var(--brand-red)] bg-[var(--brand-red)]/15 text-white"
                : index < step
                  ? "border-emerald-400/40 text-emerald-100"
                  : "border-[var(--border)] text-slate-300",
            ].join(" ")}
          >
            {index < step ? <Check className="h-3 w-3" /> : null}
            {label}
          </span>
        ))}
      </nav>

      <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
        {step === 0 ? (
          <>
            <Field label="Campaign name" error={form.formState.errors.advertiser?.message}>
              <input {...form.register("advertiser")} className="field-input" />
            </Field>
            <Field label="Company name" error={form.formState.errors.company_name?.message}>
              <input {...form.register("company_name")} className="field-input" />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Start date" error={form.formState.errors.start_date?.message}>
                <input type="date" {...form.register("start_date")} className="field-input" />
              </Field>
              <Field label="End date (optional)" error={form.formState.errors.end_date?.message}>
                <input type="date" {...form.register("end_date")} className="field-input" />
              </Field>
            </div>
            <Field label="Campaign notes (optional)">
              <textarea {...form.register("campaign_notes")} rows={3} className="field-input" />
            </Field>
            <Field label="Custom requirements (optional)">
              <textarea {...form.register("custom_requirements")} rows={3} className="field-input" />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              {packages.map((pkg) => {
                const selected = form.watch("package_id") === pkg.id
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => form.setValue("package_id", pkg.id)}
                    className={[
                      "cursor-pointer rounded-2xl border p-4 text-left transition duration-200",
                      selected
                        ? "border-[var(--brand-red)] bg-[var(--brand-red)]/10"
                        : "border-[var(--border)] bg-white/5 hover:border-white/30",
                    ].join(" ")}
                  >
                    <div className="text-lg font-black">{pkg.name}</div>
                    <div className="mt-1 text-sm text-slate-300">{pkg.description}</div>
                    <div className="mt-3 text-sm font-semibold">
                      {formatZarFromCents(pkg.base_price_cents)} / 1,000 impressions
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Up to {pkg.max_duration_seconds}s · skip after {pkg.skip_after_seconds}s
                    </div>
                  </button>
                )
              })}
            </div>
            <Field label="Impressions" error={form.formState.errors.impressions?.message}>
              <input
                type="number"
                min={1000}
                step={100}
                {...form.register("impressions", { valueAsNumber: true })}
                className="field-input"
              />
            </Field>
            {pricing ? (
              <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatZarFromCents(pricing.subtotal_cents)}</span>
                </div>
                {pricing.discount_cents > 0 ? (
                  <div className="flex justify-between text-emerald-200">
                    <span>Prelaunch discount ({prelaunchDiscountPct}%)</span>
                    <span>-{formatZarFromCents(pricing.discount_cents)}</span>
                  </div>
                ) : null}
                {pricing.bonus_impressions > 0 ? (
                  <div className="flex justify-between text-sky-200">
                    <span>Bonus impressions</span>
                    <span>+{pricing.bonus_impressions.toLocaleString()}</span>
                  </div>
                ) : null}
                <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-base font-bold">
                  <span>Total due</span>
                  <span>{formatZarFromCents(pricing.total_cents)}</span>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            {creatives.length === 0 ? (
              <p className="rounded-2xl border border-amber-400/40 bg-amber-300/10 p-4 text-sm text-amber-100">
                Upload a creative first, then return to finish this campaign.
              </p>
            ) : (
              <Field label="Creative" error={form.formState.errors.creative_id?.message}>
                <select {...form.register("creative_id")} className="field-input">
                  {creatives.map((c) => (
                    <option key={c.id} className="text-slate-900" value={c.id}>
                      {c.title} ({c.status})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <p className="text-xs text-slate-400">
              Portrait 1080×1920 · MP4, MOV, JPG, or PNG · max 300MB
            </p>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="flex gap-3">
              {(["website", "whatsapp"] as const).map((type) => (
                <label key={type} className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    value={type}
                    checked={form.watch("destination_type") === type}
                    onChange={() => {
                      form.setValue("destination_type", type)
                      form.setValue("destination_value", "")
                    }}
                  />
                  {type === "website" ? "Website URL" : "WhatsApp number"}
                </label>
              ))}
            </div>
            <Field
              label={form.watch("destination_type") === "whatsapp" ? "WhatsApp number (optional)" : "Website URL (optional)"}
              error={form.formState.errors.destination_value?.message}
            >
              <input {...form.register("destination_value")} className="field-input" placeholder={form.watch("destination_type") === "whatsapp" ? "+27..." : "https://"} />
            </Field>
          </>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white/5 p-4 text-sm">
            <Row label="Campaign" value={form.getValues("advertiser")} />
            <Row label="Company" value={form.getValues("company_name")} />
            <Row label="Package" value={selectedPackage?.name ?? "—"} />
            <Row label="Impressions" value={impressions.toLocaleString()} />
            {pricing ? <Row label="Total" value={formatZarFromCents(pricing.total_cents)} /> : null}
            <Row label="Payment" value={paymentStatus === "paid" ? "Paid" : "Pending"} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {step > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setStep((s) => s - 1)}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          ) : null}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={pending}
              onClick={handleNext}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save & continue"} <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}

          {step === STEPS.length - 1 && paymentStatus !== "paid" ? (
            <button
              type="button"
              disabled={pending}
              onClick={handlePay}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" /> {pending ? "Redirecting..." : "Pay with Payfast"}
            </button>
          ) : null}

          {step === STEPS.length - 1 && paymentStatus === "paid" ? (
            <button
              type="button"
              disabled={pending}
              onClick={handleSubmitReview}
              className="focus-ring rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {pending ? "Submitting..." : "Submit for review"}
            </button>
          ) : null}
        </div>
      </form>

      <style jsx global>{`
        .field-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.08);
          padding: 0.75rem 1rem;
          color: white;
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
      {error ? <span className="text-xs text-red-200">{error}</span> : null}
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  )
}
