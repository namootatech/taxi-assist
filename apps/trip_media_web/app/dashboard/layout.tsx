import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { getPartnerContext } from '@/lib/partner';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClerkSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?error=not_authenticated');
  }

  const context = await getPartnerContext();

  let notificationCount = 0;
  if (context) {
    const { count, error } = await supabase
      .from('partner_notifications')
      .select('id', { head: true, count: 'exact' })
      .eq('partner_id', context.partner.id)
      .is('read_at', null);
    if (!error) {
      notificationCount = count ?? 0;
    }
  }

  return (
    <>
      <AppShell
        partnerName={context?.partner.name || 'Partner workspace'}
        userEmail={user.email ?? ''}
        role={context?.member.role ?? null}
        notificationCount={notificationCount}
      >
        {children}
      </AppShell>
      <Toaster
        position='top-right'
        theme='dark'
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </>
  );
}
