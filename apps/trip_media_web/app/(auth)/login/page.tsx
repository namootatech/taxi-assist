import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  async function signIn(formData: FormData) {
    "use server"

    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")
    const safeNext = next?.startsWith("/") ? next : "/dashboard"
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      redirect(`/login?error=${encodeURIComponent("Check your email and password, then try again.")}`)
    }

    redirect(safeNext)
  }

  return (
    <main className="grid min-h-svh place-items-center px-5 py-10">
      <section className="panel w-full max-w-md rounded-[1.5rem] p-6">
        <Link href="/" className="focus-ring rounded-lg text-sm font-black uppercase tracking-[0.24em]">
          Trip Media
        </Link>
        <h1 className="mt-8 text-3xl font-black tracking-[-0.04em]">Welcome back.</h1>
        <p className="mt-3 leading-7 muted">Log in to continue preparing campaigns and checking your partner dashboard.</p>
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
            {error === "not_authenticated" ? "Please log in to open your dashboard." : error}
          </div>
        ) : null}
        <form action={signIn} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Email
            <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Password
            <input className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="focus-ring rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white">
            Log in
          </button>
        </form>
        <p className="mt-5 text-sm muted">
          New to Trip Media?{" "}
          <Link className="focus-ring rounded-lg font-bold text-white underline-offset-4 hover:underline" href="/signup">
            Start partner setup
          </Link>
        </p>
      </section>
    </main>
  )
}
