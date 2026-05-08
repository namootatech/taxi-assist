import { PageHeader } from "@/components/trip-media/Surface"
import { loadCreativeCounts, loadCreativeQueue, type CreativeStatus } from "@/lib/trip-media/creatives"
import { loadTripMediaSettings } from "@/lib/trip-media/settings"
import { CreativesQueue } from "./CreativesQueue"

export const dynamic = "force-dynamic"

const ALLOWED_STATUSES: ReadonlyArray<CreativeStatus> = [
  "pending_review",
  "approved",
  "rejected",
  "changes_requested",
  "suspended",
  "flagged",
  "draft",
]

const isCreativeStatus = (value: string | undefined): value is CreativeStatus =>
  Boolean(value) && (ALLOWED_STATUSES as ReadonlyArray<string>).includes(value as string)

export default async function CreativesReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const selectedStatus: CreativeStatus = isCreativeStatus(status) ? status : "pending_review"

  const [creatives, counts, settings] = await Promise.all([
    loadCreativeQueue(selectedStatus),
    loadCreativeCounts(),
    loadTripMediaSettings(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creative review"
        description="Approve, reject, request changes, suspend, or flag advertiser creatives. Every action is audited and the advertiser is notified."
      />

      <CreativesQueue
        creatives={creatives}
        selectedStatus={selectedStatus}
        counts={counts}
        rejectionReasons={settings.rejectionReasons}
      />
    </div>
  )
}
