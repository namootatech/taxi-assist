'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/vehicles/actions';
import type { VehicleOnboardingFeeStatus } from '@/lib/vehicles/onboarding-fees';
import { formatOnboardingFeeZar } from '@/lib/vehicles/onboarding-fees';

export type VehicleDoc = {
  document_id: string;
  document_type: string;
  file_path: string | null;
  status: string;
  created_at: string;
  expiry_date: string | null;
  signedUrl: string | null;
};

export type VehicleDetail = {
  vehicle_id: string;
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
  rejection_reason: string | null;
  linked_driver_id: string | null;
  linked_driver_name: string | null;
  linked_driver_cellphone: string | null;
};

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

function safeObj(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'muted' | 'danger' | 'warn' | 'ok';
}) {
  const cls =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : tone === 'ok'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-token bg-black/3 text-[color:var(--muted)]';
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function statusTone(status: string | null | undefined) {
  const s = (status ?? '').toUpperCase();
  if (s === 'APPROVED') return 'ok' as const;
  if (s === 'REJECTED' || s === 'SUSPENDED' || s === 'DECLINED') return 'danger' as const;
  if (s === 'PENDING') return 'warn' as const;
  return 'muted' as const;
}

export function VehicleReviewClient({
  vehicle,
  docs,
  onboardingFee,
  reviewDocumentAction,
  decideVehicleAction,
}: {
  vehicle: VehicleDetail;
  docs: Array<VehicleDoc>;
  onboardingFee: VehicleOnboardingFeeStatus | null;
  reviewDocumentAction: (formData: FormData) => Promise<ActionResult>;
  decideVehicleAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDocId, setSelectedDocId] = useState(
    () => docs.find((d) => d.status === 'PENDING')?.document_id ?? docs[0]?.document_id ?? '',
  );
  const [docReason, setDocReason] = useState('');
  const [vehicleReason, setVehicleReason] = useState('');

  const selectedDoc = useMemo(
    () => docs.find((d) => d.document_id === selectedDocId) ?? null,
    [docs, selectedDocId],
  );

  const pendingDocs = docs.filter((d) => d.status === 'PENDING').length;
  const vehicleStatus = (vehicle.status ?? '').toUpperCase();
  const canApproveVehicle =
    docs.length > 0 && pendingDocs === 0 && vehicleStatus !== 'APPROVED' && !isPending;
  const canRejectVehicle = vehicleStatus !== 'REJECTED' && !isPending;
  const ownerDetails = safeObj(vehicle.owner_details);
  const companyDetails = safeObj(vehicle.company_details);
  const title =
    [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim() ||
    vehicle.registration_number ||
    'Vehicle';

  function handleReviewDoc(decision: 'APPROVED' | 'DECLINED') {
    if (!selectedDoc) return;
    const reason = docReason.trim();
    if (!reason) {
      toast.error('Reason is required');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set('document_id', selectedDoc.document_id);
      fd.set('decision', decision);
      fd.set('reason', reason);
      const res = await reviewDocumentAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(decision === 'APPROVED' ? 'Document approved' : 'Document declined');
      setDocReason('');
      router.refresh();
    });
  }

  function handleDecideVehicle(decision: 'APPROVED' | 'REJECTED') {
    const reason = vehicleReason.trim();
    if (!reason) {
      toast.error('Reason is required');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set('vehicle_id', vehicle.vehicle_id);
      fd.set('decision', decision);
      fd.set('reason', reason);
      const res = await decideVehicleAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(decision === 'APPROVED' ? 'Vehicle approved' : 'Vehicle rejected');
      setVehicleReason('');
      router.refresh();
    });
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div>
          <Link href='/vehicles' className='text-xs font-semibold muted hover:underline'>
            ← Back to vehicles
          </Link>
          <h1 className='mt-2 text-xl font-semibold tracking-tight'>{title}</h1>
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <StatusChip
              label={(vehicle.status ?? '—').toLowerCase()}
              tone={statusTone(vehicle.status)}
            />
            <span className='text-sm muted'>
              {vehicle.registration_number ?? '—'}
              {vehicle.colour ? ` • ${vehicle.colour}` : ''}
              {vehicle.category ? ` • ${vehicle.category}` : ''}
            </span>
          </div>
          {vehicle.linked_driver_id ? (
            <p className='mt-2 text-sm muted'>
              Linked driver:{' '}
              <Link
                href={`/drivers/${vehicle.linked_driver_id}`}
                className='font-semibold text-[color:var(--foreground)] hover:underline'
              >
                {vehicle.linked_driver_name ?? 'Driver'}
              </Link>
              {vehicle.linked_driver_cellphone
                ? ` • ${vehicle.linked_driver_cellphone}`
                : ''}
            </p>
          ) : (
            <p className='mt-2 text-sm muted'>No linked driver</p>
          )}
          {vehicleStatus === 'REJECTED' && vehicle.rejection_reason ? (
            <p className='mt-2 text-sm text-rose-700'>
              Rejection reason: {vehicle.rejection_reason}
            </p>
          ) : null}
        </div>
      </div>

      {onboardingFee ? (
        <div className='rounded-2xl border border-token p-4'>
          <div className='text-sm font-semibold'>Annual onboarding fee</div>
          <div className='mt-2 grid gap-2 text-sm md:grid-cols-4'>
            <div>
              <div className='text-xs muted'>Tier amount</div>
              <div className='font-semibold'>{formatOnboardingFeeZar(onboardingFee.annualFeeCents)}</div>
            </div>
            <div>
              <div className='text-xs muted'>Status</div>
              <StatusChip label={onboardingFee.status.replaceAll('_', ' ')} tone={statusTone(onboardingFee.status === 'paid' ? 'APPROVED' : onboardingFee.paymentRequired ? 'PENDING' : 'APPROVED')} />
            </div>
            <div>
              <div className='text-xs muted'>Waived until</div>
              <div>{fmt(onboardingFee.waivedUntil)}</div>
            </div>
            <div>
              <div className='text-xs muted'>Paid until</div>
              <div>{fmt(onboardingFee.paidUntil)}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        <div className='space-y-3 rounded-2xl border border-token p-4 lg:col-span-1'>
          <div className='text-sm font-semibold'>Documents</div>
          <div className='text-xs muted'>
            {pendingDocs}/{docs.length} pending — review these before approving the vehicle.
          </div>
          <div className='space-y-2'>
            {docs.length ? (
              docs.map((d) => {
                const selected = d.document_id === selectedDocId;
                return (
                  <button
                    key={d.document_id}
                    type='button'
                    onClick={() => setSelectedDocId(d.document_id)}
                    className={[
                      'w-full rounded-lg border px-3 py-2 text-left transition',
                      selected
                        ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/5'
                        : 'border-token hover:bg-black/3',
                    ].join(' ')}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <div className='truncate text-sm font-semibold'>{d.document_type}</div>
                        <div className='mt-1 text-xs muted'>{fmt(d.created_at)}</div>
                      </div>
                      <StatusChip
                        label={(d.status ?? '—').toLowerCase()}
                        tone={statusTone(d.status)}
                      />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className='rounded-lg border border-token bg-black/2 px-3 py-3 text-sm muted'>
                No vehicle documents uploaded.
              </div>
            )}
          </div>

          <div className='rounded-xl border border-token bg-black/2 p-3 text-xs muted'>
            <div className='grid grid-cols-1 gap-2'>
              <div>
                <span className='font-semibold text-[color:var(--foreground)]'>VIN:</span>{' '}
                {vehicle.vin ?? '—'}
              </div>
              <div>
                <span className='font-semibold text-[color:var(--foreground)]'>Owner type:</span>{' '}
                {vehicle.owner_type ?? '—'}
              </div>
              <div>
                <span className='font-semibold text-[color:var(--foreground)]'>Odometry:</span>{' '}
                {vehicle.speedometer_reading != null
                  ? `${vehicle.speedometer_reading.toLocaleString()} km`
                  : '—'}
              </div>
            </div>
            {ownerDetails ? (
              <div className='mt-3 border-t border-token pt-3'>
                <div className='font-semibold text-[color:var(--foreground)]'>Owner</div>
                {typeof ownerDetails['owner_full_name'] === 'string' ? (
                  <div className='mt-1'>{String(ownerDetails['owner_full_name'])}</div>
                ) : null}
                {typeof ownerDetails['owner_id_number'] === 'string' ? (
                  <div>ID: {String(ownerDetails['owner_id_number'])}</div>
                ) : null}
              </div>
            ) : null}
            {companyDetails ? (
              <div className='mt-3 border-t border-token pt-3'>
                <div className='font-semibold text-[color:var(--foreground)]'>Company</div>
                {typeof companyDetails['company_name'] === 'string' ? (
                  <div className='mt-1'>{String(companyDetails['company_name'])}</div>
                ) : null}
                {typeof companyDetails['company_cipc'] === 'string' ? (
                  <div>CIPC: {String(companyDetails['company_cipc'])}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className='space-y-4 rounded-2xl border border-token p-4 lg:col-span-2'>
          <div>
            <div className='text-sm font-semibold'>Document preview</div>
            <div className='mt-1 text-xs muted'>
              {selectedDoc
                ? `${selectedDoc.document_type} • ${fmt(selectedDoc.created_at)} • ${selectedDoc.status}`
                : 'Select a document'}
            </div>
            <div className='mt-3 overflow-hidden rounded-xl border border-token bg-black/2'>
              {selectedDoc?.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedDoc.signedUrl}
                  alt={selectedDoc.document_type}
                  className='max-h-[420px] w-full object-contain'
                />
              ) : (
                <div className='px-4 py-16 text-center text-sm muted'>
                  {selectedDoc ? 'Preview unavailable for this file.' : 'No document selected.'}
                </div>
              )}
            </div>
            {selectedDoc && selectedDoc.status === 'PENDING' ? (
              <div className='mt-3 space-y-2'>
                <textarea
                  value={docReason}
                  onChange={(e) => setDocReason(e.target.value)}
                  placeholder='Reason (required)…'
                  className='min-h-[80px] w-full resize-none rounded-lg border border-token bg-transparent px-3 py-2 text-sm'
                  disabled={isPending}
                />
                <div className='grid grid-cols-2 gap-2'>
                  <button
                    type='button'
                    disabled={isPending || !docReason.trim()}
                    className='h-10 rounded-lg bg-[var(--brand-navy-900)] text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60'
                    onClick={() => handleReviewDoc('APPROVED')}
                  >
                    Approve document
                  </button>
                  <button
                    type='button'
                    disabled={isPending || !docReason.trim()}
                    className='h-10 rounded-lg border border-token text-sm font-semibold text-[var(--brand-red)] hover:bg-[var(--brand-red)]/5 disabled:opacity-60'
                    onClick={() => handleReviewDoc('DECLINED')}
                  >
                    Decline document
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className='border-t border-token pt-4'>
            <div className='text-sm font-semibold'>Vehicle decision</div>
            <div className='mt-1 text-xs muted'>
              Approving sets <span className='font-semibold'>vehicles.status</span> to APPROVED so
              the driver can go online with this vehicle.
            </div>
            <textarea
              value={vehicleReason}
              onChange={(e) => setVehicleReason(e.target.value)}
              placeholder='Reason (required)…'
              className='mt-3 min-h-[88px] w-full resize-none rounded-lg border border-token bg-transparent px-3 py-2 text-sm'
              disabled={isPending}
            />
            {docs.length === 0 ? (
              <div className='mt-2 text-xs muted'>
                Documents must be uploaded before this vehicle can be approved.
              </div>
            ) : pendingDocs > 0 ? (
              <div className='mt-2 text-xs muted'>
                Clear {pendingDocs} pending document(s) before approving the vehicle.
              </div>
            ) : null}
            <div className='mt-3 grid grid-cols-2 gap-2'>
              <button
                type='button'
                disabled={!canApproveVehicle || !vehicleReason.trim()}
                className='h-10 rounded-lg bg-[var(--brand-navy-900)] text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={() => handleDecideVehicle('APPROVED')}
              >
                Approve vehicle
              </button>
              <button
                type='button'
                disabled={!canRejectVehicle || !vehicleReason.trim()}
                className='h-10 rounded-lg border border-token text-sm font-semibold text-[var(--brand-red)] hover:bg-[var(--brand-red)]/5 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={() => handleDecideVehicle('REJECTED')}
              >
                Reject vehicle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
