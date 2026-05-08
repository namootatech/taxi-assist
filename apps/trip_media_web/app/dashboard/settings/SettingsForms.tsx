"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  changePassword,
  closeWorkspace,
  updateAccountName,
  updateOrgProfile,
} from "./actions"

const orgSchema = z.object({
  name: z.string().trim().min(2, "Add a company name."),
  legal_name: z.string().trim().optional().or(z.literal("")),
  registration_number: z.string().trim().optional().or(z.literal("")),
  billing_country: z.string().trim().min(2).max(3),
  billing_currency: z.string().trim().min(3).max(4),
})
type OrgValues = z.infer<typeof orgSchema>

const accountSchema = z.object({
  full_name: z.string().trim().min(2, "Add your full name.").or(z.literal("")),
})
type AccountValues = z.infer<typeof accountSchema>

const passwordSchema = z.object({
  password: z.string().min(8, "At least 8 characters."),
  confirm: z.string().min(8),
}).refine((values) => values.password === values.confirm, {
  path: ["confirm"],
  message: "Passwords do not match.",
})
type PasswordValues = z.infer<typeof passwordSchema>

interface OrgFormProps {
  defaultValues: OrgValues
  canEdit: boolean
}

export function OrgProfileForm({ defaultValues, canEdit }: OrgFormProps) {
  const [pending, startTransition] = useTransition()
  const form = useForm<OrgValues>({ resolver: zodResolver(orgSchema), defaultValues })

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateOrgProfile(values)
      if (!result.success) {
        toast.error(result.message || "Could not update the company profile.")
        return
      }
      toast.success("Company profile updated")
    })
  })

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <fieldset disabled={!canEdit} className="contents">
        <label className="grid gap-2 text-sm font-semibold">
          Company name
          <input
            {...form.register("name")}
            className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white disabled:opacity-60"
          />
          {form.formState.errors.name ? (
            <span className="text-xs text-red-200">{form.formState.errors.name.message}</span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Legal name
          <input
            {...form.register("legal_name")}
            className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white disabled:opacity-60"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Registration number
          <input
            {...form.register("registration_number")}
            className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white disabled:opacity-60"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Billing country
            <input
              maxLength={3}
              {...form.register("billing_country")}
              className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 uppercase text-white disabled:opacity-60"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Billing currency
            <input
              maxLength={4}
              {...form.register("billing_currency")}
              className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 uppercase text-white disabled:opacity-60"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending || !canEdit}
          className="focus-ring justify-self-start rounded-full bg-[var(--brand-red)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save company profile"}
        </button>
      </fieldset>
    </form>
  )
}

export function AccountForm({ defaultFullName }: { defaultFullName: string }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { full_name: defaultFullName },
  })

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateAccountName(values)
      if (!result.success) {
        toast.error(result.message || "Could not update your name.")
        return
      }
      toast.success("Account updated")
    })
  })

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold">
        Full name
        <input
          {...form.register("full_name")}
          className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
        />
        {form.formState.errors.full_name ? (
          <span className="text-xs text-red-200">{form.formState.errors.full_name.message}</span>
        ) : null}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="focus-ring justify-self-start rounded-full bg-[var(--brand-red)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save account"}
      </button>
    </form>
  )
}

export function PasswordForm() {
  const [pending, startTransition] = useTransition()
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  })

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await changePassword({ password: values.password })
      if (!result.success) {
        toast.error(result.message || "Could not change password.")
        return
      }
      toast.success("Password updated")
      form.reset({ password: "", confirm: "" })
    })
  })

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold">
        New password
        <input
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
          className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
        />
        {form.formState.errors.password ? (
          <span className="text-xs text-red-200">{form.formState.errors.password.message}</span>
        ) : null}
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Confirm new password
        <input
          type="password"
          autoComplete="new-password"
          {...form.register("confirm")}
          className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
        />
        {form.formState.errors.confirm ? (
          <span className="text-xs text-red-200">{form.formState.errors.confirm.message}</span>
        ) : null}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="focus-ring justify-self-start rounded-full bg-[var(--brand-red)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Change password"}
      </button>
    </form>
  )
}

export function CloseWorkspaceButton({ canClose }: { canClose: boolean }) {
  const [pending, startTransition] = useTransition()

  if (!canClose) {
    return (
      <p className="text-xs muted">
        Only the workspace owner can close the workspace.
      </p>
    )
  }

  const handleClick = () => {
    if (!confirm("Close this workspace? Members will lose access immediately.")) return
    startTransition(async () => {
      const result = await closeWorkspace()
      if (!result.success) {
        toast.error(result.message || "Could not close the workspace.")
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="focus-ring rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100 disabled:opacity-60"
    >
      {pending ? "Closing..." : "Close workspace"}
    </button>
  )
}
