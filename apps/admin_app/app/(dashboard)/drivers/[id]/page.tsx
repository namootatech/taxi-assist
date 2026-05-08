import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';

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
};

type DocRow = {
  document_id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_path: string | null;
  status: string;
  created_at: string;
  expiry_date: string | null;
  signedUrl: string | null;
};

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function safeObj(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function maskAccountNumber(raw: unknown) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  const last4 = s.slice(-4);
  return `•••• ${last4}`;
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

function storageBucketForPath(filePath: string) {
  const parts = filePath.split('/');
  if (parts.length >= 4 && parts[1] === 'vehicle') {
    const file = parts[3] ?? '';
    if (
      file.startsWith('front_') ||
      file.startsWith('left_') ||
      file.startsWith('right_') ||
      file.startsWith('rear_') ||
      file.startsWith('speedo_')
    ) {
      return 'vehicle-photos';
    }
  }
  return 'driver-documents';
}

function tabHref(driverId: string, tab: string, docId?: string) {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (docId) params.set('docId', docId);
  return `/drivers/${driverId}?${params.toString()}`;
}

function docTone(doc: DocRow) {
  const status = (doc.status ?? '').toUpperCase();
  if (status === 'APPROVED') return 'ok';
  if (status === 'DECLINED' || status === 'REJECTED') return 'danger';
  if (status === 'PENDING') return 'warn';
  return 'muted';
}

function expiryTone(doc: DocRow) {
  const d = daysUntil(doc.expiry_date);
  if (d == null) return null;
  if (d < 0) return { label: 'expired', tone: 'danger' as const };
  if (d <= 14) return { label: `expiring ${d}d`, tone: 'warn' as const };
  return null;
}

export default async function DriverDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; docId?: string }>;
}) {
  const { id } = await params;
  const { tab, docId } = await searchParams;
  const activeTab = (tab ?? 'overview').toLowerCase();

  const supabase = await createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, cellphone, email, id_number, dob, sex, residential_address, license_number, license_code, pdp_number, pdp_expiry, bank_details, selfie_url, status, online_status, training_completed, registration_submitted, current_vehicle_id, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>Driver</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(error)}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className='rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]'>
        <div className='text-lg font-semibold tracking-tight'>
          Driver not found
        </div>
        <p className='mt-2 text-sm muted'>
          This driver may have been removed or you may not have access.
        </p>
        <Link
          className='mt-4 inline-flex rounded-lg border border-token px-3 py-2 text-sm font-semibold'
          href='/drivers'
        >
          Back to drivers
        </Link>
      </div>
    );
  }

  const p = profile as ProfileRow;

  const vehicleId = p.current_vehicle_id;
  const { data: vehicleRaw } = vehicleId
    ? await supabase
        .from('vehicles')
        .select(
          'vehicle_id, registration_number, make, model, colour, category, vin, speedometer_reading, owner_type, owner_details, company_details, status',
        )
        .eq('vehicle_id', vehicleId)
        .maybeSingle()
    : { data: null as unknown };

  const vehicle = (vehicleRaw ?? null) as VehicleRow | null;

  const entityIds = [p.id, vehicle?.vehicle_id].filter(
    Boolean,
  ) as Array<string>;

  const { data: docsRaw } = entityIds.length
    ? await supabase
        .from('documents')
        .select(
          'document_id, entity_type, entity_id, document_type, file_path, status, created_at, expiry_date',
        )
        .in('entity_id', entityIds)
        .in('entity_type', ['DRIVER', 'VEHICLE'])
        .order('created_at', { ascending: true })
        .limit(2000)
    : { data: [] as unknown[] };

  const baseDocs = (
    (docsRaw ?? []) as unknown as Array<Omit<DocRow, 'signedUrl'>>
  ).map((d) => ({
    ...d,
    signedUrl: null,
  })) as Array<DocRow>;

  async function signedUrlFor(doc: DocRow) {
    const filePath = doc.file_path;
    if (!filePath) return null;
    const bucket = storageBucketForPath(filePath);
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 5);
    return data?.signedUrl ?? null;
  }

  const signedUrls = await Promise.all(baseDocs.map((d) => signedUrlFor(d)));
  const docs: Array<DocRow> = baseDocs.map((d, idx) => ({
    ...d,
    signedUrl: (signedUrls[idx] as string | null) ?? null,
  }));

  const selectedDoc =
    docs.find((d) => d.document_id === docId) ?? docs[0] ?? null;

  const bank = safeObj(p.bank_details);
  const accountHolder =
    typeof bank?.['account_holder'] === 'string'
      ? String(bank?.['account_holder'])
      : null;
  const bankName =
    typeof bank?.['bank_name'] === 'string'
      ? String(bank?.['bank_name'])
      : null;
  const masked = maskAccountNumber(bank?.['account_number']);
  const branchCode =
    typeof bank?.['branch_code'] === 'string'
      ? String(bank?.['branch_code'])
      : null;

  const ownerDetails = safeObj(vehicle?.owner_details ?? null);
  const companyDetails = safeObj(vehicle?.company_details ?? null);

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>
        <div>
          <div className='text-xs font-semibold uppercase tracking-wide muted'>
            Driver
          </div>
          <h1 className='mt-1 text-2xl font-semibold tracking-tight'>
            {p.full_name ?? 'Unnamed driver'}
          </h1>
          <p className='mt-1 text-sm muted'>
            Operational overview, documents, trips, ratings, and audit history.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Link
            className='rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold'
            href='/drivers'
          >
            Back
          </Link>
          <Link
            className='rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white hover:brightness-95'
            href='/verification'
          >
            Verification
          </Link>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <Link
          href={tabHref(p.id, 'overview')}
          className={[
            'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
            activeTab === 'overview'
              ? 'border-[var(--brand-red)] bg-[var(--brand-red)] text-white'
              : 'border-token surface-1 text-[color:var(--muted)] hover:border-[var(--brand-red)] hover:text-[color:var(--foreground)]',
          ].join(' ')}
        >
          Overview
        </Link>
        <Link
          href={tabHref(
            p.id,
            'documents',
            selectedDoc?.document_id ?? undefined,
          )}
          className={[
            'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
            activeTab === 'documents'
              ? 'border-[var(--brand-red)] bg-[var(--brand-red)] text-white'
              : 'border-token surface-1 text-[color:var(--muted)] hover:border-[var(--brand-red)] hover:text-[color:var(--foreground)]',
          ].join(' ')}
        >
          Documents
        </Link>
        <Link
          href={tabHref(p.id, 'trips')}
          className={[
            'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
            activeTab === 'trips'
              ? 'border-[var(--brand-red)] bg-[var(--brand-red)] text-white'
              : 'border-token surface-1 text-[color:var(--muted)] hover:border-[var(--brand-red)] hover:text-[color:var(--foreground)]',
          ].join(' ')}
        >
          Trips
        </Link>
        <Link
          href={tabHref(p.id, 'ratings')}
          className={[
            'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
            activeTab === 'ratings'
              ? 'border-[var(--brand-red)] bg-[var(--brand-red)] text-white'
              : 'border-token surface-1 text-[color:var(--muted)] hover:border-[var(--brand-red)] hover:text-[color:var(--foreground)]',
          ].join(' ')}
        >
          Ratings
        </Link>
      </div>

      {activeTab === 'documents' ? (
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-[340px_1fr]'>
          <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
            <div className='text-sm font-semibold tracking-tight'>
              Documents
            </div>
            <div className='mt-1 text-xs muted'>
              Driver + linked vehicle documents
            </div>

            <div className='mt-4 space-y-2'>
              {docs.map((d) => {
                const isSelected = selectedDoc?.document_id === d.document_id;
                const exp = expiryTone(d);
                return (
                  <Link
                    key={d.document_id}
                    href={tabHref(p.id, 'documents', d.document_id)}
                    className={[
                      'block rounded-xl border px-3 py-3 transition',
                      isSelected
                        ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/5'
                        : 'border-token hover:bg-black/3',
                    ].join(' ')}
                    aria-label={`Open ${d.document_type}`}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <div className='truncate text-sm font-semibold'>
                          {d.document_type}
                        </div>
                        <div className='mt-1 text-xs muted'>
                          {d.entity_type} • {fmt(d.created_at)}
                        </div>
                      </div>
                      <div className='shrink-0 space-y-1 text-right'>
                        <StatusChip
                          label={(d.status ?? '—').toLowerCase()}
                          tone={docTone(d)}
                        />
                        {exp ? (
                          <StatusChip label={exp.label} tone={exp.tone} />
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {!docs.length ? (
                <div className='rounded-xl border border-token bg-black/2 px-3 py-3 text-sm muted'>
                  No documents found.
                </div>
              ) : null}
            </div>
          </div>

          <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='truncate text-sm font-semibold'>
                  {selectedDoc
                    ? selectedDoc.document_type
                    : 'Select a document'}
                </div>
                <div className='mt-1 text-xs muted'>
                  {selectedDoc
                    ? `${selectedDoc.entity_type} • ${fmt(selectedDoc.created_at)} • ${selectedDoc.status}`
                    : 'Preview and decide'}
                </div>
              </div>
              {selectedDoc?.signedUrl ? (
                <a
                  href={selectedDoc.signedUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='shrink-0 rounded-lg border border-token px-3 py-2 text-sm font-semibold hover:border-[var(--brand-red)]'
                >
                  Open
                </a>
              ) : null}
            </div>

            <div className='mt-4 overflow-hidden rounded-xl border border-token bg-black/2'>
              {selectedDoc?.signedUrl ? (
                <iframe
                  title='Document preview'
                  src={selectedDoc.signedUrl}
                  className='h-[72vh] w-full'
                />
              ) : (
                <div className='grid h-[60vh] place-items-center text-sm muted'>
                  No preview available.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'trips' ? (
        <div className='rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]'>
          <div className='text-sm font-semibold tracking-tight'>Trips</div>
          <p className='mt-2 text-sm muted'>
            Trip drill-down and intervention actions will appear here once the
            trips filtering + intervention RPCs are finalized.
          </p>
          <Link
            className='mt-4 inline-flex rounded-lg border border-token px-3 py-2 text-sm font-semibold'
            href='/trips'
          >
            Open trips
          </Link>
        </div>
      ) : activeTab === 'ratings' ? (
        <div className='rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]'>
          <div className='text-sm font-semibold tracking-tight'>Ratings</div>
          <p className='mt-2 text-sm muted'>
            Ratings distribution and recent reviews will appear once the ratings
            schema lands.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
          <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
            <div className='text-xs font-semibold uppercase tracking-wide muted'>
              Status
            </div>
            <div className='mt-2 text-sm font-semibold'>{p.status ?? '—'}</div>
            <div className='mt-1 text-xs muted'>
              Online: {p.online_status ?? '—'}
            </div>
            <div className='mt-3 flex flex-wrap gap-2'>
              <StatusChip
                label={p.training_completed ? 'training done' : 'training no'}
                tone={p.training_completed ? 'ok' : 'warn'}
              />
              <StatusChip
                label={p.registration_submitted ? 'submitted' : 'not submitted'}
                tone={p.registration_submitted ? 'ok' : 'muted'}
              />
            </div>
          </div>

          <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
            <div className='text-xs font-semibold uppercase tracking-wide muted'>
              Contact
            </div>
            <div className='mt-2 space-y-1 text-sm'>
              <div className='font-semibold'>{p.cellphone ?? '—'}</div>
              <div className='text-xs muted'>{p.email ?? '—'}</div>
            </div>
            <div className='mt-3 text-xs muted'>
              Created {fmt(p.created_at)} • Updated {fmt(p.updated_at)}
            </div>
          </div>

          <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
            <div className='text-xs font-semibold uppercase tracking-wide muted'>
              Vehicle
            </div>
            {vehicle ? (
              <div className='mt-2'>
                <div className='text-sm font-semibold'>
                  {vehicle.registration_number ?? '—'}
                </div>
                <div className='mt-1 text-xs muted'>
                  {`${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || '—'}
                </div>
                <div className='mt-3 flex flex-wrap gap-2'>
                  <StatusChip
                    label={(vehicle.status ?? '—').toLowerCase()}
                    tone={
                      (vehicle.status ?? '').toUpperCase() === 'APPROVED'
                        ? 'ok'
                        : 'muted'
                    }
                  />
                  {vehicle.category ? (
                    <StatusChip
                      label={vehicle.category.toLowerCase()}
                      tone='muted'
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className='mt-2 text-sm muted'>No linked vehicle</div>
            )}
          </div>

          <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)] lg:col-span-2'>
            <div className='text-sm font-semibold tracking-tight'>
              Identity & license
            </div>
            <div className='mt-3 grid grid-cols-1 gap-2 text-xs muted md:grid-cols-2'>
              <Field label='ID number' value={p.id_number} />
              <Field label='DOB' value={p.dob} />
              <Field label='Sex' value={p.sex} />
              <Field label='Address' value={p.residential_address} />
              <Field label='License number' value={p.license_number} />
              <Field label='License code' value={p.license_code} />
              <Field label='PDP number' value={p.pdp_number} />
              <Field label='PDP expiry' value={p.pdp_expiry} />
            </div>
          </div>

          <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]'>
            <div className='text-sm font-semibold tracking-tight'>
              Bank details
            </div>
            <div className='mt-3 space-y-1 text-xs muted'>
              <Field label='Account holder' value={accountHolder} />
              <Field label='Bank' value={bankName} />
              <Field label='Account' value={masked} />
              <Field label='Branch code' value={branchCode} />
            </div>
          </div>

          {vehicle ? (
            <div className='rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)] lg:col-span-3'>
              <div className='text-sm font-semibold tracking-tight'>
                Vehicle details
              </div>
              <div className='mt-3 grid grid-cols-1 gap-2 text-xs muted md:grid-cols-3'>
                <Field label='VIN' value={vehicle.vin} />
                <Field label='Colour' value={vehicle.colour} />
                <Field
                  label='Speedometer'
                  value={
                    vehicle.speedometer_reading != null
                      ? `${vehicle.speedometer_reading.toLocaleString()} km`
                      : null
                  }
                />
              </div>

              {ownerDetails ? (
                <div className='mt-4 rounded-xl border border-token bg-black/2 p-4'>
                  <div className='text-xs font-semibold uppercase tracking-wide muted'>
                    Owner details
                  </div>
                  <div className='mt-2 grid grid-cols-1 gap-1 text-xs muted md:grid-cols-3'>
                    <Field
                      label='Name'
                      value={
                        typeof ownerDetails['owner_full_name'] === 'string'
                          ? String(ownerDetails['owner_full_name'])
                          : null
                      }
                    />
                    <Field
                      label='ID'
                      value={
                        typeof ownerDetails['owner_id_number'] === 'string'
                          ? String(ownerDetails['owner_id_number'])
                          : null
                      }
                    />
                    <Field
                      label='Address'
                      value={
                        typeof ownerDetails['owner_address'] === 'string'
                          ? String(ownerDetails['owner_address'])
                          : null
                      }
                    />
                  </div>
                </div>
              ) : null}

              {companyDetails ? (
                <div className='mt-4 rounded-xl border border-token bg-black/2 p-4'>
                  <div className='text-xs font-semibold uppercase tracking-wide muted'>
                    Company details
                  </div>
                  <div className='mt-2 grid grid-cols-1 gap-1 text-xs muted md:grid-cols-3'>
                    <Field
                      label='Company'
                      value={
                        typeof companyDetails['company_name'] === 'string'
                          ? String(companyDetails['company_name'])
                          : null
                      }
                    />
                    <Field
                      label='CIPC'
                      value={
                        typeof companyDetails['company_cipc'] === 'string'
                          ? String(companyDetails['company_cipc'])
                          : null
                      }
                    />
                    <Field
                      label='Address'
                      value={
                        typeof companyDetails['company_address'] === 'string'
                          ? String(companyDetails['company_address'])
                          : null
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className='rounded-xl border border-token bg-black/2 px-3 py-2'>
      <div className='text-[11px] font-semibold uppercase tracking-wide muted'>
        {label}
      </div>
      <div className='mt-1 truncate text-xs font-semibold text-[color:var(--foreground)]'>
        {value?.trim() ? value : '—'}
      </div>
    </div>
  );
}
