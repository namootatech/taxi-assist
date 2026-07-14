"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  cellphone: string | null;
  email: string | null;
  id_number: string | null;
  dob: string | null;
  sex: string | null;
  residential_address: string | null;
  license_number: string | null;
  license_code: string | null;
  pdp_number: string | null;
  pdp_expiry: string | null;
  bank_details: unknown | null;
  selfie_url: string | null;
  status: string | null;
  online_status: string | null;
  training_completed: boolean | null;
  registration_submitted: boolean | null;
  current_vehicle_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type VehicleRow = {
  vehicle_id: string;
  linked_driver_id: string | null;
  registration_number: string | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  category: string | null;
  vin: string | null;
  speedometer_reading: number | null;
  owner_type: string | null;
  owner_details: unknown | null;
  company_details: unknown | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

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

type DriverVerificationCase = {
  driver_id: string;
  driver: ProfileRow | null;
  vehicles: Array<VehicleRow>;
  driverDocs: Array<DocRow>;
  vehicleDocsByVehicleId: Record<string, Array<DocRow>>;
  stats: {
    totalDocs: number;
    expiringSoonDocs: number;
    oldestCreatedAt: string | null;
  };
};

function normalizeStatusFilter(status: string) {
  const s = status.trim();
  if (!s) return "PENDING";
  return s.toUpperCase();
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function shortId(id: string) {
  if (!id) return "—";
  return id.length <= 8 ? id : `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function driverLabel(driver: ProfileRow | null, driverId: string) {
  const name = driver?.full_name?.trim();
  if (name) return name;
  return `Driver ${shortId(driverId)}`;
}

function vehicleLabel(v: VehicleRow) {
  const reg = v.registration_number?.trim();
  const makeModel = `${v.make ?? ""} ${v.model ?? ""}`.trim();
  if (reg && makeModel) return `${reg} • ${makeModel}`;
  return reg || makeModel || `Vehicle ${shortId(v.vehicle_id)}`;
}

function flattenDocs(c: DriverVerificationCase) {
  return [...c.driverDocs, ...Object.values(c.vehicleDocsByVehicleId).flat()];
}

function safeObj(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function maskAccountNumber(raw: unknown) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  const last4 = s.slice(-4);
  return `•••• ${last4}`;
}

function firstDocId(c: DriverVerificationCase | null) {
  if (!c) return "";
  const docs = flattenDocs(c);
  const pending = docs.find((d) => d.status === "PENDING");
  return pending?.document_id ?? docs[0]?.document_id ?? "";
}

function isExpiringSoon(doc: DocRow) {
  const d = daysUntil(doc.expiry_date);
  return typeof d === "number" && d >= 0 && d <= 14;
}

function buildFormData(docId: string, decision: "APPROVED" | "DECLINED", reason: string) {
  const fd = new FormData();
  fd.set("document_id", docId);
  fd.set("decision", decision);
  fd.set("reason", reason);
  return fd;
}

function StatusChip({ label, tone }: { label: string; tone: "muted" | "danger" | "warn" | "ok" }) {
  const cls =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-token bg-black/3 text-[color:var(--muted)]";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function FullscreenModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = window.setTimeout(() => {
      shellRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      lastFocusedRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={() => onClose()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
      tabIndex={-1}
      ref={shellRef}
    >
      <div className="absolute inset-0 p-2 sm:p-4" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
          <div className="flex items-start justify-between gap-3 border-b border-token bg-[var(--surface-1)] p-4">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold tracking-tight">{title}</div>
              {subtitle ? <div className="mt-1 truncate text-xs muted">{subtitle}</div> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-token px-3 py-2 text-sm font-semibold hover:border-[var(--brand-red)]"
              aria-label="Close modal"
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function VerificationQueueClient({
  cases,
  effectiveStatus,
  reviewAction,
  approveDriverAction,
  decideVehicleAction,
  initialDriverId,
}: {
  cases: Array<DriverVerificationCase>;
  effectiveStatus: string;
  reviewAction: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  approveDriverAction: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  decideVehicleAction: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  initialDriverId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const normalizedStatus = normalizeStatusFilter(effectiveStatus);

  const initialCase =
    (initialDriverId ? cases.find((c) => c.driver_id === initialDriverId) ?? null : null) ?? cases[0] ?? null;
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => initialCase?.driver_id ?? "");
  const [open, setOpen] = useState(() => !!initialDriverId && !!initialCase);
  const [query, setQuery] = useState("");
  const [expiryOnly, setExpiryOnly] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>(() => firstDocId(initialCase));
  const [approveReason, setApproveReason] = useState("");
  const [vehicleReasons, setVehicleReasons] = useState<Record<string, string>>({});

  const selectedCase = useMemo(
    () => cases.find((c) => c.driver_id === selectedDriverId) ?? null,
    [cases, selectedDriverId],
  );

  const selectedDoc = useMemo(() => {
    if (!selectedCase) return null;
    return flattenDocs(selectedCase).find((d) => d.document_id === selectedDocId) ?? null;
  }, [selectedCase, selectedDocId]);

  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      const docsInScope = flattenDocs(c).filter((d) => d.status === normalizedStatus);
      if (!docsInScope.length) return false;

      if (expiryOnly) {
        const hasExpiringSoon = docsInScope.some((d) => isExpiringSoon(d));
        if (!hasExpiringSoon) return false;
      }
      if (!q) return true;
      const driver = c.driver;
      const driverHay = `${driver?.full_name ?? ""} ${driver?.cellphone ?? ""} ${driver?.email ?? ""} ${driver?.id_number ?? ""}`.toLowerCase();
      const vehiclesHay = c.vehicles
        .map((v) => `${v.registration_number ?? ""} ${v.make ?? ""} ${v.model ?? ""} ${v.vin ?? ""}`.toLowerCase())
        .join(" ");
      const docsHay = docsInScope.map((d) => `${d.document_type} ${d.entity_type}`.toLowerCase()).join(" ");
      return `${driverHay} ${vehiclesHay} ${docsHay}`.includes(q);
    });
  }, [cases, query, expiryOnly, normalizedStatus]);

  function handleOpenCase(driverId: string) {
    setSelectedDriverId(driverId);
    const c = cases.find((x) => x.driver_id === driverId) ?? null;
    setSelectedDocId(firstDocId(c));
    setOpen(true);
  }

  async function handleReview(docId: string, decision: "APPROVED" | "DECLINED", reason: string) {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Reason is required");
      return;
    }

    startTransition(async () => {
      const res = await reviewAction(buildFormData(docId, decision, trimmed));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(decision === "APPROVED" ? "Document approved" : "Document declined");
      if (selectedCase) {
        const docs = flattenDocs(selectedCase).filter((d) => d.document_id !== docId);
        const nextPending = docs.find((d) => d.status === "PENDING");
        if (nextPending) setSelectedDocId(nextPending.document_id);
        else if (docs[0]) setSelectedDocId(docs[0].document_id);
      }
      router.refresh();
    });
  }

  async function handleApproveDriver(driverId: string, reason: string) {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Reason is required");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("driver_id", driverId);
      fd.set("reason", trimmed);
      const res = await approveDriverAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Driver and eligible vehicles approved");
      setApproveReason("");
      router.refresh();
    });
  }

  async function handleDecideVehicle(
    vehicleId: string,
    decision: "APPROVED" | "REJECTED",
    reason: string,
  ) {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Reason is required");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("vehicle_id", vehicleId);
      fd.set("decision", decision);
      fd.set("reason", trimmed);
      const res = await decideVehicleAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(decision === "APPROVED" ? "Vehicle approved" : "Vehicle rejected");
      setVehicleReasons((prev) => {
        const next = { ...prev };
        delete next[vehicleId];
        return next;
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Verification</h1>
          <p className="mt-1 text-sm muted">
            Review documents with driver and vehicle context. Decisions require reasons and are audit logged.
          </p>
        </div>
        <div className="text-xs muted">
          {normalizedStatus} • {cases.length} drivers
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search driver, vehicle, or doc…"
            className="h-10 w-full rounded-lg border border-token bg-transparent px-3 text-sm md:w-72"
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
        <div className="text-xs muted">{filteredCases.length.toLocaleString()} shown</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
        <div className="border-b border-token p-4">
          <div className="text-sm font-semibold tracking-tight">Queue</div>
          <div className="text-xs muted">Drivers with {normalizedStatus.toLowerCase()} documents</div>
        </div>

        <div className="max-h-[680px] overflow-auto p-2">
          {filteredCases.map((c) => {
            const docsInScope = flattenDocs(c).filter((d) => d.status === normalizedStatus);
            const expiringSoonCount = docsInScope.filter((d) => isExpiringSoon(d)).length;
            const isSelected = c.driver_id === selectedDriverId;
            const subtitleParts = [c.driver?.cellphone ?? null, c.driver?.email ?? null].filter(Boolean);

            return (
              <button
                key={c.driver_id}
                type="button"
                onClick={() => handleOpenCase(c.driver_id)}
                aria-label={`Open verification for ${driverLabel(c.driver, c.driver_id)}`}
                className={[
                  "w-full rounded-xl border px-3 py-3 text-left transition",
                  isSelected ? "border-[var(--brand-red)] bg-[var(--brand-red)]/5" : "border-token hover:bg-black/3",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold">{driverLabel(c.driver, c.driver_id)}</div>
                      <StatusChip label={`${docsInScope.length} docs`} tone="muted" />
                      {expiringSoonCount ? <StatusChip label={`${expiringSoonCount} expiring`} tone="warn" /> : null}
                    </div>
                    <div className="mt-1 text-xs muted">
                      {subtitleParts.length ? subtitleParts.join(" • ") : `ID ${shortId(c.driver_id)}`}
                    </div>
                    {c.vehicles.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.vehicles.slice(0, 2).map((v) => (
                          <span
                            key={v.vehicle_id}
                            className="inline-flex max-w-full items-center truncate rounded-full border border-token bg-black/2 px-2 py-0.5 text-[11px] font-semibold"
                          >
                            {vehicleLabel(v)}
                          </span>
                        ))}
                        {c.vehicles.length > 2 ? <span className="text-[11px] font-semibold muted">+{c.vehicles.length - 2} more</span> : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs muted">Oldest</div>
                    <div className="text-xs font-semibold">{fmt(c.stats.oldestCreatedAt)}</div>
                  </div>
                </div>
              </button>
            );
          })}

          {!filteredCases.length ? (
            <div className="px-3 py-10 text-center text-sm muted">No drivers in this queue.</div>
          ) : null}
        </div>
      </div>

      <FullscreenModalShell
        open={open}
        title={selectedCase ? driverLabel(selectedCase.driver, selectedCase.driver_id) : "Verification case"}
        subtitle={selectedCase?.driver?.cellphone ? `Phone ${selectedCase.driver.cellphone}` : undefined}
        onClose={() => setOpen(false)}
      >
        {selectedCase ? (
          <div className="grid h-full grid-cols-1 lg:grid-cols-[340px_1fr_420px]">
            <div className="min-h-0 overflow-auto border-b border-token p-4 lg:border-b-0 lg:border-r">
              <div className="text-sm font-semibold tracking-tight">Documents</div>
              <div className="mt-1 text-xs muted">Grouped by driver and vehicle</div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide muted">Driver</div>
                  <div className="mt-2 space-y-2">
                    {selectedCase.driverDocs.length ? (
                      selectedCase.driverDocs.map((d) => (
                        <DocButton
                          key={d.document_id}
                          doc={d}
                          selected={selectedDocId === d.document_id}
                          onClick={() => setSelectedDocId(d.document_id)}
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-token bg-black/2 px-3 py-3 text-sm muted">No driver docs found.</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide muted">Vehicles</div>
                  <div className="mt-2 space-y-3">
                    {selectedCase.vehicles.length ? (
                      selectedCase.vehicles.map((v) => {
                        const docs = selectedCase.vehicleDocsByVehicleId[v.vehicle_id] ?? [];
                        return (
                          <div key={v.vehicle_id} className="rounded-xl border border-token p-3">
                            <div className="truncate text-sm font-semibold">{vehicleLabel(v)}</div>
                            <div className="mt-1 text-xs muted">{v.category ?? "—"} • {v.status ?? "—"}</div>
                            <div className="mt-3 space-y-2">
                              {docs.length ? (
                                docs.map((d) => (
                                  <DocButton
                                    key={d.document_id}
                                    doc={d}
                                    selected={selectedDocId === d.document_id}
                                    onClick={() => setSelectedDocId(d.document_id)}
                                  />
                                ))
                              ) : (
                                <div className="rounded-lg border border-token bg-black/2 px-3 py-2 text-sm muted">No vehicle docs found.</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-token bg-black/2 px-3 py-3 text-sm muted">No vehicles linked.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-auto border-b border-token p-4 lg:border-b-0 lg:border-r">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {selectedDoc ? selectedDoc.document_type : "Select a document"}
                  </div>
                  <div className="mt-1 text-xs muted">
                    {selectedDoc ? `${selectedDoc.entity_type} • ${fmt(selectedDoc.created_at)} • ${selectedDoc.status}` : "Preview and decide"}
                  </div>
                </div>
                {selectedDoc?.signedUrl ? (
                  <a
                    href={selectedDoc.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-lg border border-token px-3 py-2 text-sm font-semibold hover:border-[var(--brand-red)]"
                  >
                    Open
                  </a>
                ) : null}
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-token bg-black/2">
                {selectedDoc?.signedUrl ? (
                  <iframe title="Document preview" src={selectedDoc.signedUrl} className="h-[72vh] w-full" />
                ) : (
                  <div className="grid h-[60vh] place-items-center text-sm muted">No preview available.</div>
                )}
              </div>
            </div>

            <div className="min-h-0 overflow-auto p-4">
              <div className="rounded-xl border border-token p-4">
                <div className="text-sm font-semibold tracking-tight">Driver profile</div>
                <div className="mt-2 space-y-2 text-xs muted">
                  <div>
                    <span className="font-semibold text-[color:var(--foreground)]">Phone:</span> {selectedCase.driver?.cellphone ?? "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-[color:var(--foreground)]">Email:</span> {selectedCase.driver?.email ?? "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-[color:var(--foreground)]">ID number:</span> {selectedCase.driver?.id_number ?? "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-[color:var(--foreground)]">Address:</span> {selectedCase.driver?.residential_address ?? "—"}
                  </div>
                  <div className="h-px bg-[color:var(--border)]" />
                  <div>
                    <span className="font-semibold text-[color:var(--foreground)]">License:</span> {selectedCase.driver?.license_number ?? "—"}{" "}
                    {selectedCase.driver?.license_code ? `(${selectedCase.driver.license_code})` : ""}
                  </div>
                  <div>
                    <span className="font-semibold text-[color:var(--foreground)]">PDP:</span> {selectedCase.driver?.pdp_number ?? "—"}{" "}
                    {selectedCase.driver?.pdp_expiry ? `• exp ${selectedCase.driver.pdp_expiry}` : ""}
                  </div>
                  <div className="h-px bg-[color:var(--border)]" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-token bg-black/2 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide muted">Status</div>
                      <div className="mt-1 text-xs font-semibold">{selectedCase.driver?.status ?? "—"}</div>
                    </div>
                    <div className="rounded-lg border border-token bg-black/2 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide muted">Online</div>
                      <div className="mt-1 text-xs font-semibold">{selectedCase.driver?.online_status ?? "—"}</div>
                    </div>
                    <div className="rounded-lg border border-token bg-black/2 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide muted">Training</div>
                      <div className="mt-1 text-xs font-semibold">{selectedCase.driver?.training_completed ? "Completed" : "No"}</div>
                    </div>
                    <div className="rounded-lg border border-token bg-black/2 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide muted">Submitted</div>
                      <div className="mt-1 text-xs font-semibold">{selectedCase.driver?.registration_submitted ? "Yes" : "No"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-token p-4">
                <div className="text-sm font-semibold tracking-tight">Vehicle details</div>
                <div className="mt-1 text-xs muted">
                  Linked vehicles and ownership information. Approve the vehicle entity after its documents are reviewed — drivers cannot go online while the vehicle stays pending.
                </div>

                <div className="mt-3 space-y-3">
                  {selectedCase.vehicles.length ? (
                    selectedCase.vehicles.map((v) => {
                      const ownerDetails = safeObj(v.owner_details);
                      const companyDetails = safeObj(v.company_details);
                      const docs = selectedCase.vehicleDocsByVehicleId[v.vehicle_id] ?? [];
                      const pendingDocs = docs.filter((d) => d.status === "PENDING").length;
                      const vehicleStatus = (v.status ?? "").toUpperCase();
                      const vehicleReason = vehicleReasons[v.vehicle_id] ?? "";
                      const trimmedVehicleReason = vehicleReason.trim();
                      const canApproveVehicle =
                        docs.length > 0 && pendingDocs === 0 && vehicleStatus !== "APPROVED" && !isPending;
                      const canRejectVehicle = vehicleStatus !== "REJECTED" && !isPending;

                      return (
                        <div key={v.vehicle_id} className="rounded-xl border border-token bg-black/2 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{vehicleLabel(v)}</div>
                              <div className="mt-1 text-xs muted">
                                {v.colour ? `${v.colour} • ` : ""}
                                {v.category ?? "—"} • {v.status ?? "—"}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <StatusChip
                                label={(v.status ?? "—").toLowerCase()}
                                tone={
                                  vehicleStatus === "APPROVED"
                                    ? "ok"
                                    : vehicleStatus === "REJECTED" || vehicleStatus === "SUSPENDED"
                                      ? "danger"
                                      : "warn"
                                }
                              />
                              {v.speedometer_reading !== null && v.speedometer_reading !== undefined ? (
                                <StatusChip label={`${v.speedometer_reading.toLocaleString()} km`} tone="muted" />
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs muted">
                            <div className="rounded-lg border border-token bg-[var(--surface-1)] px-3 py-2">
                              <div className="text-[11px] font-semibold uppercase tracking-wide muted">VIN</div>
                              <div className="mt-1 truncate text-xs font-semibold text-[color:var(--foreground)]">{v.vin ?? "—"}</div>
                            </div>
                            <div className="rounded-lg border border-token bg-[var(--surface-1)] px-3 py-2">
                              <div className="text-[11px] font-semibold uppercase tracking-wide muted">Owner type</div>
                              <div className="mt-1 truncate text-xs font-semibold text-[color:var(--foreground)]">{v.owner_type ?? "—"}</div>
                            </div>
                          </div>

                          {ownerDetails ? (
                            <div className="mt-3 rounded-lg border border-token bg-[var(--surface-1)] px-3 py-2 text-xs muted">
                              <div className="text-[11px] font-semibold uppercase tracking-wide muted">Owner details</div>
                              <div className="mt-1 grid grid-cols-1 gap-1">
                                {typeof ownerDetails["owner_full_name"] === "string" ? (
                                  <div>
                                    <span className="font-semibold text-[color:var(--foreground)]">Name:</span>{" "}
                                    {String(ownerDetails["owner_full_name"])}
                                  </div>
                                ) : null}
                                {typeof ownerDetails["owner_id_number"] === "string" ? (
                                  <div>
                                    <span className="font-semibold text-[color:var(--foreground)]">ID:</span>{" "}
                                    {String(ownerDetails["owner_id_number"])}
                                  </div>
                                ) : null}
                                {typeof ownerDetails["owner_address"] === "string" ? (
                                  <div className="truncate">
                                    <span className="font-semibold text-[color:var(--foreground)]">Address:</span>{" "}
                                    {String(ownerDetails["owner_address"])}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          {companyDetails ? (
                            <div className="mt-3 rounded-lg border border-token bg-[var(--surface-1)] px-3 py-2 text-xs muted">
                              <div className="text-[11px] font-semibold uppercase tracking-wide muted">Company details</div>
                              <div className="mt-1 grid grid-cols-1 gap-1">
                                {typeof companyDetails["company_name"] === "string" ? (
                                  <div>
                                    <span className="font-semibold text-[color:var(--foreground)]">Name:</span>{" "}
                                    {String(companyDetails["company_name"])}
                                  </div>
                                ) : null}
                                {typeof companyDetails["company_cipc"] === "string" ? (
                                  <div>
                                    <span className="font-semibold text-[color:var(--foreground)]">CIPC:</span>{" "}
                                    {String(companyDetails["company_cipc"])}
                                  </div>
                                ) : null}
                                {typeof companyDetails["company_address"] === "string" ? (
                                  <div className="truncate">
                                    <span className="font-semibold text-[color:var(--foreground)]">Address:</span>{" "}
                                    {String(companyDetails["company_address"])}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-3 space-y-2 rounded-lg border border-token bg-[var(--surface-1)] p-3">
                            <div className="flex items-center justify-between text-xs">
                              <div className="font-semibold muted">Vehicle decision</div>
                              <div className="font-semibold">
                                {pendingDocs}/{docs.length} pending docs
                              </div>
                            </div>
                            <textarea
                              value={vehicleReason}
                              onChange={(e) =>
                                setVehicleReasons((prev) => ({
                                  ...prev,
                                  [v.vehicle_id]: e.target.value,
                                }))
                              }
                              placeholder="Reason (required)…"
                              className="min-h-[72px] w-full resize-none rounded-lg border border-token bg-transparent px-3 py-2 text-sm"
                              disabled={isPending}
                              aria-label={`Vehicle decision reason for ${vehicleLabel(v)}`}
                            />
                            {!trimmedVehicleReason ? (
                              <div className="text-xs text-[var(--brand-red)]">Reason is required.</div>
                            ) : null}
                            {docs.length === 0 ? (
                              <div className="text-xs muted">Upload/review vehicle documents before approving.</div>
                            ) : pendingDocs > 0 ? (
                              <div className="text-xs muted">Approve or decline pending vehicle documents first.</div>
                            ) : null}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={!canApproveVehicle || !trimmedVehicleReason}
                                className="h-10 rounded-lg bg-[var(--brand-navy-900)] text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => handleDecideVehicle(v.vehicle_id, "APPROVED", trimmedVehicleReason)}
                                aria-label={`Approve vehicle ${vehicleLabel(v)}`}
                              >
                                Approve vehicle
                              </button>
                              <button
                                type="button"
                                disabled={!canRejectVehicle || !trimmedVehicleReason}
                                className="h-10 rounded-lg border border-token bg-transparent text-sm font-semibold text-[var(--brand-red)] hover:bg-[var(--brand-red)]/5 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => handleDecideVehicle(v.vehicle_id, "REJECTED", trimmedVehicleReason)}
                                aria-label={`Reject vehicle ${vehicleLabel(v)}`}
                              >
                                Reject vehicle
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-token bg-black/2 px-3 py-3 text-sm muted">No vehicles linked.</div>
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-token p-4">
                <div className="text-sm font-semibold tracking-tight">Bank details</div>
                <div className="mt-1 text-xs muted">Masked account information (if provided)</div>
                <div className="mt-3 rounded-lg border border-token bg-black/2 px-3 py-3 text-xs muted">
                  {(() => {
                    const bank = safeObj(selectedCase.driver?.bank_details ?? null);
                    if (!bank) return <div>—</div>;
                    const accountHolder = typeof bank["account_holder"] === "string" ? String(bank["account_holder"]) : null;
                    const bankName = typeof bank["bank_name"] === "string" ? String(bank["bank_name"]) : null;
                    const masked = maskAccountNumber(bank["account_number"]);
                    const branchCode = typeof bank["branch_code"] === "string" ? String(bank["branch_code"]) : null;
                    return (
                      <div className="space-y-1">
                        <div>
                          <span className="font-semibold text-[color:var(--foreground)]">Account holder:</span>{" "}
                          {accountHolder ?? "—"}
                        </div>
                        <div>
                          <span className="font-semibold text-[color:var(--foreground)]">Bank:</span> {bankName ?? "—"}
                        </div>
                        <div>
                          <span className="font-semibold text-[color:var(--foreground)]">Account:</span> {masked ?? "—"}
                        </div>
                        <div>
                          <span className="font-semibold text-[color:var(--foreground)]">Branch code:</span>{" "}
                          {branchCode ?? "—"}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-token p-4">
                <div className="text-sm font-semibold tracking-tight">Decision</div>
                <div className="mt-1 text-xs muted">Reason is required and will be audited.</div>
                <DecisionPanel
                  disabled={!selectedDoc || isPending}
                  onApprove={(reason) => selectedDoc && handleReview(selectedDoc.document_id, "APPROVED", reason)}
                  onDecline={(reason) => selectedDoc && handleReview(selectedDoc.document_id, "DECLINED", reason)}
                />
              </div>

              <div className="mt-3 rounded-xl border border-token p-4">
                <div className="text-sm font-semibold tracking-tight">Approve driver</div>
                <div className="mt-1 text-xs muted">
                  Driver approval is enabled once there are{" "}
                  <span className="font-semibold text-[color:var(--foreground)]">no pending</span> driver + vehicle
                  documents. Linked vehicles with completed doc review are approved at the same time.
                </div>

                {(() => {
                  const allDocs = flattenDocs(selectedCase);
                  const total = allDocs.length;
                  const pendingCount = allDocs.filter((d) => d.status === "PENDING").length;
                  const canApproveDriver = total > 0 && pendingCount === 0 && !isPending;
                  const trimmed = approveReason.trim();

                  return (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between rounded-lg border border-token bg-black/2 px-3 py-2 text-xs">
                        <div className="font-semibold muted">Pending documents</div>
                        <div className="font-semibold">
                          {pendingCount}/{total}
                        </div>
                      </div>

                      <textarea
                        value={approveReason}
                        onChange={(e) => setApproveReason(e.target.value)}
                        placeholder="Reason (required)…"
                        className="min-h-[96px] w-full resize-none rounded-lg border border-token bg-transparent px-3 py-2 text-sm"
                        disabled={!total || isPending}
                        aria-label="Driver approval reason"
                      />
                      {!trimmed && total ? <div className="text-xs text-[var(--brand-red)]">Reason is required.</div> : null}

                      <button
                        type="button"
                        disabled={!canApproveDriver || !trimmed}
                        className="h-10 w-full rounded-lg bg-[var(--brand-navy-900)] text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleApproveDriver(selectedCase.driver_id, trimmed)}
                        aria-label="Approve driver"
                      >
                        Approve driver
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm muted">No driver selected.</div>
        )}
      </FullscreenModalShell>
    </div>
  );
}

function DocButton({
  doc,
  selected,
  onClick,
}: {
  doc: DocRow;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-lg border px-3 py-2 text-left transition",
        selected ? "border-[var(--brand-red)] bg-[var(--brand-red)]/5" : "border-token hover:bg-black/3",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{doc.document_type}</div>
          <div className="mt-1 text-xs muted">{fmt(doc.created_at)}</div>
        </div>
        <div className="shrink-0">
          {doc.status === "PENDING" ? (
            <StatusChip label="pending" tone="warn" />
          ) : doc.status === "APPROVED" ? (
            <StatusChip label="approved" tone="ok" />
          ) : doc.status === "DECLINED" ? (
            <StatusChip label="declined" tone="danger" />
          ) : (
            <StatusChip label={(doc.status ?? "—").toLowerCase()} tone="muted" />
          )}
        </div>
      </div>
      {isExpiringSoon(doc) ? <div className="mt-2 text-xs text-amber-700">Expiry soon</div> : null}
    </button>
  );
}

function DecisionPanel({
  disabled,
  onApprove,
  onDecline,
}: {
  disabled: boolean;
  onApprove: (reason: string) => void;
  onDecline: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)…"
        className="min-h-[96px] w-full resize-none rounded-lg border border-token bg-transparent px-3 py-2 text-sm"
        disabled={disabled}
        aria-label="Decision reason"
      />
      {!trimmed && !disabled ? <div className="text-xs text-[var(--brand-red)]">Reason is required.</div> : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled || !trimmed}
          className="h-10 rounded-lg border border-[var(--brand-red)] text-sm font-semibold text-[var(--brand-red)] hover:bg-[var(--brand-red)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => {
            if (!trimmed) return;
            onDecline(trimmed);
            setReason("");
          }}
        >
          Decline
        </button>
        <button
          type="button"
          disabled={disabled || !trimmed}
          className="h-10 rounded-lg bg-[var(--brand-navy-900)] text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => {
            if (!trimmed) return;
            onApprove(trimmed);
            setReason("");
          }}
        >
          Approve
        </button>
      </div>
      <div className="text-xs muted">Tip: use specific reasons (e.g. “photo blurry”, “name mismatch”, “expired doc”).</div>
    </div>
  );
}

