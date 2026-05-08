'use client';

import { SignUp, SignedIn, useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export function ClerkSignupClient() {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = useMemo(() => {
    const raw = searchParams.get('next') ?? '';
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
    return raw;
  }, [searchParams]);

  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    if (isExchanging) return;
    setIsExchanging(true);
    router.push(next);
  }, [isSignedIn, isExchanging, next, router]);

  return (
    <>
      {hasClerkKey ? (
        <SignUp routing='path' path='/signup' signInUrl='/login' />
      ) : (
        <div className='rounded-2xl border border-[var(--border)] bg-white/5 p-4 text-sm text-white/80'>
          Missing <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>. Add it to your
          environment to enable sign-up.
        </div>
      )}
      <SignedIn>
        <div className='mt-6 text-sm muted'>User is signed in</div>
      </SignedIn>
    </>
  );
}
