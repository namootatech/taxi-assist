import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, BarChart3, CreditCard, FileVideo, LogOut, Users } from "lucide-react"
import { getPartnerContext } from "@/lib/partner"
import { logActionError, logActionInfo } from "@/lib/server-action-logger"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const nextSteps = [
  {
    icon: FileVideo,
    title: "Creative library",
    body: "Upload and review campaign assets once storage and moderation are enabled.",
  },
  {
    icon: CreditCard,
    title: "Packages and billing",
    body: "Connect a trial or paid package after Payfast/Paystack webhooks are implemented.",
  },
  {
    icon: BarChart3,
    title: "Performance",
    body: "Monitor impressions, completion, and cap usage after campaign delivery is live.",
  },
]

const dashboardActions = [
  {
    href: "/dashboard/creatives",
    icon: FileVideo,
    title: "Add creatives",
    body: "Prepare image or video assets for review.",
  },
  {
    href: "/dashboard/campaigns",
    icon: BarChart3,
    title: "Plan campaigns",
    body: "Create drafts and track eligibility before activation.",
  },
  {
    href: "/dashboard/team",
    icon: Users,
    title: "Invite the team",
    body: "Keep partner access clear by role.",
  },
]

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const { welcome } = await searchParams
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?error=not_authenticated")
  }

  const context = await getPartnerContext()

  async function signOut() {
    "use server"
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      logActionError("trip_media.signout", "auth_signout_failed", error)
    } else {
      logActionInfo("trip_media.signout", "completed")
    }

    redirect("/login")
  }

  return (
    <main className="min-h-svh px-5 py-6 md:px-8">
      <nav className="mx-auto flex max-w-6xl items-center justify-between" aria-label="Dashboard navigation">
        <Link href="/" className="focus-ring rounded-xl text-sm font-black uppercase tracking-[0.24em]">
          Trip Media
        </Link>
        <form action={signOut}>
          <button className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-bold">
            <LogOut className="size-4" aria-hidden />
            Log out
          </button>
        </form>
      </nav>

      <section className="mx-auto max-w-6xl py-12">
        {welcome ? (
          <div className="mb-5 rounded-2xl border border-green-400/30 bg-green-400/10 p-4 text-sm text-green-100">
            You’re in. Finish your partner setup when company profiles and billing are enabled.
          </div>
        ) : null}
        <div className="panel rounded-[2rem] p-6 md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-red-200">Partner dashboard</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] md:text-6xl">
            {context ? `${context.partner.name} is ready to plan campaigns.` : "Finish your partner setup."}
          </h1>
          <p className="mt-5 max-w-2xl leading-8 muted">
            {context
              ? "Your trial workspace is active. Add creatives, choose a package, and prepare your first campaign."
              : "Create your company workspace so campaign tools, billing, and team access can connect to the right partner."}
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-[var(--border)] bg-white/6 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] muted">Status</p>
              <p className="mt-2 text-2xl font-black capitalize">{context?.partner.status || "Setup needed"}</p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-white/6 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] muted">Credits</p>
              <p className="mt-2 text-2xl font-black">{context?.partner.promotional_credits_balance ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-white/6 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] muted">Your role</p>
              <p className="mt-2 text-2xl font-black capitalize">{context?.member.role || "Partner"}</p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {nextSteps.map((step) => {
              const Icon = step.icon
              return (
                <article key={step.title} className="rounded-3xl border border-[var(--border)] bg-white/6 p-5">
                  <Icon className="size-5 text-red-200" aria-hidden />
                  <h2 className="mt-4 text-lg font-black">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 muted">{step.body}</p>
                </article>
              )
            })}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {dashboardActions.map((action) => {
            const Icon = action.icon
            const href = context ? action.href : `/signup?setup=partner&next=${encodeURIComponent(action.href)}`

            return (
              <Link
                key={action.href}
                href={href}
                aria-label={`${action.title}: ${action.body}`}
                className="group focus-ring flex min-h-44 flex-col justify-between rounded-[2rem] border border-red-300/40 bg-[var(--brand-red)] p-5 text-white shadow-xl shadow-red-500/20 transition duration-200 hover:-translate-y-1 hover:brightness-110"
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-white text-[var(--brand-red)] shadow-lg shadow-black/15">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#07111f]">
                    Open
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </span>
                <span>
                  <span className="block text-2xl font-black tracking-[-0.04em]">{action.title}</span>
                  <span className="mt-2 block text-sm font-semibold leading-6 text-white/86">{action.body}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
