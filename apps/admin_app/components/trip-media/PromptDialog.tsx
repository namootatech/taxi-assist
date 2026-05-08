"use client"

import { useEffect, useId, useRef, useState } from "react"

interface PromptDialogProps {
  open: boolean
  title: string
  description?: string
  label: string
  placeholder?: string
  defaultValue?: string
  submitLabel?: string
  cancelLabel?: string
  destructive?: boolean
  minLength?: number
  onSubmit: (value: string) => void | Promise<void>
  onClose: () => void
}

export function PromptDialog({
  open,
  title,
  description,
  label,
  placeholder,
  defaultValue,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  destructive = false,
  minLength = 4,
  onSubmit,
  onClose,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue ?? "")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const titleId = useId()
  const descId = useId()
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (open) {
      setValue(defaultValue ?? "")
      setError(null)
      setSubmitting(false)
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open, defaultValue])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (value.trim().length < minLength) {
      setError(`Add at least ${minLength} characters.`)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(value.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
        tabIndex={-1}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-token surface-1 p-5 shadow-[var(--shadow)]">
        <div id={titleId} className="text-base font-semibold tracking-tight">
          {title}
        </div>
        {description ? (
          <p id={descId} className="mt-1 text-sm muted">
            {description}
          </p>
        ) : null}
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold uppercase tracking-wide muted">{label}</label>
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError(null)
            }}
            placeholder={placeholder}
            className="min-h-24 w-full rounded-lg border border-token bg-transparent p-2 text-sm focus:border-[var(--brand-red)] focus:outline-none"
          />
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-token px-3 text-sm font-semibold hover:border-[var(--brand-red)]"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={[
                "h-10 rounded-lg px-3 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50",
                destructive ? "bg-[var(--brand-red)]" : "bg-[var(--brand-navy-900)]",
              ].join(" ")}
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
