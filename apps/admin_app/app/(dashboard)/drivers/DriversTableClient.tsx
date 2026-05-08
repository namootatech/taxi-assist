"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type DriverRow = {
  id: string;
  full_name: string | null;
  cellphone: string | null;
  status: string | null;
  online_status: string | null;
  current_vehicle_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const tabs: Array<{ key: "approved" | "pending" | "rejected"; label: string; statuses: Array<string> }> = [
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "pending", label: "Pending", statuses: ["pending"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
];

function StatusPill({ value }: { value: string | null }) {
  const v = (value ?? "—").toLowerCase();
  const cls =
    v === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : v === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : v === "rejected"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-token bg-black/3 text-[color:var(--muted)]";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{v}</span>;
}

function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  requireReason,
  initialReason = "",
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  requireReason?: boolean;
  initialReason?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(initialReason);
  if (!open) return null;

  const trimmed = reason.trim();
  const canConfirm = requireReason ? !!trimmed : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-token surface-1 p-5 shadow-[var(--shadow)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold tracking-tight">{title}</div>
        {description ? <div className="mt-2 text-sm muted">{description}</div> : null}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide muted">Reason</div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={requireReason ? "Reason (required)..." : "Reason (optional)..."}
            className="min-h-[96px] w-full resize-none rounded-lg border border-token bg-transparent px-3 py-2 text-sm"
          />
          {requireReason && !trimmed ? (
            <div className="text-xs text-[var(--brand-red)]">Reason is required.</div>
          ) : null}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="h-9 rounded-lg border border-token px-3 text-sm font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            className={[
              "h-9 rounded-lg px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60",
              destructive ? "bg-[var(--brand-red)] hover:brightness-95" : "bg-[var(--brand-navy-900)] hover:brightness-110",
            ].join(" ")}
            onClick={() => {
              if (!canConfirm) return;
              onOpenChange(false);
              onConfirm(trimmed);
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DriversTableClient({ rows }: { rows: Array<DriverRow> }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("approved");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<null | { driverId: string; nextStatus: string }>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const t = tabs.find((x) => x.key === tab);
    const allowed = new Set(t?.statuses ?? []);
    const q = query.trim().toLowerCase();

    return rows.filter((r) => {
      const status = (r.status ?? "").toLowerCase();
      const inTab = allowed.size ? allowed.has(status) : true;
      if (!inTab) return false;
      if (!q) return true;
      const hay = `${r.full_name ?? ""} ${r.cellphone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, tab, query]);

  async function setDriverStatus(driverId: string, nextStatus: string, reason: string) {
    const supabase = createSupabaseBrowserClient();
    const now = new Date().toISOString();
    const patch =
      nextStatus === "REJECTED"
        ? { status: nextStatus, rejection_reason: reason, rejected_at: now, approved_at: null }
        : { status: nextStatus, rejection_reason: null, rejected_at: null, approved_at: now };

    const { error } = await supabase.from("profiles").update(patch).eq("id", driverId);
    if (error) throw error;

    await supabase.rpc("admin_audit_log", {
      p_action: "driver.status.update",
      p_entity_type: "profiles",
      p_entity_id: driverId,
      p_reason: reason || `Set status → ${nextStatus}`,
      p_metadata: { nextStatus, reason: reason || null },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Drivers</h1>
          <p className="mt-1 text-sm muted">
            Review onboarding, verification readiness, and driver performance—without exposing raw IDs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone…"
            className="h-10 w-full rounded-lg border border-token bg-transparent px-3 text-sm md:w-72"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
              tab === t.key
                ? "border-[var(--brand-red)] bg-[var(--brand-red)] text-white"
                : "border-token surface-1 text-[color:var(--muted)] hover:border-[var(--brand-red)] hover:text-[color:var(--foreground)]",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
        <div className="text-xs muted">{filtered.length.toLocaleString()} shown</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface-1)]">
              <tr className="border-b border-token">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide muted">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide muted">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide muted">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide muted">Online</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide muted">Vehicle</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-token hover:bg-black/3">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.full_name ?? "Unnamed driver"}</div>
                    <div className="text-xs muted">
                      Updated {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.cellphone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill value={r.status} />
                  </td>
                  <td className="px-4 py-3">{r.online_status ?? "—"}</td>
                  <td className="px-4 py-3">{r.current_vehicle_id ? <span className="text-xs muted">Assigned</span> : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/drivers/${r.id}`}
                        className="rounded-lg border border-token px-3 py-1.5 text-sm font-semibold hover:border-[var(--brand-red)]"
                      >
                        View
                      </Link>
                      {tab === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="rounded-lg bg-[var(--brand-navy-900)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
                            disabled={isPending}
                            onClick={() => setConfirm({ driverId: r.id, nextStatus: "APPROVED" })}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-[var(--brand-red)] px-3 py-1.5 text-sm font-semibold text-[var(--brand-red)] hover:bg-[var(--brand-red)] hover:text-white"
                            disabled={isPending}
                            onClick={() => setConfirm({ driverId: r.id, nextStatus: "REJECTED" })}
                          >
                            Decline
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm muted" colSpan={6}>
                    No drivers found for this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <ReasonDialog
        open={!!confirm}
        title={confirm?.nextStatus === "REJECTED" ? "Reject driver application" : "Approve driver application"}
        description={
          confirm
            ? `This will update the driver account status to “${confirm.nextStatus}”, store the reason, and write an audit log.`
            : undefined
        }
        confirmLabel={confirm?.nextStatus === "REJECTED" ? "Reject" : "Approve"}
        destructive={confirm?.nextStatus === "REJECTED"}
        requireReason={confirm?.nextStatus === "REJECTED"}
        onOpenChange={(v) => (v ? null : setConfirm(null))}
        onConfirm={(reason) => {
          if (!confirm) return;
          const { driverId, nextStatus } = confirm;
          startTransition(async () => {
            try {
              await setDriverStatus(driverId, nextStatus, reason);
              toast.success("Driver updated");
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to update driver");
            }
          });
        }}
      />
    </div>
  );
}

