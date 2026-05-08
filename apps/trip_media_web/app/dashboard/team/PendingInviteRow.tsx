"use client"

import { useState, useTransition } from "react"
import { Copy, RefreshCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { regenerateInviteLink, revokeInvite } from "./actions"

interface PendingInviteRowProps {
  invite: {
    id: string
    email: string
    role: string
    token: string
    expires_at: string
  }
  siteOrigin: string
  canManage: boolean
}

export function PendingInviteRow({ invite, siteOrigin, canManage }: PendingInviteRowProps) {
  const [pending, startTransition] = useTransition()
  const [token, setToken] = useState(invite.token)
  const [expiresAt, setExpiresAt] = useState(invite.expires_at)

  const link = `${siteOrigin}/signup?invite=${encodeURIComponent(token)}`
  const expiresLabel = new Date(expiresAt).toLocaleString()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success(`Invite link for ${invite.email} copied`)
    } catch {
      toast.error("Copy failed. Open the row and copy manually.")
    }
  }

  const handleRevoke = () => {
    if (!confirm(`Revoke invite for ${invite.email}?`)) return
    startTransition(async () => {
      const result = await revokeInvite({ inviteId: invite.id })
      if (!result.success) {
        toast.error(result.message || "Could not revoke invite.")
        return
      }
      toast.success("Invite revoked")
    })
  }

  const handleRegenerate = () => {
    startTransition(async () => {
      const result = await regenerateInviteLink({ inviteId: invite.id })
      if (!result.success || !result.inviteToken) {
        toast.error(result.message || "Could not refresh invite link.")
        return
      }
      setToken(result.inviteToken)
      setExpiresAt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      toast.success("New invite link ready")
    })
  }

  return (
    <tr className="border-t border-[var(--border)] align-top">
      <td className="px-4 py-4">
        <p className="font-semibold">{invite.email}</p>
        <p className="mt-1 text-xs muted">Expires {expiresLabel}</p>
      </td>
      <td className="px-4 py-4 capitalize">{invite.role}</td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/8 px-3 py-1.5 text-xs font-bold"
          >
            <Copy className="size-3.5" aria-hidden /> Copy link
          </button>
          {canManage ? (
            <>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={pending}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/8 px-3 py-1.5 text-xs font-bold disabled:opacity-60"
              >
                <RefreshCcw className="size-3.5" aria-hidden /> New link
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={pending}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-100 disabled:opacity-60"
              >
                <Trash2 className="size-3.5" aria-hidden /> Revoke
              </button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  )
}
