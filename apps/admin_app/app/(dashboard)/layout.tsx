import { createSupabaseServerClient } from '@/lib/supabase/server';
import { allowedNavForRole } from '@/lib/permissions';
import { logActionError, logActionInfo } from '@/lib/server-action-logger';
import { AppShell } from '@/components/layout/AppShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: adminProfile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('user_id', user?.id ?? '')
    .maybeSingle();

  const role = adminProfile?.role ?? null;
  const nav = allowedNavForRole(role);

  return (
    <AppShell
      nav={nav}
      userEmail={user?.email ?? 'unknown'}
      role={role}
      onSignOut={async () => {
        'use server';
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
          logActionError('admin.signout', 'auth_signout_failed', error);
        } else {
          logActionInfo('admin.signout', 'completed');
        }
      }}
    >
      {children}
    </AppShell>
  );
}
