import Link from "next/link"
import { notFound } from "next/navigation"
import { EmptyState, PageHeader, Panel, StatusPill } from "@/components/trip-media/Surface"
import { formatDateTime, formatNumber, formatRelativeFromNow } from "@/lib/trip-media/format"
import {
  loadPartnerAuditTail,
  loadPartnerBillingEvents,
  loadPartnerCreatives,
  loadPartnerMembers,
  loadPartnerOverview,
  loadPartnerSubscriptions,
} from "@/lib/trip-media/advertisers"
import { AdvertiserActions } from "./AdvertiserActions"

export const dynamic = "force-dynamic"

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "members", label: "Members" },
  { value: "subscription", label: "Subscription" },
  { value: "billing", label: "Billing events" },
  { value: "creatives", label: "Creatives" },
  { value: "campaigns", label: "Campaigns" },
  { value: "audit", label: "Audit" },
]

const statusTone = (status: string) => {
  if (status === "active" || status === "approved" || status === "ACTIVE") return "success"
  if (status === "suspended" || status === "PAUSED" || status === "PENDING_REVIEW" || status === "pending_review") return "warning"
  if (status === "closed" || status === "rejected" || status === "REJECTED" || status === "FORCE_STOPPED") return "danger"
  return "muted"
}

export default async function AdvertiserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab = TABS.find((t) => t.value === tab)?.value ?? "overview"

  const overview = await loadPartnerOverview(id)
  if (!overview) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={overview.name}
        description={overview.legalName ?? "Trip Media advertiser"}
        actions={
          <>
            <Link className="rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold hover:border-[var(--brand-red)]" href="/trip-media/advertisers">
              Back to list
            </Link>
            <Link className="rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white hover:brightness-95" href={`/ads?partner=${id}`}>
              Their campaigns
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <StatusPill tone={statusTone(overview.status)}>{overview.status}</StatusPill>
        <StatusPill tone="muted">{overview.billingCountry}</StatusPill>
        <StatusPill tone="muted">{overview.billingCurrency}</StatusPill>
        {overview.billingProvider ? <StatusPill tone="muted">{overview.billingProvider}</StatusPill> : null}
        <StatusPill tone="muted">{formatNumber(overview.promotionalCreditsBalance)} credits</StatusPill>
        <StatusPill tone="muted">Joined {formatDateTime(overview.createdAt)}</StatusPill>
      </div>

      <AdvertiserActions
        partnerId={id}
        status={overview.status}
        promotionalCreditsBalance={overview.promotionalCreditsBalance}
      />

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const isActive = t.value === activeTab
          const href = t.value === "overview" ? `/trip-media/advertisers/${id}` : `/trip-media/advertisers/${id}?tab=${t.value}`
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

      {activeTab === "overview" ? <OverviewTab overview={overview} /> : null}
      {activeTab === "members" ? await renderMembersTab(id) : null}
      {activeTab === "subscription" ? await renderSubscriptionTab(id) : null}
      {activeTab === "billing" ? await renderBillingTab(id) : null}
      {activeTab === "creatives" ? await renderCreativesTab(id) : null}
      {activeTab === "campaigns" ? <CampaignsTab partnerId={id} /> : null}
      {activeTab === "audit" ? await renderAuditTab(id) : null}
    </div>
  )
}

function OverviewTab({ overview }: { overview: Awaited<ReturnType<typeof loadPartnerOverview>> }) {
  if (!overview) return null
  return (
    <Panel title="Workspace details" subtitle="Basic info captured during onboarding.">
      <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide muted">Display name</dt>
          <dd className="mt-1">{overview.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide muted">Legal name</dt>
          <dd className="mt-1">{overview.legalName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide muted">Registration</dt>
          <dd className="mt-1">{overview.registrationNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide muted">Trial ends</dt>
          <dd className="mt-1">{overview.trialEndsAt ? formatDateTime(overview.trialEndsAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide muted">Promotional credits</dt>
          <dd className="mt-1">{formatNumber(overview.promotionalCreditsBalance)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide muted">Workspace ID</dt>
          <dd className="mt-1 font-mono text-xs muted">{overview.id}</dd>
        </div>
      </dl>
    </Panel>
  )
}

async function renderMembersTab(partnerId: string) {
  const members = await loadPartnerMembers(partnerId)
  return (
    <Panel title="Members" subtitle="Workspace seats. Owners and admins can invite more.">
      {members.length === 0 ? (
        <EmptyState title="No members yet" description="The workspace owner will appear here after the first sign-in." />
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-token text-left">
            <tr>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Email</th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Role</th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Joined</th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Invited</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-token last:border-b-0">
                <td className="py-2">{m.email ?? "—"}</td>
                <td className="py-2 capitalize">{m.role}</td>
                <td className="py-2">{m.joinedAt ? formatDateTime(m.joinedAt) : "Pending"}</td>
                <td className="py-2 text-xs muted">{formatDateTime(m.invitedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

async function renderSubscriptionTab(partnerId: string) {
  const subs = await loadPartnerSubscriptions(partnerId)
  return (
    <Panel title="Subscriptions" subtitle="Current and historical plans linked to this advertiser.">
      {subs.length === 0 ? (
        <EmptyState title="No subscription yet" description="Plans will appear once billing is configured." />
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-token text-left">
            <tr>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Package</th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Provider</th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Status</th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Period</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-b border-token last:border-b-0">
                <td className="py-2">{s.packageName ?? s.packageSlug ?? "—"}</td>
                <td className="py-2">{s.provider}</td>
                <td className="py-2">{s.status}</td>
                <td className="py-2 text-xs muted">
                  {s.currentPeriodStart ? formatDateTime(s.currentPeriodStart) : "—"} →{" "}
                  {s.currentPeriodEnd ? formatDateTime(s.currentPeriodEnd) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

async function renderBillingTab(partnerId: string) {
  const events = await loadPartnerBillingEvents(partnerId)
  return (
    <Panel title="Billing events" subtitle="Webhook events as they were processed.">
      {events.length === 0 ? (
        <EmptyState title="No events yet" description="Charges and renewals will appear here once a plan is active." />
      ) : (
        <ul className="divide-y divide-[color:var(--border)]">
          {events.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-semibold">{e.type}</div>
                <div className="text-xs muted">{e.provider}</div>
              </div>
              <div className="text-xs muted">{formatRelativeFromNow(e.processedAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

async function renderCreativesTab(partnerId: string) {
  const creatives = await loadPartnerCreatives(partnerId)
  return (
    <Panel title="Creatives" subtitle="Every creative this advertiser has uploaded." href={`/creatives?status=pending_review`} hrefLabel="Open queue">
      {creatives.length === 0 ? (
        <EmptyState title="No creatives yet" description="They'll show up here once the advertiser uploads one." />
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-token text-left">
            <tr>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Title</th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Category</th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Status</th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide muted">Created</th>
            </tr>
          </thead>
          <tbody>
            {creatives.map((c) => (
              <tr key={c.id} className="border-b border-token last:border-b-0">
                <td className="py-2 font-semibold">{c.title}</td>
                <td className="py-2">{c.category ?? "—"}</td>
                <td className="py-2">
                  <StatusPill tone={statusTone(c.status)}>{c.status.replace(/_/g, " ")}</StatusPill>
                </td>
                <td className="py-2 text-xs muted">{formatDateTime(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

function CampaignsTab({ partnerId }: { partnerId: string }) {
  return (
    <Panel
      title="Campaigns"
      subtitle="Filter the main campaign console down to this advertiser."
      href={`/ads?partner=${partnerId}`}
      hrefLabel="Open campaigns"
    >
      <p className="text-sm muted">
        Campaigns and per-campaign actions live in the main ad campaign console. Click "Open campaigns" to filter down.
      </p>
    </Panel>
  )
}

async function renderAuditTab(partnerId: string) {
  const entries = await loadPartnerAuditTail(partnerId)
  return (
    <Panel title="Audit trail" subtitle="Admin actions affecting this advertiser." href="/audit" hrefLabel="Open full audit">
      {entries.length === 0 ? (
        <EmptyState title="No actions yet" description="Suspensions, credit adjustments, and creative decisions show up here." />
      ) : (
        <ul className="divide-y divide-[color:var(--border)]">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-semibold">{entry.action}</div>
                <div className="text-xs muted">{entry.actorRole ?? "—"} • {formatDateTime(entry.createdAt)}</div>
                {entry.reason ? <div className="mt-1 text-xs muted">“{entry.reason}”</div> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
