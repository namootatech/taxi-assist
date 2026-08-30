import type { LucideIcon } from "lucide-react"
import { BadgeCheck, Car, Megaphone, ShieldCheck, WalletCards } from "lucide-react"
import { externalLinks } from "@/lib/links"

export interface MarketingPageContent {
  eyebrow: string
  title: string
  description: string
  primaryCta: string
  primaryHref: string
  secondaryCta?: string
  secondaryHref?: string
  sections: Array<{
    title: string
    body: string
    icon: LucideIcon
  }>
}

export const marketingPages: Record<"about" | "riders" | "drivers" | "advertise", MarketingPageContent> = {
  about: {
    eyebrow: "About Trip",
    title: "A safer, clearer way to move through South Africa.",
    description:
      "Trip is being built around verified drivers, clear trip information, and payment choices that fit local habits.",
    primaryCta: "Contact the team",
    primaryHref: "/contact",
    sections: [
      {
        title: "Compliance first",
        body: "Driver, vehicle, and document checks are part of the operating model, not an afterthought.",
        icon: ShieldCheck,
      },
      {
        title: "Built for real payment habits",
        body: "Wallet, card, and cash support are planned so riders can pay in the way that works for them.",
        icon: WalletCards,
      },
      {
        title: "Media with purpose",
        body: "Trip Media creates a path for brands to fund useful rider credits without weakening trip safety rules.",
        icon: Megaphone,
      },
    ],
  },
  riders: {
    eyebrow: "For riders",
    title: "Book a ride with more confidence.",
    description:
      "See the trip clearly, ride with verified drivers, and use payment choices designed for everyday movement.",
    primaryCta: "Get rider updates",
    primaryHref: externalLinks.riderApp,
    secondaryCta: "Ask a question",
    secondaryHref: "/contact?topic=rider",
    sections: [
      {
        title: "Clear trips",
        body: "Know what is happening before, during, and after each ride.",
        icon: Car,
      },
      {
        title: "Verified drivers",
        body: "Driver and vehicle checks help make each journey easier to trust.",
        icon: BadgeCheck,
      },
      {
        title: "Pay your way",
        body: "Wallet, card, and cash support are planned around South African rider habits.",
        icon: WalletCards,
      },
    ],
  },
  drivers: {
    eyebrow: "For drivers",
    title: "Get approved, go live, and start earning.",
    description:
      "Trip gives drivers a clear path through profile setup, vehicle checks, document review, and trips.",
    primaryCta: "Start driving",
    primaryHref: externalLinks.driverApp,
    secondaryCta: "Join the waitlist",
    secondaryHref: "/contact?topic=driver",
    sections: [
      {
        title: "Simple approval steps",
        body: "Know which profile, vehicle, and document tasks are still needed before you can accept trips.",
        icon: BadgeCheck,
      },
      {
        title: "Designed for earning",
        body: "The driver experience focuses on readiness, trip clarity, and clean next actions.",
        icon: Car,
      },
      {
        title: "Support when it matters",
        body: "Trip operations and support flows are planned around safety, auditability, and fast resolution.",
        icon: ShieldCheck,
      },
    ],
  },
  advertise: {
    eyebrow: "Trip Media",
    title: "Reach riders while they are already in motion.",
    description:
      "Trip Media helps partners prepare in-trip campaigns around attention, timing, and trust.",
    primaryCta: "Open partner portal",
    primaryHref: externalLinks.tripMediaWeb,
    secondaryCta: "Contact media sales",
    secondaryHref: "/contact?topic=partner",
    sections: [
      {
        title: "Trip-aware attention",
        body: "Campaigns are designed for the rider journey, not a generic ad feed.",
        icon: Megaphone,
      },
      {
        title: "Clear package path",
        body: "Partners can move from trial to paid packages as billing and campaign tools come online.",
        icon: WalletCards,
      },
      {
        title: "Admin moderation",
        body: "Internal teams keep campaign review, safety, and takedown controls separate from partner self-service.",
        icon: ShieldCheck,
      },
    ],
  },
}
