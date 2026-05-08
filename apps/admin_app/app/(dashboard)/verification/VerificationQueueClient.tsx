"use client";

import { useMemo, useState } from "react";

type DocRow = {
  document_id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  status: string;
  created_at: string;
  expiry_date: string | null;
  signedUrl: string | null;
};

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function VerificationQueueClient({
  rows,
  effectiveStatus,
  reviewAction,
}: {
  rows: Array<DocRow>;
  effectiveStatus: string;
  reviewAction: (formData: FormData) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(() => rows[0]?.document_id ?? "");
  const [query, setQuery] = useState("");
  const [expiryOnly, setExpiryOnly] = useState(false);

  const selected = useMemo(() => rows.find((r) => r.document_id === selectedId) ?? null, [rows, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (expiryOnly) {
        const d = daysUntil(r.expiry_date);
        if (d === null || d > 14) return false;
      }
      if (!q) return true;
      const hay = `${r.document_type} ${r.entity_type}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, expiryOnly]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Verification</h1>
          <p className="mt-1 text-sm muted">
            Review documents with clear reasons and audit context. Preview opens in a secure, time-limited window.
          </p>
        </div>
        <div className="text-xs muted">
          {effectiveStatus} • {rows.length} items
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by type…"
            className="h-10 w-full rounded-lg border border-token bg-transparent px-3 text-sm md:w-64"
          />
          <label className="inline-flex items-center gap-2 rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={expiryOnly}
              onChange={(e) => setExpiryOnly(e.target.checked)}
            />
            Expiry ≤ 14d
          </label>
        </div>
        <div className="text-xs muted">{filtered.length.toLocaleString()} shown</div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[420px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
          <div className="border-b border-token p-4">
            <div className="text-sm font-semibold tracking-tight">Queue</div>
            <div className="text-xs muted">Select an item to review</div>
          </div>
          <div className="max-h-[560px] overflow-auto p-2">
            {filtered.map((r) => {
              const selected = r.document_id === selectedId;
              const d = daysUntil(r.expiry_date);
              return (
                <button
                  key={r.document_id}
                  type="button"
                  onClick={() => setSelectedId(r.document_id)}
                  className={[
                    "w-full rounded-xl border px-3 py-3 text-left transition",
                    selected ? "border-[var(--brand-red)] bg-[var(--brand-red)]/5" : "border-token hover:bg-black/3",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{r.document_type}</div>
                      <div className="mt-1 text-xs muted">
                        {r.entity_type} • created {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {typeof d === "number" ? (
                      <div className="shrink-0 rounded-full border border-token bg-black/3 px-2 py-0.5 text-[11px] font-semibold">
                        {d <= 0 ? "expired" : `${d}d`}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {!filtered.length ? <div className="px-3 py-10 text-center text-sm muted">No items.</div> : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
          <div className="border-b border-token p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight">
                  {selected ? selected.document_type : "Select a document"}
                </div>
                <div className="mt-1 text-xs muted">
                  {selected ? `${selected.entity_type} • ID ending ${selected.entity_id.slice(-6)}` : "Preview and decide"}
                </div>
              </div>
              {selected?.signedUrl ? (
                <a
                  href={selected.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg border border-token px-3 py-2 text-sm font-semibold hover:border-[var(--brand-red)]"
                >
                  Open
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-[1fr_360px]">
            <div className="min-h-[420px] overflow-hidden rounded-xl border border-token bg-black/2">
              {selected?.signedUrl ? (
                // Most common doc types render fine via browser PDF/image preview.
                <iframe title="Document preview" src={selected.signedUrl} className="h-[520px] w-full" />
              ) : (
                <div className="grid h-[520px] place-items-center text-sm muted">No preview available.</div>
              )}
            </div>

            <div className="rounded-xl border border-token p-4">
              <div className="text-sm font-semibold tracking-tight">Decision</div>
              <div className="mt-1 text-xs muted">Reason is required and will be audited.</div>

              <form action={reviewAction} className="mt-4 space-y-3">
                <input type="hidden" name="document_id" value={selected?.document_id ?? ""} />
                <input
                  name="reason"
                  placeholder="Reason (required)…"
                  className="h-10 w-full rounded-lg border border-token bg-transparent px-3 text-sm"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    name="decision"
                    value="DECLINED"
                    className="h-10 rounded-lg border border-[var(--brand-red)] text-sm font-semibold text-[var(--brand-red)] hover:bg-[var(--brand-red)] hover:text-white"
                  >
                    Decline
                  </button>
                  <button
                    name="decision"
                    value="APPROVED"
                    className="h-10 rounded-lg bg-[var(--brand-navy-900)] text-sm font-semibold text-white hover:brightness-110"
                  >
                    Approve
                  </button>
                </div>
                <div className="text-xs muted">
                  Tip: use specific reasons (e.g. “photo blurry”, “name mismatch”, “expired doc”).
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

