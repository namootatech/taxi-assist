import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy | Trip",
  description: "Trip privacy placeholder for POPIA-aware public website and lead capture handling.",
}

export default function LegalPrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 md:px-8">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--brand-red)]">Legal</p>
      <h1 className="mt-4 text-4xl font-black tracking-[-0.04em]">Privacy</h1>
      <p className="mt-6 leading-8 muted">
        Trip is preparing final privacy terms. Public forms should collect only what is needed to respond, avoid trip-sensitive details, and keep analytics free of personal information unless consent is in place.
      </p>
    </main>
  )
}
