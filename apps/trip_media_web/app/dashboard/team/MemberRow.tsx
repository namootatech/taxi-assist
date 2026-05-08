"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { changeMemberRole, removeMember } from "./actions"

interface MemberRowProps {
  member: {
    id: string
    email: string | null
    role: string
    joined_at: string | null
    user_id: string | null
  }
  canManage: boolean
  isSelf: boolean
}

export function MemberRow({ member, canManage, isSelf }: MemberRowProps) {
  const [pending, startTransition] = useTransition()

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = event.target.value
    if (newRole === member.role) return
    startTransition(async () => {
      const result = await changeMemberRole({ memberId: member.id, role: newRole })
      if (!result.success) {
        toast.error(result.message || "Could not change role.")
        event.target.value = member.role
        return
      }
      toast.success("Role updated")
    })
  }

  const handleRemove = () => {
    if (!confirm(`Remove ${member.email || "this member"} from the workspace?`)) return
    startTransition(async () => {
      const result = await removeMember({ memberId: member.id })
      if (!result.success) {
        toast.error(result.message || "Could not remove member.")
        return
      }
      toast.success("Member removed")
    })
  }

  const isOwner = member.role === "owner"
  const lockedRole = isOwner || isSelf

  return (
    <tr className="border-t border-[var(--border)] align-top">
      <td className="px-4 py-4">
        <p className="font-semibold">{member.email || "Account holder"}</p>
        <p className="mt-1 text-xs muted">
          {member.joined_at ? `Joined ${new Date(member.joined_at).toLocaleDateString()}` : "Invitation pending"}
        </p>
      </td>
      <td className="px-4 py-4">
        {canManage && !lockedRole ? (
          <select
            defaultValue={member.role}
            onChange={handleRoleChange}
            disabled={pending}
            className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-3 py-1.5 text-sm capitalize"
          >
            <option className="text-slate-900" value="admin">Admin</option>
            <option className="text-slate-900" value="operator">Operator</option>
            <option className="text-slate-900" value="viewer">Viewer</option>
          </select>
        ) : (
          <span className="capitalize">{member.role}</span>
        )}
      </td>
      <td className="px-4 py-4">
        {canManage && !lockedRole ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-100 disabled:opacity-60"
          >
            <Trash2 className="size-3.5" aria-hidden /> Remove
          </button>
        ) : (
          <span className="text-xs muted">{isOwner ? "Owner — locked" : isSelf ? "You" : "—"}</span>
        )}
      </td>
    </tr>
  )
}
