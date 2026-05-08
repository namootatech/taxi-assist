"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell, ChevronLeft, ChevronRight, LifeBuoy, LogOut, Menu, X } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { SIDEBAR_NAV, type SidebarNavItem } from "@/components/layout/SidebarNav"
import { roleLabel } from "@/lib/permissions"

interface AppShellProps {
  partnerName: string
  userEmail: string
  role: string | null
  notificationCount: number
  children: React.ReactNode
}

const cardClass = "rounded-2xl border border-[var(--border)] bg-white/4 p-3"

export function AppShell({
  partnerName,
  userEmail,
  role,
  notificationCount,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const clerk = useClerk()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`))

  async function handleSignOut() {
    await clerk.signOut({ redirectUrl: "/login" })
  }

  return (
    <div className="flex min-h-svh">
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Trip Media navigation"
          onMouseDown={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
          <aside
            className="absolute left-3 top-3 flex max-h-[94dvh] w-[min(88vw,320px)] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <SidebarHeader
              partnerName={partnerName}
              userEmail={userEmail}
              role={role}
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              toggleIcon={<X className="size-4" aria-hidden />}
              toggleLabel="Close navigation"
            />
            <SidebarBody
              isActive={isActive}
              collapsed={false}
              notificationCount={notificationCount}
            />
            <SidebarFooter onSignOut={handleSignOut} collapsed={false} />
          </aside>
        </div>
      ) : null}

      <aside
        className={[
          "hidden md:flex",
          collapsed ? "w-20" : "w-72",
          "flex-col border-r border-[var(--border)] bg-[var(--surface)] text-white transition-[width] duration-200",
        ].join(" ")}
      >
        <SidebarHeader
          partnerName={partnerName}
          userEmail={userEmail}
          role={role}
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
          toggleIcon={
            collapsed ? (
              <ChevronRight className="size-4" aria-hidden />
            ) : (
              <ChevronLeft className="size-4" aria-hidden />
            )
          }
          toggleLabel={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        />
        <SidebarBody
          isActive={isActive}
          collapsed={collapsed}
          notificationCount={notificationCount}
        />
        <SidebarFooter onSignOut={handleSignOut} collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="focus-ring rounded-xl border border-[var(--border)] bg-white/5 p-2 text-white md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-4" aria-hidden />
            </button>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200">
                Trip Media
              </p>
              <p className="text-sm font-semibold">{partnerName || "Partner workspace"}</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-xl border border-[var(--border)] bg-white/4 px-3 py-1.5 text-xs muted">
              {userEmail}
            </span>
            {role ? (
              <span className="rounded-xl border border-[var(--border)] bg-white/4 px-3 py-1.5 text-xs font-semibold capitalize">
                {roleLabel(role)}
              </span>
            ) : null}
            <Link
              href="/dashboard/notifications"
              className="focus-ring relative rounded-xl border border-[var(--border)] bg-white/4 p-2 text-white"
              aria-label={`Notifications${notificationCount ? ` (${notificationCount} unread)` : ""}`}
            >
              <span className="sr-only">Notifications</span>
              <Bell aria-hidden className="size-4" />
              {notificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-red)] px-1 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1320px]">{children}</div>
        </main>
      </div>
    </div>
  )
}

interface SidebarHeaderProps {
  partnerName: string
  userEmail: string
  role: string | null
  collapsed: boolean
  onToggle: () => void
  toggleIcon: React.ReactNode
  toggleLabel: string
}

function SidebarHeader({
  partnerName,
  userEmail,
  role,
  collapsed,
  onToggle,
  toggleIcon,
  toggleLabel,
}: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/8 p-4">
      <Link href="/dashboard" className="focus-ring flex items-center gap-3 rounded-xl">
        <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand-red)] text-sm font-black text-white">
          TM
        </span>
        {collapsed ? null : (
          <span>
            <span className="block text-sm font-black tracking-[-0.02em]">Trip Media</span>
            <span className="block text-[11px] muted">Partner portal</span>
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={onToggle}
        className="focus-ring rounded-lg border border-white/12 bg-white/5 p-1.5 text-white/80 hover:bg-white/10"
        aria-label={toggleLabel}
      >
        {toggleIcon}
      </button>
      {collapsed ? null : (
        <span className="sr-only">
          {partnerName} · {userEmail} · {role ?? "member"}
        </span>
      )}
    </div>
  )
}

function SidebarBody({
  isActive,
  collapsed,
  notificationCount,
}: {
  isActive: (href: string) => boolean
  collapsed: boolean
  notificationCount: number
}) {
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
      {SIDEBAR_NAV.map((item) => (
        <SidebarLink
          key={item.href}
          item={item}
          active={isActive(item.href)}
          collapsed={collapsed}
          badge={
            item.href === "/dashboard/notifications" && notificationCount > 0
              ? notificationCount
              : null
          }
        />
      ))}
    </nav>
  )
}

function SidebarLink({
  item,
  active,
  collapsed,
  badge,
}: {
  item: SidebarNavItem
  active: boolean
  collapsed: boolean
  badge: number | null
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={[
        "focus-ring group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-[var(--brand-red)] text-white shadow-lg shadow-red-500/20"
          : "text-white/80 hover:bg-white/8 hover:text-white",
      ].join(" ")}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
      {badge !== null ? (
        <span
          className={[
            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            active ? "bg-white text-[var(--brand-red)]" : "bg-[var(--brand-red)] text-white",
          ].join(" ")}
          aria-hidden
        >
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  )
}

function SidebarFooter({
  onSignOut,
  collapsed,
}: {
  onSignOut: () => void | Promise<void>
  collapsed: boolean
}) {
  return (
    <div className="border-t border-white/8 p-3">
      <Link
        href="mailto:partners@trip.example?subject=Trip%20Media%20Support"
        className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/8 hover:text-white"
      >
        <LifeBuoy className="size-4 shrink-0" aria-hidden />
        {collapsed ? null : <span>Get support</span>}
      </Link>
      <button
        type="button"
        onClick={() => {
          void onSignOut()
        }}
        className="focus-ring mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/8 hover:text-white"
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        {collapsed ? null : <span>Sign out</span>}
      </button>
    </div>
  )
}

export const APP_SHELL_CARD_CLASS = cardClass
