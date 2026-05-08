"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Command = { title: string; subtitle?: string; href: string };

export function CommandPalette({
  commands,
  open,
  onOpenChange,
}: {
  commands: Array<Command>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const handleClose = useCallback(() => {
    setQuery("");
    onOpenChange(false);
  }, [onOpenChange]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 12);
    return commands
      .filter((c) => {
        const hay = `${c.title} ${c.subtitle ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [commands, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange, handleClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-20 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={handleClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-token surface-1 shadow-[var(--shadow)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-token px-4 py-3">
          <div className="size-2 rounded-full bg-[var(--brand-red)]/70" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions…"
            className="h-10 w-full bg-transparent text-sm text-[color:var(--foreground)] placeholder:muted focus-visible:outline-none"
          />
          <div className="hidden rounded-md border border-token px-2 py-1 text-xs muted sm:block">
            Esc
          </div>
        </div>

        <div className="max-h-[360px] overflow-auto p-2">
          {results.length ? (
            results.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={handleClose}
                className="flex items-start justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <div>
                  <div className="text-sm font-semibold">{c.title}</div>
                  {c.subtitle ? <div className="text-xs muted">{c.subtitle}</div> : null}
                </div>
                <div className="text-xs muted">{c.href}</div>
              </Link>
            ))
          ) : (
            <div className="px-3 py-10 text-center text-sm muted">No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}

