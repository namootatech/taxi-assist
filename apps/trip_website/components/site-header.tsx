import Link from "next/link"
import { externalLinks } from "@/lib/links"

const navItems = [
  { href: "/about", label: "About" },
  { href: "/riders", label: "Riders" },
  { href: "/drivers", label: "Drivers" },
  { href: "/advertise", label: "Advertise" },
  { href: "/contact", label: "Contact" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(255,250,244,0.88)] backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8"
        aria-label="Main navigation"
      >
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl" aria-label="Trip home">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[var(--brand-red)] text-lg font-black text-white">
            T
          </span>
          <span>
            <span className="block text-sm font-black uppercase tracking-[0.22em]">Trip</span>
            <span className="block text-xs muted">Trip</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-semibold md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="focus-ring rounded-lg hover:text-[var(--brand-red)]">
              {item.label}
            </Link>
          ))}
        </div>

        <Link
          href={externalLinks.tripMediaWeb}
          className="focus-ring rounded-full bg-[var(--brand-navy)] px-4 py-2 text-sm font-bold text-[#fffaf4] shadow-lg shadow-[rgba(36,64,101,0.18)]"
        >
          Advertise with us
        </Link>
      </nav>
    </header>
  )
}
