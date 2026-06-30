import Link from "next/link"
import { redirect } from "next/navigation"
import { logActionError, logActionInfo, logActionWarn } from "@/lib/server-action-logger"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const isExistingUserError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false
  }

  const record = error as Record<string, unknown>
  const code = typeof record.code === "string" ? record.code : ""
  const message = typeof record.message === "string" ? record.message.toLowerCase() : ""

  return code === "user_already_exists" || message.includes("already registered") || message.includes("already exists")
}

const ensurePartnerWorkspace = async (userId: string, email: string, companyName: string) => {
  const admin = createSupabaseAdminClient()
  const { data: existingMember, error: existingMemberError } = await admin
    .from("partner_members")
    .select("partner_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (existingMemberError) {
    logActionError("trip_media.signup", "existing_member_lookup_failed", existingMemberError, { userId })
    throw existingMemberError
  }

  if (existingMember?.partner_id) {
    logActionInfo("trip_media.signup", "partner_workspace_exists", { userId, partnerId: existingMember.partner_id })
    return
  }

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: partner, error: partnerError } = await admin
    .from("media_partners")
    .insert({
      name: companyName,
      company_name: companyName,
      trial_ends_at: trialEndsAt,
      promotional_credits_balance: 0,
      impression_credits_balance: 0,
      prelaunch_bonus_claimed: false,
    })
    .select("id")
    .single()

  if (partnerError || !partner) {
    logActionError("trip_media.signup", "partner_workspace_create_failed", partnerError, { userId })
    throw partnerError ?? new Error("Partner workspace was not returned")
  }

  const { error: memberError } = await admin.from("partner_members").insert({
    partner_id: partner.id,
    user_id: userId,
    email,
    role: "owner",
    joined_at: new Date().toISOString(),
  })

  if (memberError) {
    logActionError("trip_media.signup", "partner_member_create_failed", memberError, { userId, partnerId: partner.id })
    throw memberError
  }

  logActionInfo("trip_media.signup", "partner_workspace_created", { userId, partnerId: partner.id })
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; setup?: string }>
}) {
  const { error, next, setup } = await searchParams
  const isPartnerSetup = setup === "partner"
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : isPartnerSetup ? "/dashboard" : "/dashboard?welcome=1"

  async function signUp(formData: FormData) {
    "use server"

    const supabase = await createSupabaseServerClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    const email = String(formData.get("email") ?? currentUser?.email ?? "").trim().toLowerCase()
    const password = String(formData.get("password") ?? "")
    const companyName = String(formData.get("companyName") ?? "").trim()
    const emailDomain = email.includes("@") ? email.split("@").at(-1) : "invalid"

    logActionInfo("trip_media.signup", "started", { emailDomain, hasCompanyName: Boolean(companyName) })

    if (companyName.length < 2) {
      logActionWarn("trip_media.signup", "invalid_company_name", { emailDomain })
      redirect(`/signup?error=${encodeURIComponent("Add your company or trading name to start setup.")}`)
    }

    if (isPartnerSetup && currentUser) {
      try {
        await ensurePartnerWorkspace(currentUser.id, email, companyName)
      } catch (workspaceError) {
        logActionError("trip_media.signup", "logged_in_workspace_setup_failed", workspaceError, { userId: currentUser.id })
        redirect(`/signup?setup=partner&next=${encodeURIComponent(safeNext)}&error=${encodeURIComponent("Partner setup needs support. Contact us and we’ll finish it.")}`)
      }

      redirect(safeNext)
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          app: "trip_media_web",
          company_name: companyName,
        },
      },
    })

    if (error) {
      logActionError("trip_media.signup", "auth_signup_failed", error, { emailDomain })

      if (isExistingUserError(error)) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

        if (signInError || !signInData.user) {
          logActionError("trip_media.signup", "existing_user_signin_failed", signInError, { emailDomain })
          redirect(`/login?error=${encodeURIComponent("This email already has an account. Log in with the existing password to continue setup.")}`)
        }

        try {
          await ensurePartnerWorkspace(signInData.user.id, email, companyName)
        } catch (workspaceError) {
          logActionError("trip_media.signup", "existing_user_workspace_setup_failed", workspaceError, { userId: signInData.user.id })
          redirect(`/signup?error=${encodeURIComponent("Your login works, but partner setup needs support. Contact us and we’ll finish it.")}`)
        }

        redirect(safeNext || "/dashboard?welcome=1")
      }

      redirect(`/signup?error=${encodeURIComponent("We could not create the account. Try again or contact support.")}`)
    }

    if (data.user) {
      try {
        await ensurePartnerWorkspace(data.user.id, email, companyName)
      } catch (workspaceError) {
        logActionError("trip_media.signup", "new_user_workspace_setup_failed", workspaceError, { userId: data.user.id })
        redirect(`/signup?error=${encodeURIComponent("Your login was created, but partner setup needs support. Contact us and we’ll finish it.")}`)
      }
    }

    logActionInfo("trip_media.signup", "completed", { emailDomain, hasUser: Boolean(data.user) })
    redirect(safeNext || "/dashboard?welcome=1")
  }

  return (
    <main className="grid min-h-svh place-items-center px-5 py-10">
      <section className="panel w-full max-w-md rounded-[1.5rem] p-6">
        <Link href="/" className="focus-ring rounded-lg text-sm font-black uppercase tracking-[0.24em]">
          Trip Media
        </Link>
        <h1 className="mt-8 text-3xl font-black tracking-[-0.04em]">{isPartnerSetup ? "Finish partner setup." : "Start partner setup."}</h1>
        <p className="mt-3 leading-7 muted">
          {isPartnerSetup
            ? "Add your company workspace so creatives, campaigns, and team access connect to the right partner."
            : "Create your login and company workspace. Billing and campaign launch come next."}
        </p>
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>
        ) : null}
        <form action={signUp} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Company or trading name
            <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="companyName" autoComplete="organization" required />
          </label>
          {isPartnerSetup ? null : (
            <>
              <label className="grid gap-2 text-sm font-semibold">
                Work email
                <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="email" type="email" autoComplete="email" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Password
                <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="password" type="password" autoComplete="new-password" minLength={8} required />
              </label>
            </>
          )}
          <button className="focus-ring rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white">
            {isPartnerSetup ? "Create partner workspace" : "Create partner login"}
          </button>
        </form>
        {isPartnerSetup ? null : (
          <p className="mt-5 text-sm muted">
            Already have access?{" "}
            <Link className="focus-ring rounded-lg font-bold text-white underline-offset-4 hover:underline" href="/login">
              Log in
            </Link>
          </p>
        )}
      </section>
    </main>
  )
}
