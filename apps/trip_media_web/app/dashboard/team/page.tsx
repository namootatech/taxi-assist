import { redirect } from 'next/navigation';
import { ShieldCheck, Users } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { canInviteMembers } from '@/lib/permissions';
import { ROLE_EXPLAINERS } from '@/lib/role-content';
import { getSiteOrigin } from '@/lib/site-url';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { InviteMemberDialog } from './InviteMemberDialog';
import { MemberRow } from './MemberRow';
import { PendingInviteRow } from './PendingInviteRow';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const context = await getPartnerContext();

  if (!context) {
    redirect('/signup?setup=partner&next=/dashboard/team');
  }

  const supabase = await createClerkSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const siteOrigin = await getSiteOrigin();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from('partner_members')
      .select('id, email, role, joined_at, user_id')
      .eq('partner_id', context.partner.id)
      .not('joined_at', 'is', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('partner_invites')
      .select('id, email, role, token, expires_at')
      .eq('partner_id', context.partner.id)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const canManage = canInviteMembers(context.member.role);

  return (
    <div className='space-y-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black uppercase tracking-[0.22em] text-red-200'>
            Team
          </p>
          <h1 className='mt-2 text-4xl font-black tracking-[-0.04em]'>
            Members & invites
          </h1>
          <p className='mt-2 max-w-2xl text-sm muted'>
            Workspace access is partner-scoped. Roles control what each member
            can change. We do not deliver invite emails yet — when you create an
            invite, we generate a one-time link that you can share manually.
          </p>
        </div>
        {canManage ? <InviteMemberDialog siteOrigin={siteOrigin} /> : null}
      </header>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <Users className='size-5 text-red-200' aria-hidden />
          <h2 className='text-xl font-black tracking-[-0.02em]'>
            Active members
          </h2>
          <span className='rounded-full border border-[var(--border)] bg-white/4 px-2 py-0.5 text-xs muted'>
            {members?.length ?? 0}
          </span>
        </div>
        <div className='mt-4 overflow-hidden rounded-2xl border border-[var(--border)]'>
          <table className='w-full min-w-[36rem] text-left text-sm'>
            <thead className='bg-white/8 text-xs uppercase tracking-[0.18em] muted'>
              <tr>
                <th className='px-4 py-3'>Member</th>
                <th className='px-4 py-3'>Role</th>
                <th className='px-4 py-3'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  canManage={canManage}
                  isSelf={member.user_id === user?.id}
                />
              ))}
              {!members?.length ? (
                <tr>
                  <td
                    colSpan={3}
                    className='px-4 py-6 text-center text-sm muted'
                  >
                    Nobody else has joined yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <ShieldCheck className='size-5 text-red-200' aria-hidden />
          <h2 className='text-xl font-black tracking-[-0.02em]'>
            Pending invites
          </h2>
          <span className='rounded-full border border-[var(--border)] bg-white/4 px-2 py-0.5 text-xs muted'>
            {invites?.length ?? 0}
          </span>
        </div>
        {invites?.length ? (
          <div className='mt-4 overflow-hidden rounded-2xl border border-[var(--border)]'>
            <table className='w-full min-w-[40rem] text-left text-sm'>
              <thead className='bg-white/8 text-xs uppercase tracking-[0.18em] muted'>
                <tr>
                  <th className='px-4 py-3'>Invitee</th>
                  <th className='px-4 py-3'>Role</th>
                  <th className='px-4 py-3'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <PendingInviteRow
                    key={invite.id}
                    invite={invite}
                    siteOrigin={siteOrigin}
                    canManage={canManage}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className='mt-4 rounded-2xl border border-[var(--border)] bg-white/4 p-4 text-sm muted'>
            No invites are waiting.{' '}
            {canManage
              ? 'Use the Invite member button to send one.'
              : 'Ask an owner or admin to invite you.'}
          </p>
        )}
      </section>

      <section className='panel rounded-3xl p-6'>
        <h2 className='text-xl font-black tracking-[-0.02em]'>
          What each role can do
        </h2>
        <p className='mt-2 max-w-2xl text-sm muted'>
          Roles map to row-level permissions in the database. Server-side checks
          always win, so changing a role takes effect immediately for that
          member.
        </p>
        <div className='mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {ROLE_EXPLAINERS.map((entry) => (
            <article
              key={entry.role}
              className='rounded-2xl border border-[var(--border)] bg-white/4 p-5'
            >
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${entry.badgeClass}`}
              >
                {entry.title}
              </span>
              <p className='mt-3 text-sm muted'>{entry.summary}</p>
              <div className='mt-4 grid gap-2 text-xs'>
                <p className='font-semibold uppercase tracking-[0.2em] text-emerald-200'>
                  Can
                </p>
                <ul className='space-y-1 text-white/85'>
                  {entry.responsibilities.map((line) => (
                    <li key={line} className='flex gap-2'>
                      <span aria-hidden>•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className='mt-3 font-semibold uppercase tracking-[0.2em] text-red-200'>
                  Cannot
                </p>
                <ul className='space-y-1 text-white/85'>
                  {entry.cannotDo.map((line) => (
                    <li key={line} className='flex gap-2'>
                      <span aria-hidden>•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
