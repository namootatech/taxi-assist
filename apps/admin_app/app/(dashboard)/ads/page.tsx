import { PageHeader } from "@/components/trip-media/Surface"
import { loadCampaignCounts, loadCampaigns, type CampaignStatus } from "@/lib/trip-media/campaigns"
import { CampaignsConsole } from "./CampaignsConsole"

export const dynamic = "force-dynamic"

const ALLOWED: ReadonlyArray<CampaignStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ENDED",
  "REJECTED",
  "FORCE_STOPPED",
]

const isStatus = (value: string | undefined): value is CampaignStatus | "ALL" =>
  Boolean(value) && (ALLOWED as ReadonlyArray<string>).includes(value as string)

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const selectedStatus: CampaignStatus | "ALL" = isStatus(status) ? status : "ALL"

  const [campaigns, counts] = await Promise.all([
    loadCampaigns({ status: selectedStatus }),
    loadCampaignCounts(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ad campaigns"
        description="See what is running, what spend looks like, and step in when something is off. Every action is audited and the advertiser sees the reason."
      />

      <CampaignsConsole campaigns={campaigns} selectedStatus={selectedStatus} counts={counts} />
    </div>
  )
}
