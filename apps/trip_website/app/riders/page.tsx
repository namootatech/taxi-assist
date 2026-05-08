import type { Metadata } from "next"
import { MarketingPage } from "@/components/marketing/marketing-page"
import { marketingPages } from "@/lib/marketing/content"

export const metadata: Metadata = {
  title: "Trip For Riders",
  description: "Book with clearer trip details, verified drivers, and payment choices built for South African riders.",
}

export default function RidersPage() {
  return <MarketingPage content={marketingPages.riders} />
}
