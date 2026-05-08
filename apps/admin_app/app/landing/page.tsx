import Link from 'next/link';
import Image from 'next/image';

export default function AdminLandingPage() {
  return (
    <div data-surface='marketing'>
      <main className='min-h-dvh'>
        <header className='sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-2)]/70 backdrop-blur-xl'>
          <div className='mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 md:px-8'>
            <div className='flex items-center gap-2'>
              <Image
                src='/brand/trip-logo.png'
                alt='Trip'
                width={156}
                height={40}
                priority
                className='h-auto w-auto max-w-[160px]'
              />
            </div>

            <div className='flex items-center gap-2'>
              <Link
                href='/login'
                className='focus-ring rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-black text-[var(--foreground)] shadow-sm'
              >
                Sign in
              </Link>
              <Link
                href='/register'
                className='focus-ring rounded-full bg-[var(--brand-red)] px-4 py-2 text-sm font-black text-white shadow-xl shadow-red-500/20'
              >
                Create account
              </Link>
            </div>
          </div>
        </header>

        <section className='relative overflow-hidden'>
          <div className='mx-auto grid min-h-[calc(100svh-72px)] max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-[0.95fr_1.05fr] md:px-8 md:py-20'>
            <div className='relative z-10'>
              <p className='text-sm font-black uppercase tracking-[0.28em] text-[var(--brand-red)]'>
                Trip Admin
              </p>
              <h1 className='mt-5 text-balance text-5xl font-black leading-[0.96] tracking-[-0.06em] md:text-7xl'>
                Keep drivers moving—with decisions you can trust later.
              </h1>
              <p className='mt-6 max-w-xl text-lg leading-8'>
                Review verification, resolve support, and manage payouts with a
                clean audit trail and clear next actions.
              </p>

              <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
                <Link
                  href='/login'
                  className='focus-ring inline-flex items-center justify-center rounded-full bg-[var(--brand-red)] px-6 py-3 text-sm font-black text-white shadow-xl shadow-red-500/20'
                >
                  Open console
                </Link>
                <Link
                  href='/register'
                  className='focus-ring inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-black text-[var(--foreground)]'
                >
                  Create account
                </Link>
              </div>

              <p className='mt-6 text-xs'>
                Internal tool — access is permissioned.
              </p>
            </div>

            <div className='surface relative overflow-hidden rounded-[2rem] border border-[var(--border)] p-5 shadow-[var(--shadow)]'>
              <div className='rounded-[1.5rem] bg-white p-5 text-[#122033]'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-xs font-black uppercase tracking-[0.2em] text-[var(--brand-red)]'>
                      Console preview
                    </div>
                    <div className='mt-2 text-2xl font-black'>Today</div>
                  </div>
                  <span className='rounded-full bg-[var(--brand-navy)] px-3 py-1 text-xs font-black text-white'>
                    Live
                  </span>
                </div>
                <div className='mt-6 grid gap-3 sm:grid-cols-3'>
                  <Kpi label='Trips completed' value='128' />
                  <Kpi label='Docs to review' value='14' />
                  <Kpi label='Open tickets' value='6' />
                </div>
                <div className='mt-4 rounded-2xl border border-slate-200 p-4'>
                  <div className='text-xs font-black uppercase tracking-[0.2em] text-slate-500'>
                    Recent actions
                  </div>
                  <div className='mt-3 space-y-2'>
                    <LogLine
                      action='Approved driver documents'
                      meta='Verification'
                    />
                    <LogLine action='Resolved ticket #1024' meta='Support' />
                    <LogLine action='Queued weekly payout' meta='Finance' />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl border border-white/10 bg-white/5 p-3'>
      <div className='text-xs text-white/60'>{label}</div>
      <div className='mt-1 text-2xl font-semibold tracking-tight'>{value}</div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className='rounded-xl border border-white/10 bg-white/5 p-4'>
      <div className='text-sm font-semibold'>{title}</div>
      <div className='mt-1 text-sm text-white/70'>{body}</div>
    </div>
  );
}

function LogLine({ action, meta }: { action: string; meta: string }) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/30 px-3 py-2'>
      <div className='text-sm text-white/85'>{action}</div>
      <div className='rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60'>
        {meta}
      </div>
    </div>
  );
}
