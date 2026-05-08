import Link from "next/link"
import { EmptyState, KpiCard, PageHeader, Panel, StatusPill } from "@/components/trip-media/Surface"
import {
  formatCurrencyZAR,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelativeFromNow,
} from "@/lib/trip-media/format"
import {
  loadRecentTripMediaActions,
  loadTopCampaigns,
  loadTripMediaOverview,
} from "@/lib/trip-media/queries"

export const dynamic = "force-dynamic"

const statusTone = (status: string) => {
  if (status === "ACTIVE") return "success"
  if (status === "PAUSED") return "warning"
  if (status === "FORCE_STOPPED" || status === "REJECTED") return "danger"
  if (status === "PENDING_REVIEW") return "warning"
  return "muted"
}

export default async function TripMediaOverviewPage() {
  const [overview, topCampaigns, recentActions] = await Promise.all([
    loadTripMediaOverview(),
    loadTopCampaigns(10),
    loadRecentTripMediaActions(10),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip Media overview"
        description="A live read on what advertisers are running, what is waiting on a moderator, and what the team has touched today."
        actions={
          <>
            <Link
              className="rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold hover:border-[var(--brand-red)]"
              href="/creatives"
            >
              Review creatives
            </Link>
            <Link
              className="rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
              href="/trip-media/fraud"
            >
              Open fraud queue
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          label="Pending creatives"
          value={formatNumber(overview.pendingCreativesCount)}
          hint="Waiting on a moderator decision"
          href="/creatives?status=pending_review"
          tone={overview.pendingCreativesCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Active campaigns"
          value={formatNumber(overview.activeCampaignsCount)}
          hint={`${formatNumber(overview.pendingCampaignsCount)} pending review`}
          href="/ads?status=ACTIVE"
        />
        <KpiCard
          label="Active advertisers"
          value={formatNumber(overview.activePartnersCount)}
          hint="Workspaces in good standing"
          href="/trip-media/advertisers"
        />
        <KpiCard
          label="Open fraud signals"
          value={formatNumber(overview.openFraudSignalsCount)}
          hint={`${formatNumber(overview.highPriorityFraudCount)} high or critical`}
          href="/trip-media/fraud"
          tone={overview.highPriorityFraudCount > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Rider views (24h)"
          value={formatNumber(overview.viewsLast24h)}
          hint="Counts every started view"
          href="/trip-media/analytics"
        />
        <KpiCard
          label="Completion rate (24h)"
          value={formatPercent(overview.completionRateLast24hPct)}
          hint="Credited views over total views"
          href="/trip-media/analytics"
        />
        <KpiCard
          label="Reward spend (24h)"
          value={formatCurrencyZAR(overview.rewardSpendLast24h)}
          hint="Sum of credited reward per view"
          href="/trip-media/reports"
        />
        <KpiCard
          label="Flagged creatives"
          value={formatNumber(overview.flaggedCreativesCount)}
          hint="Held while a moderator reviews"
          href="/creatives?status=flagged"
          tone={overview.flaggedCreativesCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="Top campaigns by views" subtitle="Highest current view counts" href="/ads" hrefLabel="See all">
          {topCampaigns.length === 0 ? (
            <EmptyState
              title="No campaigns yet"
              description="Active campaigns will appear here once advertisers submit and start running."
            />
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {topCampaigns.map((c) => (
                <div key={c.campaignId} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.advertiser}</div>
                    <div className="mt-1 text-xs muted">
                      {c.partnerName ?? "—"} • {formatNumber(c.views)}
                      {c.maxViews != null ? ` / ${formatNumber(c.maxViews)}` : ""} views
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusPill tone={statusTone(c.status)}>{c.status.toLowerCase().replace(/_/g, " ")}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Recent admin actions"
          subtitle="Audited Trip Media decisions across the team"
          href="/audit"
          hrefLabel="Open audit log"
        >
          {recentActions.length === 0 ? (
            <EmptyState
              title="No actions yet"
              description="Approvals, rejections, freezes, and reversals show up here as soon as a moderator takes one."
            />
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {recentActions.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{a.action}</div>
                    <div className="text-xs muted">
                      {a.entityType ?? "—"} • {a.actorRole ?? "—"} • {formatRelativeFromNow(a.createdAt)}
                    </div>
                    {a.reason ? <div className="mt-1 truncate text-xs muted">“{a.reason}”</div> : null}
                  </div>
                  <div className="shrink-0 text-right text-[11px] muted">{formatDateTime(a.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
