import { EmptyState, PageHeader, Panel, StatusPill } from "@/components/trip-media/Surface"
import { formatDateTime, formatNumber } from "@/lib/trip-media/format"
import { loadRecentReportRuns, REPORT_DEFINITIONS } from "@/lib/trip-media/reports"

export const dynamic = "force-dynamic"

const tone = (status: string) => {
  if (status === "completed") return "success"
  if (status === "running") return "warning"
  if (status === "failed") return "danger"
  return "muted"
}

export default async function ReportsPage() {
  const recent = await loadRecentReportRuns()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Pre-built CSV exports for finance, compliance, and weekly reviews. Every download is audited."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {REPORT_DEFINITIONS.map((report) => (
          <div key={report.kind} className="rounded-2xl border border-token surface-1 p-5 shadow-[var(--shadow)]">
            <div className="text-sm font-semibold tracking-tight">{report.title}</div>
            <p className="mt-2 text-sm muted">{report.description}</p>
            <p className="mt-1 text-xs muted">{report.scope}</p>
            <a
              href={`/api/trip-media/reports/${report.kind}`}
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:brightness-95"
            >
              Download CSV
            </a>
          </div>
        ))}
      </div>

      <Panel
        title="Recent runs"
        subtitle="A trail of recent report downloads. Audited so you can see who pulled what."
      >
        {recent.length === 0 ? (
          <EmptyState title="No runs yet" description="Run a report above and the trail will appear here." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-token text-left text-xs muted">
              <tr>
                <th className="py-2 font-semibold uppercase tracking-wide">When</th>
                <th className="py-2 font-semibold uppercase tracking-wide">Report</th>
                <th className="py-2 font-semibold uppercase tracking-wide">Status</th>
                <th className="py-2 font-semibold uppercase tracking-wide">Rows</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((run) => (
                <tr key={run.id} className="border-b border-token last:border-b-0">
                  <td className="py-2">{formatDateTime(run.startedAt)}</td>
                  <td className="py-2">{run.kind}</td>
                  <td className="py-2">
                    <StatusPill tone={tone(run.status)}>{run.status}</StatusPill>
                  </td>
                  <td className="py-2">{run.rowCount != null ? formatNumber(run.rowCount) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
