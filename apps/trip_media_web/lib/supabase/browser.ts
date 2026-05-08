import { createClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/nextjs';
import { getSupabasePublicEnv } from './env';

export function createSupabaseBrowserClient() {
  const { session } = useSession();
  const { url, anonKey } = getSupabasePublicEnv();

  return createClient(
    url,
    anonKey, // ← Use ANON_KEY, not publishable
    {
      async accessToken() {
        return (await session?.getToken()) ?? null;
      },
    },
  );
}
