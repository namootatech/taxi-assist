import Link from 'next/link';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { ClerkSignupClient } from '../ClerkSignupClient';
import { ClerkInviteAcceptClient } from '../invite/ClerkInviteAcceptClient';

export const dynamic = 'force-dynamic';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    next?: string;
    setup?: string;
    invite?: string;
  }>;
}) {
  const { error, next, setup, invite } = await searchParams;

  if (invite) {
    return <InviteAcceptShell token={invite} error={error} />;
  }

  return <PartnerSignupShell error={error} next={next} setup={setup} />;
}

async function InviteAcceptShell({
  token,
  error,
}: {
  token: string;
  error?: string;
}) {
  const supabase = await createClerkSupabaseServerClient();
  const { data: previewRows, error: previewError } = await supabase.rpc(
    'get_partner_invite_preview',
    {
      p_token: token,
    },
  );
  const preview = Array.isArray(previewRows) ? previewRows[0] : previewRows;

  let warning: string | null = null;
  if (previewError) {
    warning = 'We could not validate that invite. The link may be malformed.';
  } else if (!preview) {
    warning = 'That invite token is not recognised.';
  } else if (preview.is_revoked) {
    warning =
      'That invite was revoked. Ask the person who invited you for a fresh link.';
  } else if (preview.is_expired) {
    warning = 'That invite has expired. Ask for a new one.';
  } else if (preview.is_accepted) {
    warning =
      'That invite was already accepted. Sign in to access the workspace.';
  }

  return (
    <main className='grid min-h-svh place-items-center px-5 py-10'>
      <section className='panel w-full max-w-lg rounded-[1.5rem] p-6'>
        <Link
          href='/'
          className='focus-ring rounded-lg text-sm font-black uppercase tracking-[0.24em]'
        >
          Trip Media
        </Link>
        <h1 className='mt-8 text-3xl font-black tracking-[-0.04em]'>
          Accept your invite
        </h1>
        <p className='mt-3 leading-7 muted'>
          Set a password to join the workspace. If you already have a Trip Media
          login, use that password to sign in and accept.
        </p>
        {error ? (
          <div className='mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100'>
            {error}
          </div>
        ) : null}
        {warning ? (
          <div className='mt-5 rounded-2xl border border-amber-400/40 bg-amber-300/10 p-4 text-sm text-amber-100'>
            {warning}
            <p className='mt-2'>
              <Link
                href='/login'
                className='font-bold underline-offset-4 hover:underline'
              >
                Go to sign in
              </Link>
            </p>
          </div>
        ) : (
          <ClerkInviteAcceptClient token={token} />
        )}
      </section>
    </main>
  );
}

function PartnerSignupShell({
  error,
  next,
  setup,
}: {
  error?: string;
  next?: string;
  setup?: string;
}) {
  const isPartnerSetup = setup === 'partner';
  const rawNext = next?.startsWith('/') && !next.startsWith('//') ? next : null;
  const isDashboardPath = rawNext?.startsWith('/dashboard') ?? false;
  const safeNext = isDashboardPath
    ? (rawNext ?? '/dashboard/billing')
    : '/dashboard/billing';

  return (
    <main className='grid min-h-svh place-items-center px-5 py-10'>
      <ClerkSignupClient />
    </main>
  );
}
