"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { DashboardPageNav } from "@/components/layout/DashboardPageNav";

type NavItem = { href: string; label: string };

const navGroups: Array<{ label: string; items: Array<NavItem> }> = [
  { label: "Operations", items: [] },
  { label: "Quality & Safety", items: [] },
  { label: "Money", items: [] },
  { label: "System", items: [] },
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
  ["/dashboard", "/trips", "/drivers", "/riders", "/vehicles"].forEach((href) => {
    const it = pick(href);
    if (it) groups[0].items.push(it);
  });

  // Quality & Safety
  ["/verification", "/ratings", "/support"].forEach((href) => {
    const it = pick(href);
    if (it) groups[1].items.push(it);
  });

  // Money
  ["/payments", "/wallets", "/ads"].forEach((href) => {
    const it = pick(href);
    if (it) groups[2].items.push(it);
  });

  // System
  ["/admins", "/analytics", "/audit", "/settings"].forEach((href) => {
    const it = pick(href);
    if (it) groups[3].items.push(it);
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
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
        active ? "bg-white/12 text-white" : "text-white/80 hover:bg-white/8 hover:text-white",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
    >
      <span
        className={[
          "h-1.5 w-1.5 shrink-0 rounded-full transition",
          active ? "bg-[var(--brand-red)]" : "bg-white/35 group-hover:bg-white/55",
        ].join(" ")}
        aria-hidden
      />
      {collapsed ? null : <span className="truncate">{label}</span>}
    </Link>
  );
}

export function AppShell({
  nav,
  userEmail,
  role,
  onSignOut,
  children,
}: {
  nav: Array<NavItem>;
  userEmail: string;
  role: string | null;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const groups = useMemo(() => groupNav(nav), [nav]);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const commands = useMemo(
    () =>
      nav.map((n) => ({
        title: n.label,
        subtitle: "Jump to section",
        href: n.href,
      })),
    [nav],
  );

  return (
    <div className="flex min-h-dvh w-full surface-2">
      <CommandPalette commands={commands} open={commandOpen} onOpenChange={setCommandOpen} />
      <aside
        className={[
          "hidden md:flex",
          collapsed ? "w-20" : "w-[304px]",
          "flex-col border-r border-white/10 bg-[var(--brand-navy-900)] text-white transition-[width] duration-200",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-3">
            {collapsed ? (
              <Image src="/brand/trip-icon.png" alt="Trip" width={36} height={36} className="rounded-lg" priority />
            ) : (
              <Image
                src="/brand/trip-logo.png"
                alt="Trip"
                width={168}
                height={40}
                priority
                className="h-auto w-auto max-w-[180px]"
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <div className={["px-4", collapsed ? "hidden" : "block"].join(" ")}>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60">Session</div>
            <div className="mt-1 truncate text-sm font-medium text-white/90">{userEmail}</div>
            {role ? (
              <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                {role}
              </div>
            ) : null}
          </div>
        </div>

        <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
          {groups.map((g) => (
            <div key={g.label}>
              <div
                className={[
                  "px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45",
                  collapsed ? "sr-only" : "",
                ].join(" ")}
              >
                {g.label}
              </div>
              <div className="flex flex-col gap-1">
                {g.items.map((it) => {
                  const active =
                    pathname === it.href ||
                    (it.href !== "/dashboard" && pathname.startsWith(`${it.href}/`));
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

        <div className="mt-auto p-4">
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
          >
            <span className={collapsed ? "sr-only" : ""}>Sign out</span>
            <span className="text-xs text-white/60">{collapsed ? "↩" : "↩ logout"}</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-token surface-1 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Image src="/brand/trip-icon.png" alt="Trip" width={34} height={34} className="rounded-lg" priority />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Operations Console</div>
              <div className="text-xs muted">Live system view • Audit-ready actions</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden h-9 items-center gap-2 rounded-lg border border-token bg-transparent px-3 text-sm font-medium text-[color:var(--muted)] hover:border-[var(--brand-red)] hover:text-[color:var(--foreground)] md:flex"
              onClick={() => setCommandOpen(true)}
            >
              <span className="inline-flex size-2 rounded-full bg-[var(--brand-red)]/70" aria-hidden />
              Search
              <span className="ml-2 rounded-md border border-token px-1.5 py-0.5 text-xs muted">⌘ K</span>
            </button>
            <div className="hidden rounded-lg border border-token px-3 py-2 text-xs muted md:block">
              {userEmail}
            </div>
          </div>
        </header>

        <DashboardPageNav />

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

