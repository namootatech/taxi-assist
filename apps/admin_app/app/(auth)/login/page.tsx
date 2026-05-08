import { redirect } from 'next/navigation';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import Image from 'next/image';
import { ClerkLoginClient } from './ClerkLoginClient';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await createClerkSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  const { next, error } = await searchParams;

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
              Admin Console
            </h1>
          </div>
        </div>

        <p className='mt-3 text-sm muted'>
          Sign in to manage verification, support, and payouts.
        </p>
        <p className='mt-2 text-xs muted'>
          New here?{' '}
          <a className='underline underline-offset-4' href='/landing'>
            View the console overview
          </a>
          .
        </p>
        {error ? (
          <div className='mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {error === 'not_admin'
              ? 'This account is not authorized for the admin console.'
              : decodeURIComponent(error)}
          </div>
        ) : null}

        {/* simple, dependency-free form */}
        <div className='mt-6'>
          <ClerkLoginClient />
        </div>
      </div>
    </div>
  );
}
