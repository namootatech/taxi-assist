import { redirect } from 'next/navigation';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import Image from 'next/image';
import { ClerkRegisterClient } from './ClerkRegisterClient';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClerkSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  const { error } = await searchParams;

  return (
    <div
      data-surface='marketing'
      className='flex flex-1 items-center justify-center px-4 py-12'
    >
      <div className='w-full max-w-sm rounded-[2rem] border border-token surface-2 p-6 shadow-[var(--shadow)]'>
        <div className='flex items-center gap-3'>
          <Image
            src='/brand/trip-icon.png'
            alt='Trip'
            width={36}
            height={36}
            className='rounded-lg'
          />
          <div>
            <div className='text-xs font-medium muted'>Trip</div>
            <h1 className='text-lg font-semibold tracking-tight'>
              Create admin account
            </h1>
          </div>
        </div>
        <p className='mt-3 text-sm muted'>
          Create a support admin account to start.
        </p>
        {error ? (
          <div className='mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {decodeURIComponent(error)}
          </div>
        ) : null}

        <div className='mt-6'>
          <ClerkRegisterClient />
        </div>

        <p className='mt-4 text-xs muted'>
          Already have an account?{' '}
          <a className='underline underline-offset-4' href='/login'>
            Sign in
          </a>
          .
        </p>
      </div>
    </div>
  );
}
