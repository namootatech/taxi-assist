import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  async function signUp(formData: FormData) {
    "use server"

    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          app: "trip_media_web",
        },
      },
    })

    if (error) {
      redirect(`/signup?error=${encodeURIComponent("We could not create the account. Try again or contact support.")}`)
    }

    redirect("/dashboard?welcome=1")
  }

  return (
    <main className="grid min-h-svh place-items-center px-5 py-10">
      <section className="panel w-full max-w-md rounded-[1.5rem] p-6">
        <Link href="/" className="focus-ring rounded-lg text-sm font-black uppercase tracking-[0.24em]">
          Trip Media
        </Link>
        <h1 className="mt-8 text-3xl font-black tracking-[-0.04em]">Start partner setup.</h1>
        <p className="mt-3 leading-7 muted">
          Create your login now. Company profile, billing, and campaigns come after this foundation step.
        </p>
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>
        ) : null}
        <form action={signUp} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Work email
            <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Password
            <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <button className="focus-ring rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white">
            Create partner login
          </button>
        </form>
        <p className="mt-5 text-sm muted">
          Already have access?{" "}
          <Link className="focus-ring rounded-lg font-bold text-white underline-offset-4 hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  )
}
