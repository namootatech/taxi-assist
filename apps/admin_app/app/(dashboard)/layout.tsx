import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { allowedNavForRole } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: adminProfile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const role = adminProfile?.role ?? null;
  const nav = allowedNavForRole(role);

  return (
    <div className="flex min-h-full flex-1 bg-zinc-50">
      <aside className="hidden w-64 flex-col border-r bg-[var(--brand-navy-900)] p-4 text-white md:flex">
        <div className="text-sm font-semibold tracking-tight">Trip Admin</div>
        <div className="mt-6 flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b bg-white px-4 py-3 md:px-6">
          <div className="text-sm text-zinc-600">
            Signed in as <span className="font-medium">{user?.email ?? "unknown"}</span>
            {role ? (
              <span className="ml-2 rounded bg-[var(--brand-navy-50)] px-2 py-0.5 text-xs text-[var(--brand-navy-900)]">
                {role}
              </span>
            ) : null}
          </div>
          <form
            action={async () => {
              "use server";
              const supabase = await createSupabaseServerClient();
              await supabase.auth.signOut();
            }}
          >
            <button className="h-9 rounded-md border px-3 text-sm hover:border-[var(--brand-red)]">
              Sign out
            </button>
          </form>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

