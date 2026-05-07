import Link from "next/link";
import Image from "next/image";

const unsplashAttribution = {
  href: "https://unsplash.com/?utm_source=trip-platform&utm_medium=referral",
  label: "Unsplash",
};

export default function AdminLandingPage() {
  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-white/10 text-sm font-semibold">
              TA
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Trip Admin</div>
              <div className="text-xs text-white/60">Operations Console</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=2400&q=80"
            alt="Operations team working"
            fill
            priority
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/70 to-zinc-950" />
          <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute -right-40 -bottom-52 size-[520px] rounded-full bg-cyan-400/20 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                Compliance • Support • Fleet • Ads • Wallets
              </p>
              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Run your fleet with calm, auditable control.
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base text-white/70 sm:text-lg">
                Verify drivers, review documents, handle support, and keep money
                moving—without losing the thread. Built for fast triage and clean
                accountability.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
                >
                  Open admin console
                </Link>
                <Link
                  href="/login?error=not_admin"
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/5"
                >
                  Not an admin?
                </Link>
              </div>

              <p className="mt-6 text-xs text-white/50">
                Background photo via{" "}
                <a
                  className="underline underline-offset-4 hover:text-white"
                  href={unsplashAttribution.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {unsplashAttribution.label}
                </a>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.8)]">
              <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Today</div>
                  <div className="text-xs text-white/60">Live overview</div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Kpi label="Trips completed" value="128" />
                  <Kpi label="Docs pending" value="14" />
                  <Kpi label="Open tickets" value="6" />
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Audit trail</div>
                  <div className="mt-2 space-y-2">
                    <LogLine action="Approved driver documents" meta="compliance" />
                    <LogLine action="Resolved ticket #1024" meta="support" />
                    <LogLine action="Paid out weekly earnings" meta="finance" />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Feature
                  title="Faster verification"
                  body="Review driver + vehicle docs with clear status and reasons."
                />
                <Feature
                  title="Support that scales"
                  body="See the full story and respond with confidence."
                />
                <Feature
                  title="Wallet visibility"
                  body="Track balances and transactions without spreadsheet drift."
                />
                <Feature
                  title="Ads + rewards"
                  body="Manage campaigns and measure views per trip."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-10 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <div>Trip Admin • Internal tool</div>
          <div>
            Need access? Ask an ops owner to add you to <code>admin_profiles</code>.
          </div>
        </div>
      </footer>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/70">{body}</div>
    </div>
  );
}

function LogLine({ action, meta }: { action: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/30 px-3 py-2">
      <div className="text-sm text-white/85">{action}</div>
      <div className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
        {meta}
      </div>
    </div>
  );
}

