import { redirect } from 'next/navigation';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { ClerkRegisterClient } from '../ClerkRegisterClient';

export default async function RegisterPage() {
  const supabase = await createClerkSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div
      data-surface='marketing'
      className='flex flex-1 items-center justify-center px-4 py-12'
    >
      <ClerkRegisterClient />
    </div>
  );
}
