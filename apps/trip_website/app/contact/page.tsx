import type { Metadata } from "next"
import { Suspense } from "react"
import { LeadForm } from "@/components/marketing/lead-form"

export const metadata: Metadata = {
  title: "Contact Trip",
  description: "Contact Trip about rider updates, driver interest, media partnerships, press, or support.",
}

export default function ContactPage() {
  return (
    <main className="page-enter mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[0.8fr_1.2fr] md:px-8 md:py-24">
      <section>
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[var(--brand-red)]">Contact</p>
        <h1 className="mt-5 text-5xl font-black leading-[0.96] tracking-[-0.06em] md:text-7xl">
          Tell us where you want to go next.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 muted">
          Ask about rider updates, driver onboarding, Trip Media, press, or support. We’ll route your message to the right team.
        </p>
      </section>
      <section className="surface rounded-[2rem] border p-5 md:p-8" aria-label="Contact form">
        <Suspense fallback={<p className="muted">Loading form...</p>}>
          <LeadForm />
        </Suspense>
      </section>
    </main>
  )
}
