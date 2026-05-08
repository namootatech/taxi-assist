import type { Metadata } from "next"
import { MarketingPage } from "@/components/marketing/marketing-page"
import { marketingPages } from "@/lib/marketing/content"

export const metadata: Metadata = {
  title: "Drive With Trip",
  description: "Get approved, go live, and start earning with a driver flow built around compliance and clarity.",
}

export default function DriversPage() {
  return <MarketingPage content={marketingPages.drivers} />
}
