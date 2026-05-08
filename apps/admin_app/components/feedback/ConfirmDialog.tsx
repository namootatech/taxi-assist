"use client";

import { useEffect } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-token surface-1 p-5 shadow-[var(--shadow)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold tracking-tight">{title}</div>
        {description ? <div className="mt-2 text-sm muted">{description}</div> : null}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="h-9 rounded-lg border border-token px-3 text-sm font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={[
              "h-9 rounded-lg px-3 text-sm font-semibold text-white",
              destructive ? "bg-[var(--brand-red)] hover:brightness-95" : "bg-[var(--brand-navy-900)] hover:brightness-110",
            ].join(" ")}
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

