import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, CreditCard, FileVideo, LogOut } from "lucide-react"
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

  async function signOut() {
    "use server"
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
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
            Your campaign workspace is ready for the next build phase.
          </h1>
          <p className="mt-5 max-w-2xl leading-8 muted">
            This foundation confirms Supabase sessions, protected routing, and the partner dashboard shell. Billing, creative upload, and campaign tools are intentionally deferred.
          </p>
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
      </section>
    </main>
  )
}
