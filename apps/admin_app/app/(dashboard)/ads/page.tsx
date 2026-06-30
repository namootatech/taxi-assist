import { PageHeader } from "@/components/trip-media/Surface"
import { loadCampaignCounts, loadCampaigns, type CampaignStatus } from "@/lib/trip-media/campaigns"
import { loadCampaignPackages } from "@/lib/trip-media/packages"
import { CampaignsConsole } from "./CampaignsConsole"

export const dynamic = "force-dynamic"

const ALLOWED: ReadonlyArray<CampaignStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "PENDING_REVIEW",
  "CANCELLATION_PENDING",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ENDED",
  "REJECTED",
  "CANCELLED",
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

  const [campaigns, counts, packages] = await Promise.all([
    loadCampaigns({ status: selectedStatus }),
    loadCampaignCounts(),
    loadCampaignPackages(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ad campaigns"
        description="Review partner campaigns, confirm payment before approval, manage impressions and escrow, and process cancellation credits."
      />

      <CampaignsConsole campaigns={campaigns} packages={packages} selectedStatus={selectedStatus} counts={counts} />
    </div>
  )
}
