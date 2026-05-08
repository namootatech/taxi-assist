import { EmptyState, PageHeader, Panel, StatusPill } from "@/components/trip-media/Surface"
import {
  formatCentsAsZAR,
  formatCurrencyZAR,
  formatDateTime,
  formatRelativeFromNow,
} from "@/lib/trip-media/format"
import {
  loadAdRewardWalletTrails,
  loadRecentRewards,
  loadRewardHolds,
} from "@/lib/trip-media/rewards"
import { RewardActionButtons } from "./RewardActions"

export const dynamic = "force-dynamic"

const TABS = [
  { value: "recent", label: "Recent rewards" },
  { value: "holds", label: "Holds & reversals" },
  { value: "wallets", label: "Wallet trails" },
]

const stateTone = (state: string) => {
  if (state === "CREDITED") return "success"
  if (state === "REJECTED") return "danger"
  if (state === "RATED" || state === "WATCHED") return "warning"
  return "muted"
}

const holdTone = (status: string) => {
  if (status === "held") return "warning"
  if (status === "reversed") return "danger"
  if (status === "released") return "success"
  return "muted"
}

export default async function RiderRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = TABS.find((t) => t.value === tab)?.value ?? "recent"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rider rewards"
        description="Track which rewards were credited, which are held, and step in when something looks off."
      />

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const isActive = t.value === activeTab
          const href = t.value === "recent" ? "/trip-media/rider-rewards" : `/trip-media/rider-rewards?tab=${t.value}`
          return (
            <a
              key={t.value}
              href={href}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                isActive ? "border-[var(--brand-red)] bg-[var(--brand-red)]/5" : "border-token surface-1 hover:border-[var(--brand-red)]",
              ].join(" ")}
            >
              {t.label}
            </a>
          )
        })}
      </nav>

      {activeTab === "recent" ? await renderRecentTab() : null}
      {activeTab === "holds" ? await renderHoldsTab() : null}
      {activeTab === "wallets" ? await renderWalletsTab() : null}
    </div>
  )
}

async function renderRecentTab() {
  const rewards = await loadRecentRewards(100)
  return (
    <Panel
      title="Recent rewards"
      subtitle="Latest 100 ad views, with state and rider feedback. Freeze stops a pending credit; reverse pulls a credited reward back."
    >
      {rewards.length === 0 ? (
        <EmptyState
          title="No reward activity yet"
          description="Once riders start completing ads, the most recent rewards will show up here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-token text-left">
              <tr>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">When</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Campaign</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">State</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Rider</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Reward</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Feedback</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.adViewId} className="border-b border-token last:border-b-0 align-top">
                  <td className="py-2 text-xs muted">{formatRelativeFromNow(r.createdAt)}</td>
                  <td className="py-2">
                    <div className="font-semibold">{r.campaignAdvertiser ?? "—"}</div>
                    <div className="text-[11px] muted">{r.campaignId.slice(0, 8)}</div>
                  </td>
                  <td className="py-2">
                    <StatusPill tone={stateTone(r.state)}>{r.state.toLowerCase()}</StatusPill>
                  </td>
                  <td className="py-2 font-mono text-[11px] muted">{r.riderId?.slice(0, 8) ?? "—"}</td>
                  <td className="py-2">{formatCurrencyZAR(r.rewardPerView)}</td>
                  <td className="py-2 text-xs muted">
                    {r.rating ? `★ ${r.rating}` : "—"}
                    {r.comment ? <div className="mt-1 max-w-xs truncate">{r.comment}</div> : null}
                  </td>
                  <td className="py-2">
                    <RewardActionButtons adViewId={r.adViewId} hasRewardCredited={r.state === "CREDITED"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

async function renderHoldsTab() {
  const holds = await loadRewardHolds(100)
  return (
    <Panel
      title="Holds & reversals"
      subtitle="A persistent record of every freeze and reversal. The audit log keeps the actor and reason."
    >
      {holds.length === 0 ? (
        <EmptyState title="Nothing held or reversed" description="Freezes and reversals will appear here as the team takes action." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-token text-left">
              <tr>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">When</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Status</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Rider</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Amount</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Reason</th>
              </tr>
            </thead>
            <tbody>
              {holds.map((h) => (
                <tr key={h.id} className="border-b border-token last:border-b-0 align-top">
                  <td className="py-2 text-xs muted">{formatDateTime(h.createdAt)}</td>
                  <td className="py-2">
                    <StatusPill tone={holdTone(h.status)}>{h.status}</StatusPill>
                  </td>
                  <td className="py-2 font-mono text-[11px] muted">{h.riderId?.slice(0, 8) ?? "—"}</td>
                  <td className="py-2">{formatCentsAsZAR(h.amountCents)}</td>
                  <td className="py-2 text-xs muted">{h.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

async function renderWalletsTab() {
  const trails = await loadAdRewardWalletTrails(100)
  return (
    <Panel
      title="Wallet trails"
      subtitle="Ad reward credits and reversal debits, sourced from the wallet ledger."
    >
      {trails.length === 0 ? (
        <EmptyState title="No wallet entries" description="Once rewards start flowing through the ledger, they will show up here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-token text-left">
              <tr>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">When</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Type</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Direction</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Amount</th>
                <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Reference</th>
              </tr>
            </thead>
            <tbody>
              {trails.map((tx) => (
                <tr key={tx.txId} className="border-b border-token last:border-b-0 align-top">
                  <td className="py-2 text-xs muted">{formatDateTime(tx.createdAt)}</td>
                  <td className="py-2">{tx.type}</td>
                  <td className="py-2">
                    <StatusPill tone={tx.direction === "CREDIT" ? "success" : "danger"}>{tx.direction}</StatusPill>
                  </td>
                  <td className="py-2">{formatCurrencyZAR(tx.amount)}</td>
                  <td className="py-2 font-mono text-[11px] muted">{tx.reference?.slice(0, 8) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
