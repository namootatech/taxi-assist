"use client"

import { useActionState, useState } from "react"
import { useSearchParams } from "next/navigation"
import { submitLeadForm, type LeadFormState } from "@/app/contact/actions"

const initialState: LeadFormState = {
  ok: false,
  message: "",
}

const topics = [
  { value: "rider", label: "Rider updates" },
  { value: "driver", label: "Driver interest" },
  { value: "partner", label: "Advertising partner" },
  { value: "press", label: "Press" },
  { value: "support", label: "Support" },
]

export function LeadForm() {
  const searchParams = useSearchParams()
  const [state, formAction, isPending] = useActionState(submitLeadForm, initialState)
  const [topic, setTopic] = useState(searchParams.get("topic") || "partner")

  return (
    <form action={formAction} className="grid gap-4" aria-describedby="lead-form-status">
      <input type="hidden" name="utm_source" value={searchParams.get("utm_source") || ""} />
      <input type="hidden" name="utm_medium" value={searchParams.get("utm_medium") || ""} />
      <input type="hidden" name="utm_campaign" value={searchParams.get("utm_campaign") || ""} />
      <label className="hidden">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">
          Name
          <input className="focus-ring rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal" name="name" autoComplete="name" required />
          {state.fieldErrors?.name ? <span className="text-sm text-[var(--brand-red)]">{state.fieldErrors.name}</span> : null}
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Email
          <input className="focus-ring rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal" name="email" type="email" autoComplete="email" required />
          {state.fieldErrors?.email ? <span className="text-sm text-[var(--brand-red)]">{state.fieldErrors.email}</span> : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">
          Phone optional
          <input className="focus-ring rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal" name="phone" type="tel" autoComplete="tel" />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          I’m interested in
          <select className="focus-ring rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal" name="topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
            {topics.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold">
        Message
        <textarea className="focus-ring min-h-32 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal" name="message" required />
        {state.fieldErrors?.message ? <span className="text-sm text-[var(--brand-red)]">{state.fieldErrors.message}</span> : null}
      </label>

      <label className="flex gap-3 text-sm leading-6 muted">
        <input className="mt-1 size-4 accent-[var(--brand-red)]" name="consent" type="checkbox" required />
        <span>Trip / Taxi Assist may contact me about this request. We won’t use this form to collect rider trip details.</span>
      </label>

      <button
        className="focus-ring rounded-full bg-[var(--brand-red)] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
      >
        {isPending ? "Sending..." : "Send request"}
      </button>
      <p id="lead-form-status" className={state.ok ? "text-sm font-bold text-[var(--brand-navy)]" : "text-sm text-[var(--brand-red)]"} aria-live="polite">
        {state.message}
      </p>
    </form>
  )
}
