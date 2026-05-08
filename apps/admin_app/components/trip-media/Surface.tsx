import Link from "next/link"

interface PanelProps {
  title: string
  subtitle?: string
  href?: string
  hrefLabel?: string
  children: React.ReactNode
  className?: string
}

export function Panel({ title, subtitle, href, hrefLabel = "Open", children, className }: PanelProps) {
  return (
    <div className={["rounded-2xl border border-token surface-1 shadow-[var(--shadow)]", className ?? ""].join(" ")}>
      <div className="flex items-start justify-between gap-3 border-b border-token p-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          {subtitle ? <div className="text-xs muted">{subtitle}</div> : null}
        </div>
        {href ? (
          <Link className="text-sm font-semibold text-[var(--brand-red)] hover:underline" href={href}>
            {hrefLabel}
          </Link>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  hint?: string
  href?: string
  tone?: "default" | "warning" | "danger" | "success"
}

const toneClass: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "",
  warning: "border-amber-400/40 bg-amber-500/5",
  danger: "border-red-400/40 bg-red-500/5",
  success: "border-emerald-400/40 bg-emerald-500/5",
}

export function KpiCard({ label, value, hint, href, tone = "default" }: KpiCardProps) {
  const baseClass = [
    "rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)] transition",
    href ? "hover:-translate-y-[1px] hover:border-[var(--brand-red)]" : "",
    toneClass[tone],
  ].join(" ")

  const body = (
    <>
      <div className="text-xs font-semibold uppercase tracking-wide muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-2 text-sm muted">{hint}</div> : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {body}
      </Link>
    )
  }

  return <div className={baseClass}>{body}</div>
}

export function StatusPill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warning" | "danger" | "success" | "muted" }) {
  const classes: Record<string, string> = {
    default: "border-token bg-[var(--brand-navy-50)] text-[var(--brand-navy-900)]",
    warning: "border-amber-400/40 bg-amber-500/10 text-amber-700",
    danger: "border-red-400/40 bg-red-500/10 text-red-700",
    success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-700",
    muted: "border-token bg-[color:var(--surface-2)] muted",
  }
  return (
    <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", classes[tone]].join(" ")}>
      {children}
    </span>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-token p-10 text-center">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="max-w-md text-sm muted">{description}</div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
