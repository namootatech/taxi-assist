import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Image from "next/image";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  async function register(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const supabase = await createSupabaseServerClient();

    const { error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) {
      redirect(`/register?error=${encodeURIComponent(signUpErr.message)}`);
    }

    // Ensure we have a session so RLS policies allow inserting into admin_profiles.
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      redirect(`/login?error=${encodeURIComponent(signInErr.message)}`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/login?error=${encodeURIComponent("Please sign in")}`);
    }

    const { error: insertErr } = await supabase.from("admin_profiles").insert({
      user_id: user.id,
      role: "support",
      disabled_at: null,
    });

    if (insertErr) {
      redirect(`/register?error=${encodeURIComponent(insertErr.message)}`);
    }

    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 items-center justify-center surface-2 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-token surface-1 p-6 shadow-[var(--shadow)]">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/trip-icon.png"
            alt="Trip"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div>
            <div className="text-xs font-medium muted">Trip</div>
            <h1 className="text-lg font-semibold tracking-tight">Create admin account</h1>
          </div>
        </div>
        <p className="mt-3 text-sm muted">
          This creates a <span className="font-medium">support</span> role admin.
        </p>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(error)}
          </div>
        ) : null}

        <form action={register} className="mt-6 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              className="h-10 w-full rounded-md border border-token bg-transparent px-3 text-sm"
              autoComplete="email"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="h-10 w-full rounded-md border border-token bg-transparent px-3 text-sm"
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            className="h-10 w-full rounded-md bg-[var(--brand-red)] text-sm font-semibold text-white hover:brightness-95"
          >
            Create account
          </button>
        </form>

        <p className="mt-4 text-xs text-zinc-500">
          Already have an account?{" "}
          <a className="underline underline-offset-4" href="/login">
            Sign in
          </a>
          .
        </p>
      </div>
    </div>
  );
}

