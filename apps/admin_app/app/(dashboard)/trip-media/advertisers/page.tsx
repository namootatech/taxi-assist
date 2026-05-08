import Link from "next/link"
import { PageHeader, StatusPill } from "@/components/trip-media/Surface"
import { formatDateTime, formatNumber } from "@/lib/trip-media/format"
import { loadPartnerList } from "@/lib/trip-media/advertisers"

export const dynamic = "force-dynamic"

const statusTone = (status: string) => {
  if (status === "active") return "success"
  if (status === "suspended") return "warning"
  if (status === "closed") return "danger"
  return "muted"
}

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "closed", label: "Closed" },
]

export default async function AdvertisersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const selected = status?.trim() ?? "all"
  const advertisers = await loadPartnerList({ status: selected, query: q })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advertisers"
        description="Every workspace running on Trip Media. Open one to see members, billing, creatives, campaigns, and the team's audit trail."
      />

      <form className="flex flex-wrap gap-2" action="/trip-media/advertisers" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search advertisers"
          className="h-10 w-full max-w-xs rounded-lg border border-token bg-transparent px-3 text-sm"
        />
        <input type="hidden" name="status" value={selected} />
        <button
          type="submit"
          className="h-10 rounded-lg border border-token surface-1 px-3 text-sm font-semibold hover:border-[var(--brand-red)]"
        >
          Search
        </button>
      </form>

      <nav className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((opt) => {
          const isActive = opt.value === selected
          const href = `/trip-media/advertisers?status=${opt.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
          return (
            <a
              key={opt.value}
              href={href}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-[var(--brand-red)] bg-[var(--brand-red)]/5"
                  : "border-token surface-1 hover:border-[var(--brand-red)]",
              ].join(" ")}
            >
              {opt.label}
            </a>
          )
        })}
      </nav>

      <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
        <table className="w-full text-sm">
          <thead className="border-b border-token bg-[color:var(--surface-2)] text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Advertiser</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Members</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Campaigns</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Joined</th>
            </tr>
          </thead>
          <tbody>
            {advertisers.map((p) => (
              <tr key={p.id} className="border-b border-token transition hover:bg-black/5">
                <td className="px-4 py-3">
                  <Link href={`/trip-media/advertisers/${p.id}`} className="block">
                    <div className="font-semibold">{p.name}</div>
                    <div className="mt-1 text-xs muted">{p.legalName ?? "—"}</div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={statusTone(p.status)}>{p.status}</StatusPill>
                </td>
                <td className="px-4 py-3">{formatNumber(p.memberCount)}</td>
                <td className="px-4 py-3">{formatNumber(p.campaignCount)}</td>
                <td className="px-4 py-3 text-xs muted">{formatDateTime(p.createdAt)}</td>
              </tr>
            ))}
            {advertisers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm muted">
                  No advertisers matched.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
