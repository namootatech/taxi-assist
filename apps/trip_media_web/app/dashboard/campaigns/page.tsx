import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3 } from "lucide-react"
import { getPartnerContext } from "@/lib/partner"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createCampaign } from "./actions"

export const dynamic = "force-dynamic"

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>
}) {
  const params = await searchParams
  const context = await getPartnerContext()

  if (!context) {
    redirect("/signup?setup=partner&next=/dashboard/campaigns")
  }

  const supabase = await createSupabaseServerClient()
  const [{ data: creatives }, { data: campaigns }] = await Promise.all([
    supabase.from("ad_creatives").select("id, title").eq("partner_id", context.partner.id).in("status", ["draft", "pending_review", "approved"]).order("created_at", { ascending: false }),
    supabase.from("ad_campaigns").select("campaign_id, advertiser, status, max_views, current_views, schedule_band, created_at").eq("partner_id", context.partner.id).order("created_at", { ascending: false }),
  ])

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <Link href="/dashboard" className="focus-ring rounded-lg text-sm font-bold muted hover:text-white">
        Back to dashboard
      </Link>
      <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="panel rounded-[2rem] p-6">
          <BarChart3 className="size-6 text-red-200" aria-hidden />
          <h1 className="mt-5 text-4xl font-black tracking-[-0.04em]">Campaign drafts</h1>
          <p className="mt-3 leading-7 muted">Create paused drafts first. Activation stays gated by review, package limits, and billing status.</p>
          {params.error === "over_cap" ? <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">That cap is higher than your current credits. Lower it or choose a package.</p> : null}
          {params.error && params.error !== "over_cap" ? <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">We could not save that campaign. Check the fields and try again.</p> : null}
          {params.created ? <p className="mt-4 rounded-2xl border border-green-400/30 bg-green-400/10 p-3 text-sm text-green-100">Campaign draft created.</p> : null}
          <form action={createCampaign} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Campaign name
              <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="advertiser" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Creative
              <select className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="creative_id" required>
                {(creatives || []).map((creative) => (
                  <option key={creative.id} className="text-slate-900" value={creative.id}>
                    {creative.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Schedule
              <select className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="schedule_band" defaultValue="all_day">
                <option className="text-slate-900" value="all_day">All day</option>
                <option className="text-slate-900" value="peak">Peak</option>
                <option className="text-slate-900" value="off_peak">Off-peak</option>
                <option className="text-slate-900" value="night">Night</option>
                <option className="text-slate-900" value="all">Any time</option>
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                View cap
                <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="max_views" type="number" min="1" defaultValue="1000" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Reward per view
                <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="reward_per_view" type="number" min="0" step="0.01" defaultValue="0" required />
              </label>
            </div>
            <button className="focus-ring rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white">Create paused draft</button>
          </form>
        </div>

        <div className="grid gap-4">
          {(campaigns || []).length === 0 ? (
            <div className="panel rounded-[2rem] p-6">
              <h2 className="text-2xl font-black">No campaigns yet</h2>
              <p className="mt-2 leading-7 muted">Create a paused draft after you add a creative.</p>
            </div>
          ) : (
            campaigns?.map((campaign) => (
              <article key={campaign.campaign_id} className="panel rounded-[1.5rem] p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] muted">{campaign.schedule_band}</p>
                <h2 className="mt-2 text-xl font-black">{campaign.advertiser}</h2>
                <p className="mt-2 text-sm muted">
                  {campaign.status} · {campaign.current_views} / {campaign.max_views || "unlimited"} views
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
