import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { MarketingPageContent } from "@/lib/marketing/content"

interface MarketingPageProps {
  content: MarketingPageContent
}

export function MarketingPage({ content }: MarketingPageProps) {
  return (
    <main className="page-enter">
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[0.85fr_1.15fr] md:px-8 md:py-24">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[var(--brand-red)]">{content.eyebrow}</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.06em] md:text-7xl">
            {content.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 muted">{content.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={content.primaryHref}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-red)] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/20"
            >
              {content.primaryCta} <ArrowRight className="size-4" aria-hidden />
            </Link>
            {content.secondaryCta && content.secondaryHref ? (
              <Link
                href={content.secondaryHref}
                className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-black transition hover:-translate-y-0.5"
              >
                {content.secondaryCta}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4">
          {content.sections.map((section) => {
            const Icon = section.icon
            return (
              <article key={section.title} className="surface rounded-[2rem] border p-6 transition hover:-translate-y-1">
                <Icon className="size-6 text-[var(--brand-red)]" aria-hidden />
                <h2 className="mt-6 text-2xl font-black tracking-[-0.03em]">{section.title}</h2>
                <p className="mt-3 leading-7 muted">{section.body}</p>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
