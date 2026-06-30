'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { DashboardPageNav } from '@/components/layout/DashboardPageNav';

type NavItem = { href: string; label: string };

const navGroups: Array<{ label: string; items: Array<NavItem> }> = [
  { label: 'Operations', items: [] },
  { label: 'Quality & Safety', items: [] },
  { label: 'Money', items: [] },
  { label: 'Trip Media', items: [] },
  { label: 'System', items: [] },
];

function groupNav(items: Array<NavItem>) {
  const byHref = new Map(items.map((i) => [i.href, i]));

  const groups = navGroups.map((g) => ({ ...g, items: [] as Array<NavItem> }));

  const pick = (href: string) => {
    const it = byHref.get(href);
    if (!it) return null;
    return it;
  };

  // Operations
  ['/dashboard', '/trips', '/drivers', '/riders', '/vehicles'].forEach(
    (href) => {
      const it = pick(href);
      if (it) groups[0].items.push(it);
    },
  );

  // Quality & Safety
  ['/verification', '/ratings', '/support'].forEach((href) => {
    const it = pick(href);
    if (it) groups[1].items.push(it);
  });

  // Money
  ['/payments', '/wallets'].forEach((href) => {
    const it = pick(href);
    if (it) groups[2].items.push(it);
  });

  // Trip Media (covers ad campaigns, creatives review, advertisers, rewards, fraud, analytics, reports, settings)
  [
    '/trip-media/overview',
    '/ads',
    '/creatives',
    '/trip-media/advertisers',
    '/trip-media/internal-ads',
    '/trip-media/rider-rewards',
    '/trip-media/fraud',
    '/trip-media/analytics',
    '/trip-media/reports',
    '/trip-media/settings',
  ].forEach((href) => {
    const it = pick(href);
    if (it) groups[3].items.push(it);
  });

  // System
  ['/admins', '/analytics', '/audit', '/settings'].forEach((href) => {
    const it = pick(href);
    if (it) groups[4].items.push(it);
  });

  return groups.filter((g) => g.items.length > 0);
}

function NavLink({
  href,
  label,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-900)]',
        active
          ? 'bg-white/12 text-white'
          : 'text-white/80 hover:bg-white/8 hover:text-white',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
    >
      <span
        className={[
          'h-1.5 w-1.5 shrink-0 rounded-full transition',
          active
            ? 'bg-[var(--brand-red)]'
            : 'bg-white/35 group-hover:bg-white/55',
        ].join(' ')}
        aria-hidden
      />
      {collapsed ? null : <span className='truncate'>{label}</span>}
    </Link>
  );
}

export function AppShell({
  nav,
  userEmail,
  role,
  children,
}: {
  nav: Array<NavItem>;
  userEmail: string;
  role: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const groups = useMemo(() => groupNav(nav), [nav]);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleSignOut() {
    // TODO: Implement sign out
  }

  const commands = useMemo(
    () =>
      nav.map((n) => ({
        title: n.label,
        subtitle: 'Jump to section',
        href: n.href,
      })),
    [nav],
  );

  return (
    <div className='flex min-h-dvh w-full surface-2'>
      <CommandPalette
        commands={commands}
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />

      {mobileNavOpen ? (
        <div
          className='fixed inset-0 z-50 md:hidden'
          role='dialog'
          aria-modal='true'
          aria-label='Navigation'
          onMouseDown={() => setMobileNavOpen(false)}
        >
          <div className='absolute inset-0 bg-black/35 backdrop-blur-sm' />
          <div
            className='absolute left-3 top-3 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-white/10 bg-[var(--brand-navy-900)] text-white shadow-[var(--shadow)]'
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between gap-2 p-4'>
              <div className='flex items-center gap-3'>
                <Image
                  src='/brand/trip-icon.png'
                  alt='Trip'
                  width={36}
                  height={36}
                  className='rounded-lg'
                  priority
                />
                <div className='min-w-0'>
                  <div className='truncate text-sm font-semibold tracking-tight'>
                    Operations Console
                  </div>
                  <div className='truncate text-xs text-white/60'>
                    {userEmail}
                  </div>
                </div>
              </div>
              <button
                type='button'
                className='rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-900)]'
                aria-label='Close navigation'
                onClick={() => setMobileNavOpen(false)}
              >
                Esc
              </button>
            </div>

            <nav className='flex max-h-[70dvh] flex-col gap-4 overflow-y-auto px-3 pb-4'>
              {groups.map((g) => (
                <div key={g.label}>
                  <div className='px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45'>
                    {g.label}
                  </div>
                  <div className='flex flex-col gap-1'>
                    {g.items.map((it) => {
                      const active =
                        pathname === it.href ||
                        (it.href !== '/dashboard' &&
                          pathname.startsWith(`${it.href}/`));

                      return (
                        <div
                          key={it.href}
                          onClick={() => setMobileNavOpen(false)}
                        >
                          <NavLink
                            href={it.href}
                            label={it.label}
                            active={active}
                            collapsed={false}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className='border-t border-white/10 p-4'>
              <button
                type='button'
                onClick={() => {
                  setMobileNavOpen(false);
                  void handleSignOut();
                }}
                className='flex w-full items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-900)]'
              >
                <span>Sign out</span>
                <span className='text-xs text-white/60'>↩ logout</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <aside
        className={[
          'hidden md:flex',
          collapsed ? 'w-20' : 'w-[304px]',
          'flex-col border-r border-white/10 bg-[var(--brand-navy-900)] text-white transition-[width] duration-200',
        ].join(' ')}
      >
        <div className='flex items-center justify-between gap-2 p-4'>
          <div className='flex items-center gap-3'>
            {collapsed ? (
              <Image
                src='/brand/trip-icon.png'
                alt='Trip'
                width={36}
                height={36}
                className='rounded-lg'
                priority
              />
            ) : (
              <Image
                src='/brand/trip-logo.png'
                alt='Trip'
                width={168}
                height={40}
                priority
                className='h-auto w-auto max-w-[180px]'
              />
            )}
          </div>
          <button
            type='button'
            onClick={() => setCollapsed((v) => !v)}
            className='rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-900)]'
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <div className={['px-4', collapsed ? 'hidden' : 'block'].join(' ')}>
          <div className='rounded-xl border border-white/10 bg-white/5 p-3'>
            <div className='text-xs text-white/60'>Session</div>
            <div className='mt-1 truncate text-sm font-medium text-white/90'>
              {userEmail}
            </div>
            {role ? (
              <div className='mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70'>
                {role}
              </div>
            ) : null}
          </div>
        </div>

        <nav className='mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4'>
          {groups.map((g) => (
            <div key={g.label}>
              <div
                className={[
                  'px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45',
                  collapsed ? 'sr-only' : '',
                ].join(' ')}
              >
                {g.label}
              </div>
              <div className='flex flex-col gap-1'>
                {g.items.map((it) => {
                  const active =
                    pathname === it.href ||
                    (it.href !== '/dashboard' &&
                      pathname.startsWith(`${it.href}/`));
                  return (
                    <NavLink
                      key={it.href}
                      href={it.href}
                      label={it.label}
                      active={active}
                      collapsed={collapsed}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className='mt-auto p-4'>
          <button
            type='button'
            onClick={() => void handleSignOut()}
            className='flex w-full items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-900)]'
          >
            <span className={collapsed ? 'sr-only' : ''}>Sign out</span>
            <span className='text-xs text-white/60'>
              {collapsed ? '↩' : '↩ logout'}
            </span>
          </button>
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-token surface-1 px-4 py-3 md:px-6'>
          <div className='flex items-center gap-3'>
            <div className='md:hidden'>
              <button
                type='button'
                className='rounded-lg border border-token bg-transparent p-1.5 text-[color:var(--foreground)] shadow-sm hover:border-[var(--brand-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2'
                aria-label='Open navigation'
                onClick={() => setMobileNavOpen(true)}
              >
                <span aria-hidden className='block text-lg leading-none'>
                  ≡
                </span>
              </button>
            </div>
            <div>
              <div className='text-sm font-semibold tracking-tight'>
                Operations Console
              </div>
              <div className='text-xs muted'>
                Live operations • Actions are logged
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              className='hidden h-9 items-center gap-2 rounded-lg border border-token bg-transparent px-3 text-sm font-medium text-[color:var(--muted)] hover:border-[var(--brand-red)] hover:text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 md:flex'
              onClick={() => setCommandOpen(true)}
            >
              <span
                className='inline-flex size-2 rounded-full bg-[var(--brand-red)]/70'
                aria-hidden
              />
              Search
              <span className='ml-2 rounded-md border border-token px-1.5 py-0.5 text-xs muted'>
                ⌘ K
              </span>
            </button>
            <div className='hidden rounded-lg border border-token px-3 py-2 text-xs muted md:block'>
              {userEmail}
            </div>
          </div>
        </header>

        <DashboardPageNav />

        <main className='min-w-0 flex-1 p-4 md:p-6'>
          <div className='mx-auto w-full max-w-[1480px]'>{children}</div>
        </main>
      </div>
    </div>
  );
}
