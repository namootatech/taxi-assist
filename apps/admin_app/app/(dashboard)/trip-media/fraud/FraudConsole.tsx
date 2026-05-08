"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  freezeRewardAction,
  setFraudSignalLevelAction,
  setFraudSignalStatusAction,
} from "@/lib/trip-media/server-actions"
import { StatusPill } from "@/components/trip-media/Surface"
import { PromptDialog } from "@/components/trip-media/PromptDialog"
import type { FraudCandidateRow, FraudLevel, FraudSignalRow, FraudStatus } from "@/lib/trip-media/fraud"
import { fraudRiskOptions } from "@/lib/trip-media/policy-constants"

const STATUS_FILTERS: Array<{ value: FraudStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "escalated", label: "Escalated" },
]

const LEVEL_FILTERS: Array<{ value: FraudLevel | "all"; label: string }> = [
  { value: "all", label: "All levels" },
  ...fraudRiskOptions.map((o) => ({ value: o.level, label: o.label })),
]

const levelTone = (level: FraudLevel) => {
  if (level === "critical") return "danger"
  if (level === "high") return "danger"
  if (level === "medium") return "warning"
  return "muted"
}

const statusTone = (status: FraudStatus) => {
  if (status === "open") return "warning"
  if (status === "investigating") return "warning"
  if (status === "resolved") return "success"
  if (status === "dismissed") return "muted"
  if (status === "escalated") return "danger"
  return "default"
}

export function FraudConsole({
  signals,
  candidates,
  selectedStatus,
  selectedLevel,
}: {
  signals: Array<FraudSignalRow>
  candidates: Array<FraudCandidateRow>
  selectedStatus: FraudStatus | "all"
  selectedLevel: FraudLevel | "all"
}) {
  const [activeId, setActiveId] = useState<string | null>(signals[0]?.id ?? null)
  const active = useMemo(
    () => signals.find((s) => s.id === activeId) ?? signals[0] ?? null,
    [signals, activeId],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide muted">Status</div>
        {STATUS_FILTERS.map((opt) => {
          const isActive = opt.value === selectedStatus
          const params = new URLSearchParams()
          params.set("status", opt.value)
          if (selectedLevel !== "all") params.set("level", selectedLevel)
          return (
            <a
              key={opt.value}
              href={`/trip-media/fraud?${params.toString()}`}
              className={[
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                isActive ? "border-[var(--brand-red)] bg-[var(--brand-red)]/5" : "border-token surface-1 hover:border-[var(--brand-red)]",
              ].join(" ")}
            >
              {opt.label}
            </a>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide muted">Level</div>
        {LEVEL_FILTERS.map((opt) => {
          const isActive = opt.value === selectedLevel
          const params = new URLSearchParams()
          params.set("level", opt.value)
          if (selectedStatus !== "all") params.set("status", selectedStatus)
          return (
            <a
              key={opt.value}
              href={`/trip-media/fraud?${params.toString()}`}
              className={[
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                isActive ? "border-[var(--brand-red)] bg-[var(--brand-red)]/5" : "border-token surface-1 hover:border-[var(--brand-red)]",
              ].join(" ")}
            >
              {opt.label}
            </a>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
            <div className="border-b border-token p-4">
              <div className="text-sm font-semibold tracking-tight">Signal queue</div>
              <div className="text-xs muted">Click a row to inspect evidence and take action.</div>
            </div>
            <div className="max-h-[60vh] divide-y divide-[color:var(--border)] overflow-y-auto">
              {signals.length === 0 ? (
                <div className="p-8 text-center text-sm muted">
                  No signals match this filter. Try widening the filter or look at the candidate list below.
                </div>
              ) : null}
              {signals.map((s) => {
                const isActive = s.id === active?.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={[
                      "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition",
                      isActive ? "bg-[var(--brand-red)]/5" : "hover:bg-black/5",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{s.kind}</div>
                      <div className="mt-1 truncate text-xs muted">{s.summary || "—"}</div>
                      <div className="mt-1 text-[11px] muted">{new Date(s.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusPill tone={levelTone(s.level)}>{s.level}</StatusPill>
                      <StatusPill tone={statusTone(s.status)}>{s.status}</StatusPill>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
            <div className="border-b border-token p-4">
              <div className="text-sm font-semibold tracking-tight">Auto-generated candidates</div>
              <div className="text-xs muted">Riders whose recent activity crossed the watch thresholds.</div>
            </div>
            {candidates.length === 0 ? (
              <div className="p-6 text-sm muted">No candidates right now. The thresholds live in Trip Media settings.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-token text-left text-xs muted">
                  <tr>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wide">Rider</th>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wide">Last hour</th>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wide">Rejected 24h</th>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wide">Credited 24h</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.riderId} className="border-b border-token last:border-b-0 align-top">
                      <td className="px-4 py-2 font-mono text-xs muted">{c.riderId.slice(0, 8)}</td>
                      <td className="px-4 py-2">{c.viewsLastHour}</td>
                      <td className="px-4 py-2">{c.rejectedLast24h}</td>
                      <td className="px-4 py-2">{c.creditedLast24h}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          {active ? (
            <FraudSignalDetail key={active.id} signal={active} />
          ) : (
            <div className="rounded-2xl border border-dashed border-token p-10 text-center text-sm muted">
              Pick a signal to triage.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FraudSignalDetail({ signal }: { signal: FraudSignalRow }) {
  const [pending, setPending] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [statusPrompt, setStatusPrompt] = useState<null | { label: string; status: FraudStatus }>(null)
  const [freezeOpen, setFreezeOpen] = useState(false)

  const runStatusChange = (label: string, status: FraudStatus, reason?: string) => {
    setPending(label)
    startTransition(async () => {
      const result = await setFraudSignalStatusAction({ signalId: signal.id, status, reason })
      setPending(null)
      if (result.ok) toast.success(label)
      else toast.error(result.error ?? "Action failed.")
    })
  }

  const setStatus = (label: string, status: FraudStatus) => {
    if (status === "open" || status === "investigating") {
      runStatusChange(label, status)
      return
    }
    setStatusPrompt({ label, status })
  }

  const setLevel = (level: FraudLevel) => {
    setPending(`Level ${level}`)
    startTransition(async () => {
      const result = await setFraudSignalLevelAction({ signalId: signal.id, level })
      setPending(null)
      if (result.ok) toast.success(`Level set to ${level}`)
      else toast.error(result.error ?? "Action failed.")
    })
  }

  const runFreeze = (reason: string) => {
    setFreezeOpen(false)
    if (!signal.adViewId) {
      toast.error("This signal is not tied to a specific ad view.")
      return
    }
    setPending("Freeze related reward")
    startTransition(async () => {
      const result = await freezeRewardAction({
        adViewId: signal.adViewId!,
        reason,
        fraudSignalId: signal.id,
      })
      setPending(null)
      if (result.ok) toast.success("Reward frozen")
      else toast.error(result.error ?? "Action failed.")
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
      <div className="border-b border-token p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight">{signal.kind}</div>
            <div className="text-xs muted">{new Date(signal.createdAt).toLocaleString()}</div>
          </div>
          <div className="flex gap-2">
            <StatusPill tone={levelTone(signal.level)}>{signal.level}</StatusPill>
            <StatusPill tone={statusTone(signal.status)}>{signal.status}</StatusPill>
          </div>
        </div>
        <p className="mt-3 text-sm">{signal.summary || "No description."}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        <Linked label="Rider" value={signal.riderId} />
        <Linked label="Trip" value={signal.tripId} />
        <Linked label="Ad view" value={signal.adViewId} />
        <Linked label="Campaign" value={signal.campaignId} href={signal.campaignId ? `/ads?status=ALL` : undefined} />
        <Linked label="Advertiser" value={signal.partnerId} href={signal.partnerId ? `/trip-media/advertisers/${signal.partnerId}` : undefined} />
        <Linked label="Owner admin" value={signal.ownerAdminId} />
      </div>

      {Object.keys(signal.evidence).length > 0 ? (
        <div className="border-t border-token p-4">
          <div className="text-xs font-semibold uppercase tracking-wide muted">Evidence</div>
          <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-token bg-[color:var(--surface-2)] p-3 text-[11px]">
            {JSON.stringify(signal.evidence, null, 2)}
          </pre>
        </div>
      ) : null}

      {signal.resolutionNote ? (
        <div className="border-t border-token p-4">
          <div className="text-xs font-semibold uppercase tracking-wide muted">Latest note</div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{signal.resolutionNote}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 border-t border-token p-4 md:grid-cols-3">
        <button
          type="button"
          disabled={pending !== null || signal.status === "investigating"}
          onClick={() => setStatus("Investigation started", "investigating")}
          className="h-10 rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === "Investigation started" ? "Saving…" : "Start investigation"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => setStatus("Resolved", "resolved")}
          className="h-10 rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Resolve
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => setStatus("Dismissed", "dismissed")}
          className="h-10 rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Dismiss
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => setStatus("Escalated", "escalated")}
          className="h-10 rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Escalate to Super Admin
        </button>
        <button
          type="button"
          disabled={pending !== null || !signal.adViewId}
          onClick={() => setFreezeOpen(true)}
          className="h-10 rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === "Freeze related reward" ? "Freezing…" : "Freeze related reward"}
        </button>
        <div className="col-span-2 md:col-span-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide muted">Set risk level</div>
          <div className="grid grid-cols-4 gap-2">
            {fraudRiskOptions.map((opt) => (
              <button
                key={opt.level}
                type="button"
                onClick={() => setLevel(opt.level)}
                disabled={pending !== null || signal.level === opt.level}
                className="rounded-lg border border-token px-2 py-1 text-xs font-semibold hover:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <PromptDialog
        open={statusPrompt !== null}
        title={statusPrompt ? statusPrompt.label : ""}
        description="The note is saved to the audit trail and visible to the team."
        label="Closing note"
        placeholder="What was the conclusion?"
        submitLabel={statusPrompt ? statusPrompt.label : "Save"}
        destructive={statusPrompt?.status === "escalated"}
        onClose={() => setStatusPrompt(null)}
        onSubmit={async (reason) => {
          const next = statusPrompt
          setStatusPrompt(null)
          if (!next) return
          runStatusChange(next.label, next.status, reason)
        }}
      />

      <PromptDialog
        open={freezeOpen}
        title="Freeze related reward"
        description="The hold pauses the reward while the case is open. The rider's wallet is not changed yet."
        label="Why freeze it?"
        placeholder="Short reason — saved to the audit trail"
        submitLabel="Freeze reward"
        onClose={() => setFreezeOpen(false)}
        onSubmit={async (reason) => runFreeze(reason)}
      />
    </div>
  )
}

function Linked({ label, value, href }: { label: string; value: string | null; href?: string }) {
  if (!value) {
    return (
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide muted">{label}</div>
        <div className="mt-1 text-sm muted">—</div>
      </div>
    )
  }
  const display = value.length > 8 ? value.slice(0, 8) : value
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide muted">{label}</div>
      <div className="mt-1 font-mono text-xs">
        {href ? (
          <Link href={href} className="text-[var(--brand-red)] hover:underline">
            {display}
          </Link>
        ) : (
          display
        )}
      </div>
    </div>
  )
}
