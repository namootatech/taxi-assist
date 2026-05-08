"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Copy, Mail, X } from "lucide-react"
import { toast } from "sonner"
import { ROLE_EXPLAINERS } from "@/lib/role-content"
import { inviteMember } from "./actions"

const formSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["admin", "operator", "viewer"]),
})

type FormValues = z.infer<typeof formSchema>

const inviteRoles = ROLE_EXPLAINERS.filter((entry) => entry.role !== "owner")

export function InviteMemberDialog({ siteOrigin }: { siteOrigin: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [resultLink, setResultLink] = useState<string | null>(null)
  const [resultEmail, setResultEmail] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", role: "viewer" },
  })

  const handleClose = () => {
    setOpen(false)
    setResultLink(null)
    setResultEmail(null)
    form.reset()
  }

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await inviteMember(values)
      if (!result.success || !result.inviteToken) {
        toast.error(result.message || "Could not create invite.")
        return
      }
      setResultLink(`${siteOrigin}/signup?invite=${encodeURIComponent(result.inviteToken)}`)
      setResultEmail(values.email)
      toast.success("Invite created. Copy the link and share it with the invitee.")
    })
  })

  const handleCopy = async () => {
    if (!resultLink) return
    try {
      await navigator.clipboard.writeText(resultLink)
      toast.success("Invite link copied")
    } catch {
      toast.error("Copy failed. Select the link and copy manually.")
    }
  }

  return (
    <>
      <button
        type="button"
        className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--brand-red)] px-4 py-2 text-sm font-bold text-white"
        onClick={() => setOpen(true)}
      >
        <Mail className="size-4" aria-hidden />
        Invite member
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Invite a team member"
          onMouseDown={handleClose}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div
            className="panel relative z-10 w-full max-w-lg rounded-3xl p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.03em]">Invite team member</h2>
                <p className="mt-2 text-sm muted">
                  We will create a one-time invite link. Send it to the invitee yourself; we do
                  not deliver invite emails yet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="focus-ring rounded-lg border border-[var(--border)] bg-white/5 p-1.5 text-white/80 hover:bg-white/10"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {resultLink ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 p-4">
                  <p className="text-sm font-bold text-emerald-100">Invite ready for {resultEmail}</p>
                  <p className="mt-1 text-xs text-emerald-100/80">
                    Share this link with them. They can sign up or sign in to accept.
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-white/4 p-3 sm:flex-row sm:items-center">
                  <code className="block flex-1 truncate text-xs muted" title={resultLink}>
                    {resultLink}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white/8 px-3 py-1.5 text-xs font-bold"
                  >
                    <Copy className="size-3.5" aria-hidden />
                    Copy link
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="focus-ring rounded-full border border-[var(--border)] bg-white/8 px-4 py-2 text-sm font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="grid gap-2 text-sm font-semibold">
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    {...form.register("email")}
                    className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3"
                  />
                  {form.formState.errors.email ? (
                    <span className="text-xs text-red-200">{form.formState.errors.email.message}</span>
                  ) : null}
                </label>

                <fieldset className="grid gap-2 text-sm font-semibold">
                  <legend>Role</legend>
                  <div className="grid gap-2">
                    {inviteRoles.map((entry) => (
                      <label
                        key={entry.role}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border)] bg-white/4 p-3 hover:bg-white/8"
                      >
                        <input
                          type="radio"
                          value={entry.role}
                          {...form.register("role")}
                          className="mt-1 size-4"
                        />
                        <span className="grid gap-1">
                          <span className="font-bold capitalize">{entry.title}</span>
                          <span className="text-xs muted">{entry.summary}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {form.formState.errors.role ? (
                    <span className="text-xs text-red-200">{form.formState.errors.role.message}</span>
                  ) : null}
                </fieldset>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="focus-ring rounded-full border border-[var(--border)] bg-white/8 px-4 py-2 text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--brand-red)] px-4 py-2 text-sm font-bold disabled:opacity-60"
                  >
                    {pending ? "Creating..." : "Create invite"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
