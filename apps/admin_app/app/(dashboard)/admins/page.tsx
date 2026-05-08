import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';
import { AdminsClient } from './AdminsClient';

type AdminRow = {
  user_id: string;
  role: string;
  disabled_at: string | null;
  created_at: string | null;
};

export default async function AdminsPage() {
  const supabase = await createClerkSupabaseServerClient();

  const { data, error } = await supabase
    .from('admin_profiles')
    .select('user_id, role, disabled_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>Admins</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as AdminRow[];
  return <AdminsClient rows={rows} />;
}
