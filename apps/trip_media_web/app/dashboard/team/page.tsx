import Link from "next/link"
import { redirect } from "next/navigation"
import { Users } from "lucide-react"
import { getPartnerContext } from "@/lib/partner"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function TeamPage() {
  const context = await getPartnerContext()

  if (!context) {
    redirect("/signup?setup=partner&next=/dashboard/team")
  }

  const supabase = await createSupabaseServerClient()
  const { data: members } = await supabase
    .from("partner_members")
    .select("id, email, role, joined_at, invited_at")
    .eq("partner_id", context.partner.id)
    .order("created_at", { ascending: true })

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <Link href="/dashboard" className="focus-ring rounded-lg text-sm font-bold muted hover:text-white">
        Back to dashboard
      </Link>
      <section className="panel mt-8 rounded-[2rem] p-6">
        <Users className="size-6 text-red-200" aria-hidden />
        <h1 className="mt-5 text-4xl font-black tracking-[-0.04em]">Team access</h1>
        <p className="mt-3 max-w-2xl leading-7 muted">
          Keep partner access clear. Full invite emails can be connected once provider mail settings are confirmed.
        </p>
        <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--border)]">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-white/8 text-xs uppercase tracking-[0.18em] muted">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {members?.map((member) => (
                <tr key={member.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-4">{member.email || "Current user"}</td>
                  <td className="px-4 py-4 capitalize">{member.role}</td>
                  <td className="px-4 py-4">{member.joined_at ? "Joined" : "Invited"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
