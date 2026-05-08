const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  drivers: "Drivers",
  riders: "Riders",
  vehicles: "Vehicles",
  verification: "Verification",
  trips: "Trips",
  payments: "Payments",
  wallets: "Wallets",
  ratings: "Ratings",
  ads: "Ads",
  support: "Support",
  admins: "Admins",
  analytics: "Analytics",
  audit: "Audit",
  settings: "Settings",
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const looksLikeOpaqueId = (segment: string) =>
  UUID_RE.test(segment) || (segment.length >= 20 && /^[a-z0-9_-]+$/i.test(segment))

export type BreadcrumbItem = { href: string; label: string; current?: boolean }

export const labelForPathHref = (href: string) => {
  const seg = href.split("/").filter(Boolean).pop() ?? ""
  return SECTION_LABELS[seg] ?? formatSegment(seg)
}

const formatSegment = (segment: string) =>
  segment
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")

const dynamicTailLabel = (segments: string[], index: number) => {
  const prev = segments[index - 1]
  if (prev === "drivers") return "Driver"
  if (prev === "trips") return "Trip"
  if (prev === "riders") return "Rider"
  if (prev === "vehicles") return "Vehicle"
  if (prev === "admins") return "Admin"
  if (looksLikeOpaqueId(segments[index])) return "Details"
  return formatSegment(segments[index])
}

/** Breadcrumb trail for the current pathname (App Router dashboard segment). */
export const breadcrumbsForPathname = (pathname: string): BreadcrumbItem[] => {
  const normalized = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname
  const segments = normalized.split("/").filter(Boolean)
  if (segments.length === 0) {
    return [{ href: "/dashboard", label: "Dashboard", current: true }]
  }

  const items: BreadcrumbItem[] = []
  let acc = ""
  for (let i = 0; i < segments.length; i++) {
    acc += `/${segments[i]}`
    const seg = segments[i]
    const mapped = SECTION_LABELS[seg]
    const label =
      mapped ?? (i === segments.length - 1 ? dynamicTailLabel(segments, i) : formatSegment(seg))
    items.push({
      href: acc,
      label,
      current: i === segments.length - 1,
    })
  }
  return items
}

/**
 * Parent route for “Back” — walks up one path segment so nested pages always have an escape hatch
 * (browser history is often empty after direct loads or command palette jumps).
 */
export const parentHrefForPathname = (pathname: string): string | null => {
  const normalized = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname
  const parts = normalized.split("/").filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1 && parts[0] === "dashboard") return null
  if (parts.length === 1) return "/dashboard"
  parts.pop()
  return `/${parts.join("/")}`
}

export const backLabelForParent = (parentHref: string) => {
  const label = labelForPathHref(parentHref)
  return `Back to ${label}`
}
