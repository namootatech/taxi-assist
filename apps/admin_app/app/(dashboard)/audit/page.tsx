import { createSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';

type AuditRow = {
  audit_id: number;
  actor_user_id: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  created_at: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entity_type?: string;
    actor_role?: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { action, entity_type, actor_role } = await searchParams;

  let q = supabase
    .from('audit_logs')
    .select(
      'audit_id, actor_user_id, actor_role, action, entity_type, entity_id, reason, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (action) q = q.eq('action', action);
  if (entity_type) q = q.eq('entity_type', entity_type);
  if (actor_role) q = q.eq('actor_role', actor_role);

  const { data, error } = await q;

  if (error) {
    return (
      <div className='p-6'>
        <h1 className='text-lg font-semibold'>Audit</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as AuditRow[];

  return (
    <div className='p-6'>
      <div className='flex items-baseline justify-between gap-4'>
        <h1 className='text-lg font-semibold'>Audit log</h1>
        <p className='text-sm text-zinc-600'>Latest {rows.length}</p>
      </div>

      <div className='mt-4 overflow-hidden rounded-xl border bg-white'>
        <table className='w-full text-sm'>
          <thead className='border-b bg-zinc-50 text-left'>
            <tr>
              <th className='px-4 py-3 font-medium'>When</th>
              <th className='px-4 py-3 font-medium'>Actor</th>
              <th className='px-4 py-3 font-medium'>Action</th>
              <th className='px-4 py-3 font-medium'>Entity</th>
              <th className='px-4 py-3 font-medium'>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.audit_id}
                className='border-b last:border-b-0 align-top'
              >
                <td className='px-4 py-3'>
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className='px-4 py-3'>
                  <div className='text-xs text-zinc-600'>{r.actor_role}</div>
                  <div className='font-mono text-xs'>{r.actor_user_id}</div>
                </td>
                <td className='px-4 py-3'>{r.action}</td>
                <td className='px-4 py-3'>
                  <div className='text-xs text-zinc-600'>{r.entity_type}</div>
                  <div className='font-mono text-xs'>{r.entity_id ?? '—'}</div>
                </td>
                <td className='px-4 py-3'>{r.reason ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className='px-4 py-6 text-sm text-zinc-600' colSpan={5}>
                  No audit entries.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
