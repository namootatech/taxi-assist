import { redirect } from 'next/navigation';
import { Building2, KeyRound, ShieldOff, UserCircle } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { canCloseOrg, canEditOrg } from '@/lib/permissions';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import {
  AccountForm,
  CloseWorkspaceButton,
  OrgProfileForm,
  PasswordForm,
} from './SettingsForms';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const context = await getPartnerContext();

  if (!context) {
    redirect('/signup?setup=partner&next=/dashboard/settings');
  }

  const supabase = await createClerkSupabaseServerClient();
  const [
    { data: partner },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from('media_partners')
      .select(
        'name, legal_name, registration_number, billing_country, billing_currency, status',
      )
      .eq('id', context.partner.id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? '';
  const canEdit = canEditOrg(context.member.role);
  const canClose = canCloseOrg(context.member.role);

  return (
    <div className='space-y-8'>
      <header>
        <p className='text-xs font-black uppercase tracking-[0.22em] text-red-200'>
          Settings
        </p>
        <h1 className='mt-2 text-4xl font-black tracking-[-0.04em]'>
          Profile & settings
        </h1>
        <p className='mt-2 max-w-2xl text-sm muted'>
          Manage your company profile, your personal account, and the workspace
          lifecycle. Some actions are reserved for owners only.
        </p>
      </header>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <Building2 className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>
            Organization
          </h2>
          {!canEdit ? (
            <span className='rounded-full border border-amber-400/40 bg-amber-300/10 px-2 py-0.5 text-xs text-amber-100'>
              View only
            </span>
          ) : null}
        </div>
        <p className='mt-2 text-sm muted'>
          Used for invoices, billing currency, and any compliance documentation
          Trip Media generates for your workspace.
        </p>
        <div className='mt-4'>
          <OrgProfileForm
            canEdit={canEdit}
            defaultValues={{
              name: partner?.name ?? context.partner.name,
              legal_name: partner?.legal_name ?? '',
              registration_number: partner?.registration_number ?? '',
              billing_country: partner?.billing_country ?? 'ZA',
              billing_currency: partner?.billing_currency ?? 'ZAR',
            }}
          />
        </div>
      </section>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <UserCircle className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>
            Your account
          </h2>
        </div>
        <p className='mt-2 text-sm muted'>
          Update your display name. Email and login are managed via your
          workspace.
        </p>
        <div className='mt-4 grid gap-2 text-sm'>
          <p className='rounded-xl border border-[var(--border)] bg-white/4 px-4 py-3'>
            Email <span className='ml-2 font-bold'>{user?.email}</span>
          </p>
        </div>
        <div className='mt-4'>
          <AccountForm defaultFullName={fullName} />
        </div>
      </section>

      <section className='panel rounded-3xl p-6'>
        <div className='flex items-center gap-3'>
          <KeyRound className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>
            Change password
          </h2>
        </div>
        <p className='mt-2 text-sm muted'>
          Use a unique password. We do not show your previous password.
        </p>
        <div className='mt-4'>
          <PasswordForm />
        </div>
      </section>

      <section className='panel rounded-3xl border-red-300/30 p-6'>
        <div className='flex items-center gap-3'>
          <ShieldOff className='size-5 text-red-200' aria-hidden />
          <h2 className='text-lg font-black tracking-[-0.02em]'>Danger zone</h2>
        </div>
        <p className='mt-2 text-sm muted'>
          Closing the workspace marks it inactive. Members lose access
          immediately, and active campaigns stop delivering. Talk to support if
          you need a phased shutdown.
        </p>
        <div className='mt-4'>
          <CloseWorkspaceButton canClose={canClose} />
        </div>
      </section>
    </div>
  );
}
