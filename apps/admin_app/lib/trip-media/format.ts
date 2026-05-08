const integerFormatter = new Intl.NumberFormat("en-ZA")

export function formatNumber(n: number | null | undefined): string {
  if (typeof n !== "number" || Number.isNaN(n)) return "—"
  return integerFormatter.format(n)
}

export function formatCurrencyZAR(amount: number | null | undefined): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "—"
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCentsAsZAR(cents: number | null | undefined): string {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "—"
  return formatCurrencyZAR(cents / 100)
}

export function formatPercent(pct: number | null | undefined, decimals = 0): string {
  if (typeof pct !== "number" || Number.isNaN(pct)) return "—"
  return `${pct.toFixed(decimals)}%`
}

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  return dateFormatter.format(d)
}

export function formatRelativeFromNow(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin} min ago`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.round(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return formatDateTime(d)
}
