import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  logActionError,
  logActionInfo,
  logActionWarn,
} from '@/lib/server-action-logger';
import { userFacingError } from '@/lib/user-facing-error';
import { redirect } from 'next/navigation';

type TicketRow = {
  ticket_id: string;
  driver_id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
};

export default async function SupportPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('support_tickets')
    .select('ticket_id, driver_id, subject, body, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  async function setStatus(formData: FormData) {
    'use server';
    const ticketId = String(formData.get('ticket_id') ?? '');
    const status = String(formData.get('status') ?? '');
    const reason = String(formData.get('reason') ?? '');
    logActionInfo('admin.support.set_status', 'started', {
      ticketId,
      status,
      hasReason: Boolean(reason.trim()),
    });

    if (!ticketId || !status) {
      logActionWarn('admin.support.set_status', 'invalid_request', {
        ticketId,
        status,
      });
      redirect('/support?error=invalid_request');
    }
    if (!reason.trim()) {
      logActionWarn('admin.support.set_status', 'missing_reason', {
        ticketId,
        status,
      });
      redirect('/support?error=reason_required');
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logActionWarn('admin.support.set_status', 'not_authenticated', {
        ticketId,
        status,
      });
      redirect('/login');
    }

    const { error } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('ticket_id', ticketId);

    if (error) {
      logActionError('admin.support.set_status', 'update_failed', error, {
        ticketId,
        status,
        userId: user.id,
      });
      redirect(`/support?error=${encodeURIComponent(userFacingError(error))}`);
    }

    await supabase.rpc('admin_audit_log', {
      p_action: 'support_ticket.status_update',
      p_entity_type: 'support_tickets',
      p_entity_id: ticketId,
      p_reason: reason,
      p_metadata: { status },
    });

    logActionInfo('admin.support.set_status', 'completed', {
      ticketId,
      status,
      userId: user.id,
    });
    redirect('/support');
  }

  if (error) {
    return (
      <div className='p-6'>
        <h1 className='text-lg font-semibold'>Support</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as TicketRow[];

  return (
    <div className='p-6'>
      <div className='flex items-baseline justify-between gap-4'>
        <h1 className='text-lg font-semibold'>Support tickets</h1>
        <p className='text-sm text-zinc-600'>Showing latest {rows.length}</p>
      </div>

      <div className='mt-4 overflow-hidden rounded-xl border bg-white'>
        <table className='w-full text-sm'>
          <thead className='border-b bg-zinc-50 text-left'>
            <tr>
              <th className='px-4 py-3 font-medium'>Subject</th>
              <th className='px-4 py-3 font-medium'>Driver</th>
              <th className='px-4 py-3 font-medium'>Status</th>
              <th className='px-4 py-3 font-medium'>Created</th>
              <th className='px-4 py-3 font-medium'>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.ticket_id}
                className='border-b last:border-b-0 align-top'
              >
                <td className='px-4 py-3'>
                  <div className='font-medium'>{r.subject}</div>
                  <div className='mt-1 text-xs text-zinc-600 line-clamp-3'>
                    {r.body}
                  </div>
                </td>
                <td className='px-4 py-3 font-mono text-xs'>{r.driver_id}</td>
                <td className='px-4 py-3'>{r.status}</td>
                <td className='px-4 py-3'>
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className='px-4 py-3'>
                  <form action={setStatus} className='space-y-2'>
                    <input type='hidden' name='ticket_id' value={r.ticket_id} />
                    <select
                      name='status'
                      className='h-9 w-full rounded-md border px-2 text-xs'
                      defaultValue={r.status}
                    >
                      <option value='OPEN'>OPEN</option>
                      <option value='IN_PROGRESS'>IN_PROGRESS</option>
                      <option value='RESOLVED'>RESOLVED</option>
                      <option value='CLOSED'>CLOSED</option>
                    </select>
                    <input
                      name='reason'
                      placeholder='Reason (required)'
                      className='h-9 w-full rounded-md border px-3 text-xs'
                      required
                    />
                    <button className='h-9 w-full rounded-md border bg-white text-xs font-medium hover:bg-zinc-50'>
                      Update
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className='px-4 py-6 text-sm text-zinc-600' colSpan={5}>
                  No tickets.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
