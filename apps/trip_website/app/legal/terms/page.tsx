import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms | Trip",
  description: "Trip public terms placeholder for riders, drivers, and advertising partners.",
}

export default function LegalTermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 md:px-8">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--brand-red)]">Legal</p>
      <h1 className="mt-4 text-4xl font-black tracking-[-0.04em]">Terms</h1>
      <p className="mt-6 leading-8 muted">
        Final rider, driver, and advertising partner terms are pending legal review. Keep this placeholder until the approved launch terms are supplied.
      </p>
    </main>
  )
}
