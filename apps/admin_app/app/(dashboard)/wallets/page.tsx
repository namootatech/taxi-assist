import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';
import { WalletsClient } from './WalletsClient';

type WalletRow = {
  wallet_id: string;
  profile_id: string;
  wallet_type: string;
  balance: number;
  updated_at: string;
};

export default async function WalletsPage() {
  const supabase = await createClerkSupabaseServerClient();

  const { data, error } = await supabase
    .from('wallets')
    .select('wallet_id, profile_id, wallet_type, balance, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>Wallets</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as WalletRow[];

  const profileIds = Array.from(new Set(rows.map((r) => r.profile_id)));
  const { data: profileData } =
    profileIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name, cellphone')
          .in('id', profileIds)
      : {
          data: [] as Array<{
            id: string;
            full_name: string | null;
            cellphone: string | null;
          }>,
        };

  const profiles: Record<
    string,
    { id: string; full_name: string | null; cellphone: string | null }
  > = {};
  for (const p of profileData ?? []) profiles[p.id] = p;

  return <WalletsClient rows={rows} profiles={profiles} />;
}
