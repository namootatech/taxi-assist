"use client"

import { useTransition } from "react"
import { Check, CheckCheck } from "lucide-react"
import { toast } from "sonner"
import { markAllRead, markRead } from "./actions"

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await markAllRead()
      if (!result.success) {
        toast.error(result.message || "Could not mark all read.")
        return
      }
      toast.success("All notifications cleared")
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || disabled}
      className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/8 px-4 py-2 text-sm font-bold disabled:opacity-60"
    >
      <CheckCheck className="size-4" aria-hidden /> Mark all read
    </button>
  )
}

export function MarkReadIconButton({ notificationId }: { notificationId: string }) {
  const [pending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await markRead({ notificationId })
      if (!result.success) {
        toast.error(result.message || "Could not mark as read.")
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/8 px-3 py-1.5 text-xs font-bold disabled:opacity-60"
    >
      <Check className="size-3.5" aria-hidden /> Mark read
    </button>
  )
}
