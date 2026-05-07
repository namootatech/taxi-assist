import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { next, error } = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
    }
    redirect(next || "/");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Trip Admin</h1>
        <p className="mt-1 text-sm text-zinc-600">Sign in with your admin account.</p>
        <p className="mt-2 text-xs text-zinc-500">
          New here?{" "}
          <a className="underline underline-offset-4" href="/landing">
            View the console overview
          </a>
          .
        </p>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error === "not_admin"
              ? "This account is not authorized for the admin console."
              : decodeURIComponent(error)}
          </div>
        ) : null}

        {/* simple, dependency-free form */}
        <form action={signIn} className="mt-6 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              className="h-10 w-full rounded-md border px-3 text-sm"
              autoComplete="email"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">Password</span>
            <input
              name="password"
              type="password"
              required
              className="h-10 w-full rounded-md border px-3 text-sm"
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="h-10 w-full rounded-md bg-black text-sm font-medium text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

