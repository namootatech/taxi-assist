import Link from 'next/link';
import { ClerkLoginClient } from '../ClerkLoginClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; invite?: string }>;
}) {
  const { next, error, invite } = await searchParams;

  return (
    <main className='grid min-h-svh place-items-center px-5 py-10'>
      <section className='panel w-full max-w-md rounded-[1.5rem] p-6'>
        <Link
          href='/'
          className='focus-ring rounded-lg text-sm font-black uppercase tracking-[0.24em]'
        >
          Trip Media
        </Link>

        <div className='mt-6'>
          <ClerkLoginClient />
        </div>
      </section>
    </main>
  );
}
