import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { MarkAllReadButton, MarkReadIconButton } from './NotificationActions';

export const dynamic = 'force-dynamic';

const KIND_PALETTE: Record<string, string> = {
  info: 'border-sky-300/40 bg-sky-300/10 text-sky-100',
  success: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100',
  warning: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
  error: 'border-red-300/40 bg-red-500/10 text-red-100',
};

export default async function NotificationsPage() {
  const context = await getPartnerContext();
  if (!context) {
    redirect('/signup?setup=partner&next=/dashboard/notifications');
  }

  const supabase = await createClerkSupabaseServerClient();
  const { data: notifications } = await supabase
    .from('partner_notifications')
    .select('id, kind, title, body, link, read_at, created_at')
    .eq('partner_id', context.partner.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const unreadCount = (notifications ?? []).filter(
    (entry) => !entry.read_at,
  ).length;

  return (
    <div className='space-y-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black uppercase tracking-[0.22em] text-red-200'>
            Notifications
          </p>
          <h1 className='mt-2 text-4xl font-black tracking-[-0.04em]'>
            What's new in your workspace
          </h1>
          <p className='mt-2 max-w-2xl text-sm muted'>
            Activity from creative reviews, campaign moderation, billing, and
            team changes shows up here. Cleared notifications stop counting
            toward the badge.
          </p>
        </div>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </header>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <Bell className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>Recent</h2>
          <span className='rounded-full border border-[var(--border)] bg-white/4 px-2 py-0.5 text-xs muted'>
            {notifications?.length ?? 0}
          </span>
        </div>
        {notifications?.length ? (
          <ul className='mt-4 space-y-3'>
            {notifications.map((notification) => {
              const palette =
                KIND_PALETTE[notification.kind] ?? KIND_PALETTE.info;
              return (
                <li
                  key={notification.id}
                  className={`rounded-2xl border p-4 ${palette} ${notification.read_at ? 'opacity-60' : ''}`}
                >
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                    <div>
                      <p className='text-xs font-black uppercase tracking-[0.18em]'>
                        {notification.kind} ·{' '}
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                      <p className='mt-1 text-base font-bold'>
                        {notification.title}
                      </p>
                      <p className='mt-1 text-sm opacity-90'>
                        {notification.body}
                      </p>
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          className='mt-2 inline-block text-xs font-bold underline-offset-4 hover:underline'
                        >
                          View details
                        </Link>
                      ) : null}
                    </div>
                    {!notification.read_at ? (
                      <MarkReadIconButton notificationId={notification.id} />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className='mt-4 rounded-2xl border border-[var(--border)] bg-white/4 p-4 text-sm muted'>
            Nothing here yet. We'll log creative reviews, campaign updates,
            billing alerts, and team changes here as they happen.
          </p>
        )}
      </section>
    </div>
  );
}
