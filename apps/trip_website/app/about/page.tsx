import type { Metadata } from "next"
import { MarketingPage } from "@/components/marketing/marketing-page"
import { marketingPages } from "@/lib/marketing/content"

export const metadata: Metadata = {
  title: "About Trip",
  description: "Learn how Trip is building verified rides, flexible payments, and in-trip media for South Africa.",
}

export default function AboutPage() {
  return <MarketingPage content={marketingPages.about} />
}
