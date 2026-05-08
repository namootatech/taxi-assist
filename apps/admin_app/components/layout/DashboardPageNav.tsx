"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import {
  backLabelForParent,
  breadcrumbsForPathname,
  parentHrefForPathname,
} from "@/lib/dashboard-path-context";

export const DashboardPageNav = () => {
  const pathname = usePathname() ?? "/dashboard";
  const parentHref = useMemo(() => parentHrefForPathname(pathname), [pathname]);
  const crumbs = useMemo(() => breadcrumbsForPathname(pathname), [pathname]);
  const backLabel = parentHref ? backLabelForParent(parentHref) : null;

  return (
    <div
      className="surface-1 flex flex-col gap-2 border-b border-token px-4 py-2.5 md:flex-row md:items-center md:gap-4 md:px-6"
      aria-label="Page location"
    >
      {parentHref ? (
        <div className="shrink-0">
          <Link
            href={parentHref}
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-token bg-transparent px-2.5 py-1.5 text-sm font-medium text-[color:var(--foreground)] hover:border-[var(--brand-red)] hover:text-[color:var(--foreground)]"
            aria-label={backLabel}
          >
            <span aria-hidden>←</span>
            <span className="truncate">{backLabel}</span>
          </Link>
        </div>
      ) : null}

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-[color:var(--muted)]">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex min-w-0 items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden strokeWidth={2} />
              ) : null}
              {c.current ? (
                <span
                  className="truncate font-medium text-[color:var(--foreground)]"
                  aria-current="page"
                >
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="truncate rounded px-0.5 font-medium text-[color:var(--foreground)] underline-offset-4 hover:underline"
                >
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
