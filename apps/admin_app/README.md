# Trip — Admin console

Internal Next.js 15 app that gives Operations, Compliance, Finance, Ad Moderation, Support, and Fraud Analysts the controls they need to run the Trip platform.

## Stack

- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS with project-wide design tokens (`app/globals.css`)
- Supabase (server + browser clients in `lib/supabase/`)
- React Hook Form + Zod for forms, Sonner for toasts
- Sentry for error reporting (instrumentation files at the app root)
- Reverse proxy at `proxy.ts` for route-level auth + capability gating

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Set these variables in `.env.local`:

| Variable | Required | Purpose |
| ------------------ | -------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by server and browser clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key used for auth and invoking `send-email` |
| `EMAIL_INTERNAL_SECRET` | Yes | Shared secret required by the `send-email` Edge Function |

Supabase function-level email secrets are documented in `supabase/functions/send-email/README.md`.

## Module overview

| Area               | Routes                                                                                  | Notes                                       |
| ------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------- |
| Auth               | `/(auth)/login`, `/(auth)/register`                                                     | Supabase Auth                               |
| Verification       | `/verification`                                                                         | Document review for compliance              |
| Drivers / Riders   | `/drivers`, `/riders`, `/vehicles`                                                      | Browse, suspend, intervene                  |
| Trips              | `/trips`, `/trips/[id]`                                                                 | Live + historical                           |
| Wallets / Payments | `/wallets`, `/payments`                                                                 | Ledger view + adjustments                   |
| Trip Media         | `/creatives`, `/ads`, `/trip-media/{overview,advertisers,rider-rewards,fraud,analytics,reports,settings}` | New: see below           |
| Support            | `/support`                                                                              | Tickets and replies                         |
| Audit              | `/audit`                                                                                | Append-only history                         |
| Admins             | `/admins`                                                                               | Super Admin only                            |

## Trip Media console

Built May 2026. Shipped as a sidebar group with two parents:

- `/creatives` and `/ads` — kept at their original URLs.
- `/trip-media/*` — overview, advertisers, rider-rewards, fraud, analytics, reports, settings.

What it does:

- **Creative review** with signed-URL preview and Approve / Reject / Request changes / Suspend / Flag actions.
- **Campaign oversight** with Pause, Resume, Force-stop, Adjust delivery, and an anomaly link into Fraud.
- **Advertiser oversight** with Suspend / Restore and Adjust promotional credits.
- **Rider rewards** with Freeze and Reverse (gated separately for fraud analysts vs finance).
- **Fraud triage** with status + level filters, a triage panel, and auto-generated candidates.
- **Analytics** for the last 14 days (completion trends, peak hours, top campaigns, completion distribution, average reward cost).
- **Reports** as four streamed CSVs, audited via `admin_record_report_run`.
- **Settings** for reward caps, rejection reasons, risk thresholds, and watch rules — persisted to `trip_media_settings`.

The 7-role capability matrix lives in `lib/permissions.ts` and is documented in `docs/planning/admin/planning/user-roles-and-permissions.md`. New role added: `fraud_analyst`.

The migration that introduces the schema is `supabase/migrations/20260508140000_trip_media_admin_oversight.sql`.

## Conventions

- Server-first: data fetching happens in Server Components; client components are reserved for interaction (`use client` flag).
- Forms: every new form uses `react-hook-form` + `zod` with `sonner` toasts.
- Reasons: every destructive or financial action requires a reason that the audit log keeps.
- Native dialogs: do not use `window.prompt` / `window.confirm`. Use `components/trip-media/PromptDialog.tsx` or `components/feedback/ConfirmDialog.tsx`.
- Capability checks happen three times: in `proxy.ts` (route), in the server action / route handler, and in the SQL function (`SECURITY DEFINER` RPCs).
