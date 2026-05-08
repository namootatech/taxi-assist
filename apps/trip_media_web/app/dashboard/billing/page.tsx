import Link from "next/link"
import { redirect } from "next/navigation"
import { CreditCard } from "lucide-react"
import { getPartnerContext } from "@/lib/partner"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createPayfastCheckout } from "./actions"

export const dynamic = "force-dynamic"

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>
}) {
  const params = await searchParams
  const context = await getPartnerContext()

  if (!context) {
    redirect("/signup?setup=partner&next=/dashboard/billing")
  }

  const supabase = await createSupabaseServerClient()
  const [{ data: packages }, { data: subscriptions }] = await Promise.all([
    supabase.from("ad_packages").select("id, slug, name, description, monthly_price_cents, impression_cap_monthly, max_concurrent_campaigns").eq("is_active", true).order("monthly_price_cents"),
    supabase.from("partner_subscriptions").select("status, provider, current_period_end, package:ad_packages(name)").eq("partner_id", context.partner.id).order("created_at", { ascending: false }),
  ])
  const currentPackage = Array.isArray(subscriptions?.[0]?.package)
    ? subscriptions?.[0]?.package[0]
    : subscriptions?.[0]?.package

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <Link href="/dashboard" className="focus-ring rounded-lg text-sm font-bold muted hover:text-white">
        Back to dashboard
      </Link>
      <section className="mt-8">
        <div className="panel rounded-[2rem] p-6">
          <CreditCard className="size-6 text-red-200" aria-hidden />
          <h1 className="mt-5 text-4xl font-black tracking-[-0.04em]">Packages and billing</h1>
          <p className="mt-3 max-w-2xl leading-7 muted">
            Choose a Payfast package when you’re ready. Your trial stays visible here until the first subscription is active.
          </p>
          {params.error === "payfast_not_ready" ? <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">Payfast sandbox keys are not configured yet.</p> : null}
          {params.checkout === "cancelled" ? <p className="mt-4 rounded-2xl border border-white/15 bg-white/8 p-3 text-sm muted">Checkout was cancelled. You can choose a package when you’re ready.</p> : null}
          <div className="mt-6 rounded-3xl border border-[var(--border)] bg-white/6 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] muted">Current access</p>
            <p className="mt-2 text-2xl font-black">
              {currentPackage?.name || "Starter trial"} · {subscriptions?.[0]?.status || "trialing"}
            </p>
            <p className="mt-2 text-sm muted">Credits: {context.partner.promotional_credits_balance}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {packages?.map((item) => (
            <article key={item.id} className="panel rounded-[1.5rem] p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] muted">{item.impression_cap_monthly ? `${item.impression_cap_monthly} impressions` : "Custom reach"}</p>
              <h2 className="mt-3 text-2xl font-black">{item.name}</h2>
              <p className="mt-3 min-h-16 leading-7 muted">{item.description}</p>
              <p className="mt-5 text-3xl font-black">R{(item.monthly_price_cents / 100).toFixed(0)}</p>
              <p className="mt-1 text-sm muted">{item.max_concurrent_campaigns} concurrent campaigns</p>
              <form action={createPayfastCheckout} className="mt-6">
                <input type="hidden" name="packageId" value={item.id} />
                <button className="focus-ring w-full rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white">Choose package</button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
