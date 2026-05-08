## Trip Admin Platform — Next.js admin app execution plan (build later)

This is a practical build plan for the `/trip-admin/` Next.js 15 admin console that matches:
- `docs/planning/admin/planning/app-prd.md` (formerly `prd&techstack.md`)
- `docs/planning/admin/planning/data-model-and-app-entities.md` (formerly `business-logic.md`)
- existing schema + future migrations described in `docs/planning/schema-gap-analysis.md`

### 0) Preconditions
- Supabase schema is extended (not duplicated) via `supabase/migrations/`.
- `admin_profiles` exists and admin users are created in Supabase Auth + `admin_profiles`.
- RLS policies grant admins the required `select`/`update` access **by role**.
- Documents storage is accessible via **signed URLs** (or temporarily public in dev only).

### 1) Create the admin app skeleton (`/trip-admin/`)
Deliverable:
- Next.js 15 App Router project with strict TypeScript.
- Tailwind + shadcn/ui configured.
- Supabase client split:
  - server client for Server Components/Actions
  - browser client for realtime subscriptions

Acceptance criteria:
- `pnpm dev` (or chosen package manager) runs successfully.
- Basic shadcn component renders.
- Supabase connection works in server + client contexts.

### 2) Auth + RBAC enforcement
Build:
- `(auth)/login` page using Supabase Auth.
- `middleware.ts` protecting all dashboard routes:
  - redirect unauthenticated → login
  - fetch role from `admin_profiles`
  - block disallowed routes by role
- `lib/permissions.ts` capability map:
  - `compliance`: verification + profile/doc review
  - `operations`: trips/live ops + interventions
  - `finance`: wallets + payouts + adjustments
  - `ad_manager`: campaigns + performance
  - `support`: tickets + messaging
  - `superadmin`: everything + admin management

Acceptance criteria:
- Logging in routes to dashboard.
- A non-admin user is denied (no `admin_profiles` row).
- Each role can only access allowed sections.

### 3) Dashboard shell + navigation
Build:
- `(dashboard)/layout.tsx` with:
  - collapsible sidebar
  - topbar with user + role + logout
  - consistent page container + breadcrumbs

Acceptance criteria:
- Fast navigation, consistent layout, proper loading states.

### 4) Phase 1 UI — Core browsing (Riders/Drivers/Vehicles)
Build:
- DataTable pattern (TanStack Table v8 + shadcn):
  - server-side pagination/sorting/filtering
  - column toggles
  - CSV export (client-side export from current dataset or server-generated)
- Pages:
  - `/drivers`: list + filters by status/online/current_vehicle
  - `/vehicles`: list + filters by status/category/linked_driver
  - `/riders`: list (may require extending `profiles` discriminator or separate table)
- Detail views:
  - profile summary
  - documents gallery (signed URLs)
  - trip history tab
  - wallet tab placeholder (until wallets exist)

Acceptance criteria:
- Major tables load <2s for typical page sizes.
- No over-fetching (select only columns needed).
- Works under RLS (no service role).

### 5) Phase 2 UI — Verification queue (highest priority)
Build:
- `/verification` queue:
  - filters: status, entity type, expiry soon, high-risk flags
  - realtime updates (new uploads, status changes)
- Review screen:
  - side-by-side doc viewer
  - approve/reject actions with mandatory notes
  - show history of prior uploads for same doc type (if modeled)
- Ensure audit log is created on every decision.

Acceptance criteria:
- Compliance role can process docs quickly (keyboard-friendly UX).
- Realtime updates without refresh.
- Every decision writes `audit_logs`.

### 6) Phase 2 UI — Trip monitoring + interventions
Build:
- `/trips`:
  - live trips table (status, driver, rider, ETA-ish, payment method)
  - historical search + export
- Map view:
  - basic Leaflet map showing active trips + latest driver pings from `trip_locations`
- Intervention actions:
  - cancel trip (reason required)
  - fare adjustment (rare; capability-gated; reason required)
  - contact shortcuts (if messaging/phone data exists)

Acceptance criteria:
- Operations role can see live trips and act.
- Interventions are capability-gated and audited.

### 7) Phase 2 UI — Wallet + finance surfaces
Build:
- `/wallets`:
  - per-user ledger view
  - manual adjustment flow (Finance only; reason required; audited)
- `/payouts`:
  - payout queue by status
  - mark paid/failed + reference/proof metadata

Acceptance criteria:
- Ledger is append-only and consistent.
- Adjustments require reason and create audit rows.

### 8) Phase 3 UI — Ads + Support + Audit
Build:
- `/ads`:
  - campaign CRUD
  - targeting controls (time slots, zones, segments)
  - performance dashboard (views, completion, spend/revenue)
- `/support`:
  - ticket list + statuses
  - messaging thread UI
  - template responses
- `/audit`:
  - filters (actor, action, entity, time)
  - drill-down diff metadata

Acceptance criteria:
- AdManager can run campaigns end-to-end.
- Support can resolve tickets and everything is auditable.
- Audit viewer makes investigations fast.

### 9) Testing + quality gates (lightweight but real)
- Unit tests for `permissions.ts` + critical utilities.
- Minimal Playwright smoke tests:
  - login → dashboard
  - verification approve/reject flow
  - trips list loads

### 10) Trip Media admin console (built May 2026)

The Trip Media console lives under two parents:

- `/creatives` and `/ads` — kept at their original URLs for backward compatibility.
- `/trip-media/*` — overview, advertisers, rider-rewards, fraud, analytics, reports, settings.

The sidebar groups all of them under a "Trip Media" group. RBAC additions are documented in `user-roles-and-permissions.md`.

#### File map

```
apps/admin_app/
├── app/
│   ├── (dashboard)/
│   │   ├── creatives/
│   │   │   ├── CreativesQueue.tsx      # client: queue + review panel
│   │   │   └── page.tsx                # server: data + signed URLs
│   │   ├── ads/
│   │   │   ├── CampaignsConsole.tsx    # client: filters + drawer
│   │   │   └── page.tsx                # server: campaigns + counts
│   │   └── trip-media/
│   │       ├── overview/page.tsx
│   │       ├── advertisers/{page.tsx, [id]/AdvertiserActions.tsx, [id]/page.tsx}
│   │       ├── rider-rewards/{RewardActions.tsx, page.tsx}
│   │       ├── fraud/{FraudConsole.tsx, page.tsx}
│   │       ├── analytics/page.tsx
│   │       ├── reports/page.tsx
│   │       └── settings/{SettingsForms.tsx, page.tsx}
│   └── api/trip-media/reports/[kind]/route.ts   # CSV streamer
├── components/trip-media/
│   ├── PromptDialog.tsx                # accessible prompt-with-textarea
│   └── Surface.tsx                     # Panel, KpiCard, StatusPill, …
└── lib/trip-media/
    ├── advertisers.ts        # list + detail loaders
    ├── analytics.ts          # 14-day analytics bundle
    ├── campaigns.ts          # campaign loaders
    ├── creatives.ts          # creative queue + signed URLs
    ├── format.ts             # ZAR currency, dates, percentages
    ├── fraud.ts              # signals, candidates, counts
    ├── policy-constants.ts   # default reasons, risk options, settings keys
    ├── queries.ts            # overview KPIs + recent actions
    ├── reports.ts            # report definitions + CSV builders
    ├── rewards.ts            # recent / holds / wallet trails
    ├── role-content.ts       # role explainer copy
    ├── server-actions.ts     # all RPC calls behind one module
    └── settings.ts           # JSONB settings + parsers
```

#### Route gating

`apps/admin_app/proxy.ts` adds:

```ts
{ prefix: "/creatives", capability: "moderate_creatives" },
{ prefix: "/trip-media/overview", capability: "view_trip_media_overview" },
{ prefix: "/trip-media/advertisers", capability: "view_advertisers" },
{ prefix: "/trip-media/rider-rewards", capability: "view_rider_rewards" },
{ prefix: "/trip-media/fraud", capability: "view_fraud" },
{ prefix: "/trip-media/analytics", capability: "view_trip_media_analytics" },
{ prefix: "/trip-media/reports", capability: "view_reports" },
{ prefix: "/trip-media/settings", capability: "manage_trip_media_settings" },
{ prefix: "/trip-media", capability: "view_trip_media" }, // catch-all
```

The catch-all sits last so each leaf prefix wins by specificity. Unknown sub-paths fall back to the broad `view_trip_media` check.

#### Form discipline

Every form on the new surfaces uses `react-hook-form` + `zod` + `sonner`. The shared `PromptDialog` replaces native `window.prompt` for short reason capture, with focus management, ESC-to-close, and minimum-length validation.

#### CSV reports

`/api/trip-media/reports/[kind]` reads with the user's session, calls `admin_record_report_run` after the CSV is built, streams `text/csv` with `Cache-Control: no-store`, and returns a JSON error envelope on failure. Four kinds today: `creative_actions`, `campaign_actions`, `reward_ledger`, `fraud_signals`.

#### What is intentionally out of scope (today)

- Coverage by city — we surface an explicit empty state on `/trip-media/analytics` until the rider client emits trip city.
- Inline rider/trip drilldowns from the Fraud console — IDs are shown, deep links land on the existing rider/trip pages.
- Bulk actions across the queue — every action is per-row to keep audit trails clean.

