import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/trip-media/Surface"
import { formatCurrencyZAR, formatNumber } from "@/lib/trip-media/format"
import { loadAnalyticsBundle } from "@/lib/trip-media/analytics"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const bundle = await loadAnalyticsBundle(14)

  const totalViews = bundle.dailyTrends.reduce((sum, d) => sum + d.views, 0)
  const totalCredited = bundle.dailyTrends.reduce((sum, d) => sum + d.credited, 0)
  const totalRejected = bundle.dailyTrends.reduce((sum, d) => sum + d.rejected, 0)
  const totalSpend = bundle.dailyTrends.reduce((sum, d) => sum + d.rewardSpend, 0)
  const completionRate = totalViews > 0 ? (totalCredited / totalViews) * 100 : 0
  const peakHour = bundle.peakHours.reduce((best, hr) => (hr.views > best.views ? hr : best), { hour: 0, views: 0 })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip Media analytics"
        description="A 14-day picture of rider engagement, campaign performance, and reward economics."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Views (14d)" value={formatNumber(totalViews)} hint="Every started view counted" />
        <KpiCard label="Completion rate" value={`${completionRate.toFixed(1)}%`} hint="Credited views over total" />
        <KpiCard label="Reward spend (14d)" value={formatCurrencyZAR(totalSpend)} hint="Sum of credited rewards" />
        <KpiCard
          label="Average reward cost"
          value={formatCurrencyZAR(bundle.averageRewardCost)}
          hint={totalCredited > 0 ? "Per credited view" : "No credited views yet"}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel title="Daily completion trend" subtitle="Views, credits, and rejections over the last 14 days." className="lg:col-span-2">
          {bundle.dailyTrends.length === 0 ? (
            <EmptyState title="No view data yet" description="Once riders start watching ads in trips, the trend will fill out here." />
          ) : (
            <div className="space-y-2">
              {bundle.dailyTrends.map((d) => (
                <div key={d.day} className="grid grid-cols-[110px_minmax(0,1fr)_140px] items-center gap-3">
                  <div className="text-xs muted">{d.day}</div>
                  <BarRow views={d.views} credited={d.credited} rejected={d.rejected} maxViews={Math.max(...bundle.dailyTrends.map((r) => r.views))} />
                  <div className="text-right text-xs muted">
                    {formatNumber(d.views)} views • {formatCurrencyZAR(d.rewardSpend)}
                  </div>
                </div>
              ))}
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs muted">
                <Legend color="bg-emerald-500" label={`Credited ${formatNumber(totalCredited)}`} />
                <Legend color="bg-amber-400" label={`Other states ${formatNumber(totalViews - totalCredited - totalRejected)}`} />
                <Legend color="bg-red-500" label={`Rejected ${formatNumber(totalRejected)}`} />
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Peak watch hours" subtitle="When riders are most likely to complete an ad.">
          {peakHour.views === 0 ? (
            <EmptyState title="No data yet" description="The hour-by-hour view will populate as views come in." />
          ) : (
            <div className="space-y-1">
              {bundle.peakHours.map((hr) => {
                const max = Math.max(...bundle.peakHours.map((h) => h.views))
                const widthPct = max > 0 ? (hr.views / max) * 100 : 0
                return (
                  <div key={hr.hour} className="grid grid-cols-[60px_minmax(0,1fr)_60px] items-center gap-2">
                    <div className="text-[11px] muted">{hr.hour.toString().padStart(2, "0")}h</div>
                    <div className="h-2 w-full overflow-hidden rounded bg-[color:var(--surface-2)]">
                      <div className="h-full rounded bg-[var(--brand-red)]" style={{ width: `${widthPct}%` }} />
                    </div>
                    <div className="text-right text-[11px] muted">{formatNumber(hr.views)}</div>
                  </div>
                )
              })}
              <div className="mt-3 text-xs muted">
                Peak hour: <span className="font-semibold">{peakHour.hour.toString().padStart(2, "0")}:00</span> with {formatNumber(peakHour.views)} views.
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Top campaigns" subtitle="By view volume in the last 14 days." className="lg:col-span-2">
          {bundle.topCampaigns.length === 0 ? (
            <EmptyState title="No campaigns ran yet" description="Once a campaign earns views, it will rank here." />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-token text-left text-xs muted">
                <tr>
                  <th className="py-2 font-semibold uppercase tracking-wide">Advertiser</th>
                  <th className="py-2 font-semibold uppercase tracking-wide">Workspace</th>
                  <th className="py-2 font-semibold uppercase tracking-wide">Views</th>
                  <th className="py-2 font-semibold uppercase tracking-wide">Reward spend</th>
                </tr>
              </thead>
              <tbody>
                {bundle.topCampaigns.map((c) => (
                  <tr key={c.campaignId} className="border-b border-token last:border-b-0">
                    <td className="py-2 font-semibold">{c.advertiser}</td>
                    <td className="py-2">{c.partnerName ?? "—"}</td>
                    <td className="py-2">{formatNumber(c.views)}</td>
                    <td className="py-2">{formatCurrencyZAR(c.rewardSpend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Completion distribution" subtitle="How rider views break down by state.">
          {bundle.completionDistribution.length === 0 ? (
            <EmptyState title="Nothing to show" description="State breakdown shows up after riders start watching." />
          ) : (
            <ul className="space-y-2 text-sm">
              {bundle.completionDistribution.map((row) => {
                const max = Math.max(...bundle.completionDistribution.map((r) => r.count))
                const widthPct = max > 0 ? (row.count / max) * 100 : 0
                return (
                  <li key={row.state}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide muted">{row.state.toLowerCase().replace(/_/g, " ")}</span>
                      <span className="text-xs muted">{formatNumber(row.count)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded bg-[color:var(--surface-2)]">
                      <div className="h-full rounded bg-[var(--brand-navy-900)]" style={{ width: `${widthPct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Coverage by city" subtitle="City-level view counts.">
        <EmptyState
          title="City dimension is not collected yet"
          description="Once trip metadata captures city for ad views, this panel will fill with regional breakdowns."
        />
      </Panel>
    </div>
  )
}

function BarRow({ views, credited, rejected, maxViews }: { views: number; credited: number; rejected: number; maxViews: number }) {
  const ratio = maxViews > 0 ? views / maxViews : 0
  const totalWidth = `${Math.max(2, ratio * 100)}%`
  const creditedShare = views > 0 ? (credited / views) * 100 : 0
  const rejectedShare = views > 0 ? (rejected / views) * 100 : 0
  const otherShare = Math.max(0, 100 - creditedShare - rejectedShare)
  return (
    <div className="h-3 w-full overflow-hidden rounded bg-[color:var(--surface-2)]">
      <div className="flex h-full" style={{ width: totalWidth }}>
        <div className="bg-emerald-500" style={{ width: `${creditedShare}%` }} />
        <div className="bg-amber-400" style={{ width: `${otherShare}%` }} />
        <div className="bg-red-500" style={{ width: `${rejectedShare}%` }} />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={["inline-block h-2 w-2 rounded-full", color].join(" ")} />
      <span>{label}</span>
    </div>
  )
}
