import type { Metadata } from "next"
import { MarketingPage } from "@/components/marketing/marketing-page"
import { marketingPages } from "@/lib/marketing/content"

export const metadata: Metadata = {
  title: "Advertise With Taxi Assist Media",
  description: "Reach riders through Trip / Taxi Assist in-trip media with partner campaigns built around attention and trust.",
}

export default function AdvertisePage() {
  return <MarketingPage content={marketingPages.advertise} />
}
