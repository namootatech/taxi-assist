import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BadgeCheck, Car, Megaphone, ShieldCheck, WalletCards } from "lucide-react"
import { externalLinks, heroImage } from "@/lib/links"

const audienceCards = [
  {
    id: "riders",
    icon: Car,
    eyebrow: "For riders",
    title: "Book with more confidence.",
    body: "Ride with verified drivers, clear trip details, and payment choices that fit the way you move.",
    cta: "Get rider updates",
    href: externalLinks.riderApp,
  },
  {
    id: "drivers",
    icon: BadgeCheck,
    eyebrow: "For drivers",
    title: "Get approved and start earning.",
    body: "Follow a clear onboarding path for your profile, vehicle, and documents before you go live.",
    cta: "Start driving",
    href: externalLinks.driverApp,
  },
  {
    id: "advertise",
    icon: Megaphone,
    eyebrow: "For partners",
    title: "Put your brand inside real trips.",
    body: "Reach riders through Taxi Assist Media with campaigns built around attention, timing, and trust.",
    cta: "Advertise with us",
    href: externalLinks.tripMediaWeb,
  },
]

const trustItems = [
  { icon: ShieldCheck, title: "Verification first", body: "Driver and vehicle checks are part of the platform from day one." },
  { icon: WalletCards, title: "Flexible payments", body: "Wallet, card, and cash support are planned around South African rider habits." },
  { icon: Megaphone, title: "Media with a reason", body: "Ads connect to trip context and future rider credits without weakening completion rules." },
]

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid min-h-[calc(100svh-74px)] max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-[0.95fr_1.05fr] md:px-8 md:py-20">
          <div className="relative z-10">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-[var(--brand-red)]">
              Trip / Taxi Assist
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.06em] md:text-7xl">
              Move safely. Earn clearly. Reach people in motion.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 muted">
              A South African ride-hailing platform for verified rides, driver income, and in-trip media that respects the journey.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={externalLinks.riderApp}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-red)] px-6 py-3 text-sm font-black text-white shadow-xl shadow-red-500/20"
              >
                Get rider updates <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/drivers"
                className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-black"
              >
                Drive with Trip
              </Link>
            </div>
          </div>

          <figure className="surface relative min-h-[28rem] overflow-hidden rounded-[2rem] border">
            <Image
              src={heroImage.src}
              alt={heroImage.alt}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(18,32,51,0.72)] via-transparent to-transparent" />
            <figcaption className="absolute bottom-4 left-4 rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur">
              {heroImage.credit}
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8" aria-labelledby="choose-your-path">
        <div className="max-w-2xl">
          <h2 id="choose-your-path" className="text-3xl font-black tracking-[-0.04em] md:text-5xl">
            Choose your next step.
          </h2>
          <p className="mt-4 text-lg muted">
            Trip has a clear path for every side of the marketplace.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {audienceCards.map((card) => {
            const Icon = card.icon
            return (
              <article key={card.id} id={card.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white p-6 shadow-sm">
                <Icon className="size-6 text-[var(--brand-red)]" aria-hidden />
                <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] muted">{card.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black tracking-[-0.03em]">{card.title}</h3>
                <p className="mt-3 leading-7 muted">{card.body}</p>
                <Link className="focus-ring mt-6 inline-flex items-center gap-2 rounded-lg font-black text-[var(--brand-navy)]" href={card.href}>
                  {card.cta} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      <section className="bg-[var(--brand-navy)] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-[0.8fr_1.2fr] md:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-red-200">Built for trust</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">A platform for the realities of South African mobility.</h2>
          </div>
          <div className="grid gap-4">
            {trustItems.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="rounded-3xl border border-white/15 bg-white/8 p-5">
                  <Icon className="size-5 text-red-200" aria-hidden />
                  <h3 className="mt-4 text-xl font-black">{item.title}</h3>
                  <p className="mt-2 leading-7 text-white/72">{item.body}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
