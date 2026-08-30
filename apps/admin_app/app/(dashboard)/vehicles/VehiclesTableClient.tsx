'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type VehicleListRow = {
  vehicle_id: string;
  registration_number: string;
  make: string;
  model: string;
  colour: string;
  category: string;
  status: string;
  linked_driver_id: string | null;
  linked_driver: Array<{
    full_name: string | null;
    cellphone: string | null;
  }> | null;
  updated_at: string;
};

const tabs: Array<{
  key: 'pending' | 'approved' | 'rejected' | 'all';
  label: string;
  statuses: Array<string> | null;
}> = [
  { key: 'pending', label: 'Pending', statuses: ['PENDING'] },
  { key: 'approved', label: 'Approved', statuses: ['APPROVED'] },
  { key: 'rejected', label: 'Rejected', statuses: ['REJECTED', 'SUSPENDED'] },
  { key: 'all', label: 'All', statuses: null },
];

function StatusPill({ value }: { value: string | null }) {
  const v = (value ?? '—').toUpperCase();
  const cls =
    v === 'APPROVED'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : v === 'PENDING'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : v === 'REJECTED' || v === 'SUSPENDED'
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : 'border-token bg-black/3 text-[color:var(--muted)]';
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {v.toLowerCase()}
    </span>
  );
}

function driverLabel(row: VehicleListRow) {
  const driver = row.linked_driver?.[0];
  if (!driver) return null;
  return {
    name: driver.full_name ?? 'Unnamed driver',
    phone: driver.cellphone ?? '—',
  };
}

export function VehiclesTableClient({ rows }: { rows: Array<VehicleListRow> }) {
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('pending');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const active = tabs.find((t) => t.key === tab) ?? tabs[0];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (active.statuses && !active.statuses.includes((r.status ?? '').toUpperCase())) {
        return false;
      }
      if (!q) return true;
      const driver = driverLabel(r);
      const hay =
        `${r.registration_number} ${r.make} ${r.model} ${r.category} ${r.status} ${driver?.name ?? ''} ${driver?.phone ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, tab, query]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-wrap gap-2'>
          {tabs.map((t) => {
            const count =
              t.statuses == null
                ? rows.length
                : rows.filter((r) => t.statuses!.includes((r.status ?? '').toUpperCase()))
                    .length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type='button'
                onClick={() => setTab(t.key)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  active
                    ? 'border-[var(--brand-navy-900)] bg-[var(--brand-navy-900)] text-white'
                    : 'border-token hover:bg-black/3',
                ].join(' ')}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search reg, make, driver…'
          className='h-10 w-full rounded-lg border border-token bg-transparent px-3 text-sm md:max-w-xs'
          aria-label='Search vehicles'
        />
      </div>

      <div className='overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]'>
        <table className='w-full text-sm'>
          <thead className='border-b border-token bg-[var(--surface-1)] text-left'>
            <tr>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Vehicle
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Make/Model
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Category
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Status
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Driver
              </th>
              <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide muted'>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const driver = driverLabel(r);
              const pending = (r.status ?? '').toUpperCase() === 'PENDING';
              return (
                <tr
                  key={r.vehicle_id}
                  className='border-b border-token hover:bg-black/3 last:border-b-0'
                >
                  <td className='px-4 py-3'>
                    <div className='font-medium'>{r.registration_number}</div>
                    <div className='text-xs muted'>
                      {r.colour ? `${r.colour} • ` : ''}
                      {r.updated_at
                        ? new Date(r.updated_at).toLocaleString()
                        : '—'}
                    </div>
                  </td>
                  <td className='px-4 py-3'>
                    {r.make || r.model ? `${r.make} ${r.model}`.trim() : '—'}
                  </td>
                  <td className='px-4 py-3'>{r.category ?? '—'}</td>
                  <td className='px-4 py-3'>
                    <StatusPill value={r.status} />
                  </td>
                  <td className='px-4 py-3'>
                    {driver ? (
                      <div>
                        <div className='font-semibold'>{driver.name}</div>
                        <div className='text-xs muted'>{driver.phone}</div>
                      </div>
                    ) : (
                      <span className='text-xs muted'>—</span>
                    )}
                  </td>
                  <td className='px-4 py-3'>
                    <Link
                      href={`/vehicles/${r.vehicle_id}`}
                      className={[
                        'inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold',
                        pending
                          ? 'bg-[var(--brand-navy-900)] text-white hover:brightness-110'
                          : 'border border-token hover:bg-black/3',
                      ].join(' ')}
                    >
                      {pending ? 'Review' : 'Open'}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td className='px-4 py-10 text-sm muted' colSpan={6}>
                  No vehicles match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
