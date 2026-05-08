import Link from 'next/link';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';

type RiderRow = {
  id: string;
  full_name: string | null;
  cellphone: string | null;
  profile_type: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default async function RidersPage() {
  const supabase = await createClerkSupabaseServerClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, cellphone, profile_type, created_at, updated_at')
    .eq('profile_type', 'RIDER')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>Riders</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as RiderRow[];

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>
        <div>
          <h1 className='text-xl font-semibold tracking-tight'>Riders</h1>
          <p className='mt-1 text-sm muted'>
            Review rider activity and risk signals. (This page will gain search,
            filters, and inline actions next.)
          </p>
        </div>
        <Link
          className='rounded-lg border border-token surface-1 px-3 py-2 text-sm font-semibold'
          href='/support'
        >
          Open support queue
        </Link>
      </div>

      <div className='overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]'>
        <div className='overflow-auto'>
          <table className='min-w-full text-sm'>
            <thead className='sticky top-0 z-10 bg-[var(--surface-1)]'>
              <tr className='border-b border-token'>
                <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide muted'>
                  Rider
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide muted'>
                  Phone
                </th>
                <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide muted'>
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className='border-b border-token hover:bg-black/3'
                >
                  <td className='px-4 py-3'>
                    <div className='font-semibold'>
                      {r.full_name ?? 'Unnamed rider'}
                    </div>
                    <div className='text-xs muted'>
                      Updated{' '}
                      {r.updated_at
                        ? new Date(r.updated_at).toLocaleString()
                        : '—'}
                    </div>
                  </td>
                  <td className='px-4 py-3'>{r.cellphone ?? '—'}</td>
                  <td className='px-4 py-3'>
                    {r.created_at
                      ? new Date(r.created_at).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td
                    className='px-4 py-12 text-center text-sm muted'
                    colSpan={3}
                  >
                    No riders found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
