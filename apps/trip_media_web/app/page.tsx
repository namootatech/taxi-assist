import Link from "next/link"
import { ArrowRight, BarChart3, CreditCard, UploadCloud } from "lucide-react"

const steps = [
  {
    icon: UploadCloud,
    title: "Upload your creative",
    body: "Prepare the campaign asset and campaign message for review.",
  },
  {
    icon: CreditCard,
    title: "Choose a package",
    body: "Start with a trial or move into a paid plan when billing is connected.",
  },
  {
    icon: BarChart3,
    title: "Track performance",
    body: "See impressions, completion, and package usage in one calm workspace.",
  },
]

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col px-5 py-8 md:px-8">
      <nav className="flex items-center justify-between" aria-label="Trip Media navigation">
        <Link href="/" className="focus-ring rounded-xl text-sm font-black uppercase tracking-[0.24em]">
          Trip Media
        </Link>
        <div className="flex items-center gap-3">
          <Link className="focus-ring rounded-full px-4 py-2 text-sm font-bold muted hover:text-white" href="/login">
            Log in
          </Link>
          <Link className="focus-ring rounded-full bg-[var(--brand-red)] px-4 py-2 text-sm font-black text-white" href="/signup">
            Start trial
          </Link>
        </div>
      </nav>

      <section className="grid flex-1 items-center gap-10 py-16 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-red-200">Taxi Assist Media</p>
          <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">
            Put your brand inside real trips.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 muted">
            Join Trip Media to prepare campaigns, manage packages, and reach riders through attention that happens on the move.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-[#07111f]" href="/signup">
              Start partner setup <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--border)] px-6 py-3 text-sm font-black" href="/login">
              Log in
            </Link>
          </div>
        </div>

        <div className="panel rounded-[2rem] p-5">
          <div className="rounded-[1.5rem] bg-white p-5 text-[#122033]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--brand-red)]">Dashboard preview</div>
                <div className="mt-2 text-2xl font-black">Trial campaign</div>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">Ready</span>
            </div>
            <div className="mt-6 grid gap-3">
              {steps.map((step) => {
                const Icon = step.icon
                return (
                  <article key={step.title} className="rounded-2xl border border-slate-200 p-4">
                    <Icon className="size-5 text-[var(--brand-red)]" aria-hidden />
                    <h2 className="mt-3 font-black">{step.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
