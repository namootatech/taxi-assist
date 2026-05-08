import { KpiCard, PageHeader } from "@/components/trip-media/Surface"
import { formatNumber } from "@/lib/trip-media/format"
import {
  loadFraudCandidates,
  loadFraudCounts,
  loadFraudSignals,
  type FraudLevel,
  type FraudStatus,
} from "@/lib/trip-media/fraud"
import { FraudConsole } from "./FraudConsole"

export const dynamic = "force-dynamic"

const VALID_STATUSES: ReadonlyArray<FraudStatus | "all"> = [
  "all",
  "open",
  "investigating",
  "resolved",
  "dismissed",
  "escalated",
]

const VALID_LEVELS: ReadonlyArray<FraudLevel | "all"> = ["all", "low", "medium", "high", "critical"]

export default async function FraudPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; level?: string; partner?: string; campaign?: string }>
}) {
  const { status, level, partner, campaign } = await searchParams
  const selectedStatus: FraudStatus | "all" = (VALID_STATUSES as ReadonlyArray<string>).includes(status ?? "")
    ? (status as FraudStatus | "all")
    : "open"
  const selectedLevel: FraudLevel | "all" = (VALID_LEVELS as ReadonlyArray<string>).includes(level ?? "")
    ? (level as FraudLevel | "all")
    : "all"

  const [counts, signals, candidates] = await Promise.all([
    loadFraudCounts(),
    loadFraudSignals({
      status: selectedStatus,
      level: selectedLevel,
      partnerId: partner,
      campaignId: campaign,
    }),
    loadFraudCandidates(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud monitoring"
        description="Triage suspicious rider activity. Freeze rewards while you investigate, escalate critical cases, and keep the audit log honest."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total signals" value={formatNumber(counts.total)} />
        <KpiCard label="Open" value={formatNumber(counts.open)} tone={counts.open > 0 ? "warning" : "default"} />
        <KpiCard label="Investigating" value={formatNumber(counts.investigating)} />
        <KpiCard
          label="High or critical"
          value={formatNumber(counts.highOrCritical)}
          tone={counts.highOrCritical > 0 ? "danger" : "default"}
        />
      </div>

      <FraudConsole
        signals={signals}
        candidates={candidates}
        selectedStatus={selectedStatus}
        selectedLevel={selectedLevel}
      />
    </div>
  )
}
