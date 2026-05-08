import Link from "next/link"
import { redirect } from "next/navigation"
import { FileVideo, UploadCloud } from "lucide-react"
import { getPartnerContext } from "@/lib/partner"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createCreative, submitCreativeForReview } from "./actions"

export const dynamic = "force-dynamic"

const statusCopy: Record<string, string> = {
  draft: "Draft",
  pending_review: "In review",
  approved: "Approved",
  rejected: "Needs changes",
}

export default async function CreativesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>
}) {
  const params = await searchParams
  const context = await getPartnerContext()

  if (!context) {
    redirect("/signup?setup=partner&next=/dashboard/creatives")
  }

  const supabase = await createSupabaseServerClient()
  const { data: creatives } = await supabase
    .from("ad_creatives")
    .select("id, title, mime_type, status, review_note, created_at")
    .eq("partner_id", context.partner.id)
    .order("created_at", { ascending: false })

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <Link href="/dashboard" className="focus-ring rounded-lg text-sm font-bold muted hover:text-white">
        Back to dashboard
      </Link>
      <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="panel rounded-[2rem] p-6">
          <UploadCloud className="size-6 text-red-200" aria-hidden />
          <h1 className="mt-5 text-4xl font-black tracking-[-0.04em]">Creative library</h1>
          <p className="mt-3 leading-7 muted">Add the image or video details first. Signed uploads connect to the private bucket in the next storage pass.</p>
          {params.created ? <p className="mt-4 rounded-2xl border border-green-400/30 bg-green-400/10 p-3 text-sm text-green-100">Creative saved. Submit it when it is ready for review.</p> : null}
          {params.error ? <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">We could not save that creative. Check the fields and try again.</p> : null}
          <form action={createCreative} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Creative title
              <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="title" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Landing URL optional
              <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="cta_url" type="url" placeholder="https://example.com" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Asset type
              <select className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="mime_type" defaultValue="image/jpeg">
                <option className="text-slate-900" value="image/jpeg">JPEG image</option>
                <option className="text-slate-900" value="image/png">PNG image</option>
                <option className="text-slate-900" value="video/mp4">MP4 video</option>
              </select>
            </label>
            <button className="focus-ring rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white">Save creative</button>
          </form>
        </div>

        <div className="grid gap-4">
          {(creatives || []).length === 0 ? (
            <div className="panel rounded-[2rem] p-6">
              <FileVideo className="size-6 text-red-200" aria-hidden />
              <h2 className="mt-5 text-2xl font-black">No creatives yet</h2>
              <p className="mt-2 leading-7 muted">Add your first creative so your campaign draft has something to show riders.</p>
            </div>
          ) : (
            creatives?.map((creative) => (
              <article key={creative.id} className="panel rounded-[1.5rem] p-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] muted">{creative.mime_type}</p>
                    <h2 className="mt-2 text-xl font-black">{creative.title}</h2>
                    <p className="mt-2 text-sm muted">{statusCopy[creative.status] || creative.status}</p>
                    {creative.review_note ? <p className="mt-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-100">{creative.review_note}</p> : null}
                  </div>
                  {creative.status === "draft" ? (
                    <form action={submitCreativeForReview}>
                      <input type="hidden" name="creativeId" value={creative.id} />
                      <button className="focus-ring rounded-full border border-[var(--border)] px-4 py-2 text-sm font-bold">Submit for review</button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
