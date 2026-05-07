You are an elite full-stack architect building the **Trip Admin Platform** — an internal operations console for a South African ride-hailing + ad-tech startup.

This prompt is the single “build it” artifact. Requirements must match:
- `docs/admin/prd&techstack.md` (product scope + tech stack)
- `docs/admin/business-logic.md` (entities + workflows + invariants)

## Project goal
Build a secure, real-time, production-grade admin dashboard using **Next.js 15 (App Router) + Supabase** that allows **Operations, Compliance, Finance, Ad Managers, Support, and SuperAdmins** to manage riders, drivers, vehicles, trips, wallets/finance, ads (Taxi Assist Media), support, and audit.

## Success metrics (MVP)
- 95% of document verifications completed within 24 hours
- < 2% fraud rate on trips (support with flags + auditability; keep detection rules simple in MVP)
- Full audit trail on all financial and status changes
- Admin team can handle 500+ daily verifications and live trip oversight

## Tech stack (strictly follow)
- **Framework**: Next.js 15.2+ App Router, TypeScript (strict)
- **Styling**: Tailwind CSS + shadcn/ui + Radix primitives + `tailwind-merge` + `clsx`
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table v8 + shadcn DataTable patterns
- **Data fetching**: Server Components + Server Actions by default
- **Client cache/realtime**: TanStack Query v5 only where client-side subscriptions/optimism is required
- **Database**: Supabase Postgres (RLS is the primary authz layer)
- **Auth**: Supabase Auth + custom RBAC tables/policies
- **Realtime**: Supabase Realtime subscriptions + Presence (online drivers)
- **Storage**: Supabase Storage (documents, car photos, ad videos) with signed URLs
- **Charts**: Tremor or Recharts
- **Maps**: Leaflet + react-leaflet (Mapbox only if cost/needs justify)
- **Notifications**: Sonner + Lucide icons
- **Deployment-ready**: Vercel + Supabase

## Project structure (create exactly)
```
/trip-admin/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Main Dashboard
│   │   ├── riders/
│   │   ├── drivers/
│   │   ├── vehicles/
│   │   ├── verification/            # verification queue + review UI
│   │   ├── trips/
│   │   ├── wallets/
│   │   ├── ads/
│   │   ├── support/
│   │   ├── audit/
│   │   └── settings/
│   ├── api/                         # Route handlers / webhooks (minimal)
│   └── globals.css
├── components/
│   ├── ui/                          # shadcn components
│   ├── dashboard/
│   ├── tables/
│   ├── forms/
│   ├── verification/
│   └── common/
├── lib/
│   ├── supabase/                    # client + server clients
│   ├── auth.ts
│   ├── utils.ts
│   └── permissions.ts               # role → capabilities mapping
├── hooks/
├── types/
├── schemas/                         # Zod schemas
├── middleware.ts
└── README.md
```

## Supabase migrations (important)
- This repo already has an existing Supabase project with migrations at **repo root**: `supabase/migrations/`.\n+- **Do not** create `/trip-admin/supabase/migrations/`.\n+- When adding DB changes for the admin platform, **extend the existing schema** by adding new timestamped SQL files under `supabase/migrations/`.\n+- Do **not** duplicate tables that already exist (see “Existing migrations already present” below).\n+
## Core principles (non-negotiable)
1. **Security first**: Every sensitive table uses **Row Level Security (RLS)**. Never ship admin features that require bypassing RLS.
2. **Server-first**: Prefer Server Components/Actions. Use client components + TanStack Query only when truly needed (realtime tables, optimistic updates).
3. **Auditability**: All critical mutations emit immutable audit logs (**who / what / when / why**).
4. **Realtime where it matters**: pending verifications, live trips, online drivers, KPIs.
5. **South African context**: +27 phones, ID/passport, address formats, POPIA constraints.
6. **Desktop-first responsive**: optimize for ops teams; tablet support is a bonus.
7. **Performance**: <2s load for major tables via pagination, indexes, selective columns.

## Business logic you must implement (condensed)

### Core entities
- **Rider profile**: identity, contacts, address, verification state, wallet linkage
- **Driver profile**: identity, license (code/number/PRDP), bank details, photo, training + verification state, vehicle links
- **Vehicle**: reg number, make/model/color/category, VIN, owner type (private/business), driver links
- **Company owner (fleet)**: company reg, name/address, director docs
- **Documents**: type, file URL(s), expiry date, status (Pending/Approved/Rejected/Expired), uploaded_by, reviewed_by, review timestamp, reviewer notes
- **Trips**: rider_id, driver_id, car_id, pickup/dropoff, status, estimated/actual fare, payment method, tips, ad watch session metadata, ratings
- **Wallets + transactions**: rider and driver wallets, balances, immutable ledger
- **Ads (Taxi Assist Media)**: campaigns, targeting, views, reward per view
- **Admin users**: roles (SuperAdmin, Operations, Compliance, Finance, AdManager, Support)

### Invariants (always true)
- A driver can only be **online** with **exactly one approved vehicle** linked.
- Driver docs **and** vehicle docs must be **Approved** before trip assignment.
- Wallet balances must **never go negative** (unless you explicitly implement a controlled overdraft rule for hybrid payments).
- Document expiry automatically flips status to **Expired**.
- Completed trip financials become **immutable after the settlement window** (default: 24h).
- Ad view credit only after **full watch + rating + comment**.

### State machines (persist these as columns + events)
- **Document status**: Pending → Approved | Rejected; Approved → Expired (automated); Rejected → Pending (re-upload)
- **Driver profile**: Incomplete → PendingVerification → TrainingRequired → Active | Suspended | Deactivated
- **Vehicle**: Registered → DocumentsPending → Approved | Rejected
- **Trip status**: Requested → Assigned → DriverEnRoute → Arrived → InProgress → Completed | Cancelled

### Critical workflows
- **Verification queue**: prioritized list of pending documents/profiles; approve/reject requires mandatory notes; full audit trail.
- **Trip oversight**: view live + historical trips; admin intervention (cancel with reason, fare adjust rarely) must be audited.
- **Wallet & finance**: ledger views; manual adjustments audited; driver payouts initiated/confirmed with proof upload; cash reconciliation.
- **Ads**: campaign CRUD, targeting (time slots + geo zones + segments), caps, performance.
- **Support**: ticketing and messaging to riders/drivers.

## Auth + RBAC (must be implemented)
- Use Supabase Auth for admin login.
- Create `admin_profiles` with role:
  - `superadmin` | `compliance` | `operations` | `finance` | `ad_manager` | `support`
- Implement a clear **capabilities** layer (e.g. `canApproveDocuments`, `canAdjustFare`, `canProcessPayouts`) mapped from role.
- Protect all dashboard routes with `middleware.ts` and server-side checks.
- **No service role in the admin app**: all admin reads/writes must be done as the logged-in admin user under RLS policies.

## Database (design + generate schema SQL first)

## Existing migrations already present (extend; don’t recreate)
These already exist in `supabase/migrations/` and must be treated as the starting point:\n+- `public.profiles` (driver-focused fields + driver RLS policies)\n+- `public.vehicles` (+ RLS)\n+- `public.documents` (driver/vehicle docs + realtime publication)\n+- `public.trips` (+ realtime) and trip lifecycle RPCs\n+- `public.trip_locations`\n+- `public.support_tickets`\n+- `public.payouts`\n+- Storage buckets/policies: `driver-documents`, `vehicle-photos`\n+
In the admin build, add missing tables/columns/policies by **migrating forward** (new files), not by re-creating the above.

### Required tables (MVP)
Design and generate migrations for:
- `admin_profiles` (+ optional `admin_roles` if you prefer relational roles)
- `profiles` (riders + drivers unified with discriminator)
- `vehicles`
- `driver_documents`, `vehicle_documents`
- `trips`, `trip_events`
- `wallets`, `wallet_transactions`
- `ad_campaigns`, `ad_views`
- `support_tickets`
- `audit_logs`

### Required DB behaviors
Implement indexes, constraints, triggers, and scheduled jobs to satisfy:
- **Document expiry automation**: on expiry date → status Expired; required side effects (e.g. force driver offline) must be supported by data.
- **Audit log triggers**: immutable `audit_logs` rows on all sensitive mutations.
- **Ledger integrity**: `wallet_transactions` is append-only; `wallets.balance` must always equal sum(ledger) or be updated via controlled triggers; never allow negative unless explicitly allowed.
- **Trip settlement immutability**: block edits to financial fields after 24h from completion (configurable), except via privileged, audited override.
- **Ad reward credit conditions**: only credit after the full interaction sequence is recorded.

### RLS policies (mandatory)
- Treat RLS as the primary authorization layer.
- Write policies so that only authenticated admins can access admin data, and only within allowed capabilities.
- Use views/materialized views for read-heavy admin dashboards if needed.

## UI/UX requirements
- Dark/light mode via shadcn theme.
- Sidebar nav (collapsible) + top bar showing user + role.
- Consistent DataTables: filtering, sorting, pagination, CSV export.
- Detail views: profile pages with document gallery (signed URLs) + action panels.
- Verification review UI: side-by-side doc viewer + decision form (mandatory notes).
- Dashboard: KPI cards + charts + map view for active trips.
- Excellent loading/empty/error states and toasts for mutations.

## MVP scope and phased build order (do not skip order)

### Phase 1 — Foundation (launch-critical)
Build:
1. Next.js project scaffold + dependencies + styling system.
2. Supabase client setup (server/client) + environment conventions.
3. Supabase schema + RLS + core triggers + audit logging foundation.
4. Auth (admin login) + middleware route protection + RBAC capabilities.
5. Dashboard shell (layout, nav, base pages).
6. Core entity browsing: Riders, Drivers, Vehicles (tables + detail pages).

**Phase 1 acceptance criteria**
- Admin can log in and is routed based on role.
- RLS is enabled on all sensitive tables; basic read paths work without bypass.
- Audit logs are written for at least: approve/reject doc, suspend user, manual wallet adjustment, trip cancel/adjust.
- Admin can search/filter riders/drivers/vehicles and view details.

### Phase 2 — Core operations
Build:
- Verification queue + document review flow (highest priority workflow).
- Document gallery + approve/reject with mandatory notes + re-upload history.
- Trip monitoring (live + historical) + intervention actions (audited).
- Wallet ledger views + manual adjustments (audited) + cash reconciliation views.

**Phase 2 acceptance criteria**
- Pending verifications update in realtime.
- Document status transitions enforce the state machine.
- Live trips update in realtime; admin interventions are recorded and auditable.
- Wallet ledger is consistent and non-negative rules are enforced.

### Phase 3 — Monetization + support + oversight
Build:
- Ads: campaign CRUD, targeting, caps, performance dashboard.
- Support: tickets + messaging + templates.
- Finance: payout processing flow (upload proof) + audit.
- Audit log viewer (filters by entity/action/admin/time).

**Phase 3 acceptance criteria**
- Ad campaigns can be created and tracked; view counts and reward rules are enforced.
- Support tickets can be created/managed; messages are auditable.
- Payouts are trackable end-to-end with proof artifacts.

## Deliverable requirements (apply to every module)
- Zod schemas for all forms and inputs.
- Server Actions for mutations; avoid client-side direct writes unless necessary.
- Realtime subscriptions where data changes frequently.
- Strict TypeScript types and runtime validation at boundaries.
- Proper error boundaries, loading states, and user feedback.
- Every state-changing action writes audit logs.

## Start now
Start by generating the Supabase schema + RLS + audit logging foundation, then build auth/RBAC and the dashboard shell. After each phase, pause and ask for confirmation before moving on.
