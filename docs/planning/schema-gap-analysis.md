# Platform schema & planning gap analysis

**APD-Resume (2026-05-07):** This file is the **canonical** gap register. Legacy paths `docs/admin/*` referenced below now live under `docs/planning/admin/planning/` and `docs/planning/admin/prompts/`.

## Normalization gaps (documentation only)

| Gap | Severity | Notes |
|-----|----------|--------|
| **Rider app** | Medium | **Planning done** (`docs/planning/rider_app/`). Remaining: `apps/rider_app` scaffold, rider trip request RPCs/RLS, wallet/ad tables as in appendix below. |
| **APD six-pack per app** | Medium | `admin` and `drivers` each still need `user-roles-and-permissions.md`, `user-flows-and-ux-logic.md`, and `ui-design-system.md` (stubs created in this pass—expand from `app-prd.md`). |
| **Driver prompts → APD 5-phase** | Low | Eight sequential prompts retained; see `drivers/prompts/INDEX.md` for mapping to foundation → deploy. |
| **Platform PRD split** | Medium | Single `master-prd.md` / vision docs synthesized; reconcile with `supporting-documents/prd-overview.md` on next edit pass. |
| **Rules vs filenames** | Low | Global `apd-rules.mdc` may reference `01-product-vision.md`; this repo uses **kebab-case** platform names—recorded in `docs/system/project-summary.md`. |
| **Trip Media Web App** | Medium | **Planning done** (`docs/planning/trip_media_web/`). Remaining: migrations for `media_partners`, `partner_members`, `partner_subscriptions`, `ad_creatives`, `partner_billing_events`; extend `ad_campaigns` with `partner_id`; Edge Functions for Payfast/Paystack; `apps/trip_media_web` scaffold. See ADR 003. |
| **Trip Website** | Low | **Planning done** (`docs/planning/trip_website/`). Remaining: `apps/trip_website`; optional `marketing_leads` + form Edge handler; content/marketing pass. |

### Rider app — implementation gaps (planning)

- **`apps/rider_app`** not in monorepo yet.
- **Trip request from rider:** RPC or insert path for `trips` as rider-owned action; RLS today may be driver-centric — confirm before rider prompt 03.
- **`trip_locations`:** rider-initiated location updates need policy design.
- **Wallets / `ad_views`:** still per appendix below.

---

## Admin / Supabase schema gap (migrated content)

This section summarizes what is **already implemented** in `supabase/migrations/` and what is **still missing** to satisfy:

- `docs/planning/admin/planning/app-prd.md` (formerly `prd&techstack.md`)
- `docs/planning/admin/planning/data-model-and-app-entities.md` (formerly `business-logic.md`)

### Existing tables/behaviors already present

- **Profiles (driver-focused)**: `public.profiles`
  - RLS: driver can select/insert/update own profile.
  - Fields include `status`, `online_status`, `current_vehicle_id`, training flags.
  - Realtime publication includes `public.profiles`.
- **Vehicles**: `public.vehicles`
  - RLS: driver can CRUD vehicles linked to them.
- **Documents**: `public.documents`
  - Entity types currently: `DRIVER`, `VEHICLE`.
  - RLS: driver can insert/select own uploads.
  - Realtime publication includes `public.documents`.
  - Index for expiry/status queries exists.
- **Trips**: `public.trips`
  - Driver select policy exists.
  - Lifecycle is mediated via RPCs:
    - `public.driver_transition_trip(...)` (security definer)
    - `public.driver_rate_completed_trip(...)`
  - Realtime publication includes `public.trips`.
- **Trip locations**: `public.trip_locations` with insert/select policies.
- **Support tickets**: `public.support_tickets` (driver insert/select own; admin select/update policies exist).
- **Payouts**: `public.payouts` (driver select own; admin select/update policies exist; payout proof/status UI still partial).
- **Storage**:
  - Buckets: `driver-documents`, `vehicle-photos` (currently public)
  - Policies enforce `{auth.uid()}/...` prefix ownership.

### Admin platform implementation state (codebase scan 2026-05-08)

The following items previously listed as admin schema gaps now have migration anchors:

- **Admin identity + RBAC:** `admin_profiles`, `is_admin()`, `admin_role()`, and admin RLS policies are in `20260507153000_admin_rbac_audit_and_admin_rls.sql`.
- **Admin-facing RLS:** admin select/update policies exist for profiles, vehicles, documents, trips, trip locations, support tickets, and payouts in `20260507153000_admin_rbac_audit_and_admin_rls.sql`; support ticket update policy is extended in `20260507161000_admin_support_ticket_updates.sql`.
- **Audit logging:** `audit_logs` and `admin_audit_log(...)` exist in `20260507153000_admin_rbac_audit_and_admin_rls.sql`.
- **Wallets + ledger:** `wallets`, `wallet_transactions`, and `admin_wallet_adjust(...)` exist in `20260507160000_admin_wallets_ads_trip_events_and_expiry.sql`.
- **Ads:** `ad_campaigns` and `ad_views` exist in `20260507160000_admin_wallets_ads_trip_events_and_expiry.sql`.
- **Trip events:** `trip_events` exists in `20260507160000_admin_wallets_ads_trip_events_and_expiry.sql`; driver cancellation writes events via `20260508052000_driver_cancel_reason_required.sql`.
- **Document expiry automation:** `apply_document_expiry()` and `expire_approved_documents()` exist in `20260507160000_admin_wallets_ads_trip_events_and_expiry.sql`.

### Remaining admin/platform gaps

#### 1) Admin UI depth

`apps/admin_app` has substantial routes for dashboard, verification, drivers, vehicles, riders, trips, wallets, ads, support, audit, admins, analytics, payments, ratings, and settings. Some routes remain scaffolding or thin MVP surfaces:

- `analytics`, `payments`, and `settings` are explicitly marked scaffolding in code.
- `riders` notes future search/filter/inline actions.
- Admin trip interventions and payout proof handling need deeper UI/RPC coverage before production operations.

#### 2) Storage hardening for POPIA

Buckets are still recorded as public in the original storage migration. Admin verification uses signed URLs, but POPIA hardening still requires making buckets private and aligning storage object policies for driver/admin access.

#### 3) Partner media & billing (Trip Media Web — add after/admin alongside ads)

Missing tables (planning detail in `trip_media_web/planning/data-model-and-app-entities.md`):

- `public.media_partners`, `public.partner_members`, `public.ad_packages` (catalog)
- `public.partner_subscriptions`, `public.partner_billing_events`
- `public.ad_creatives` (partner-owned assets + moderation fields)

Extensions:

- `ad_campaigns.partner_id` (nullable during transition), links to `ad_creatives` / subscription for entitlement checks

Edge:

- Webhook handlers for **Payfast** (primary ZA) and optional **Paystack**; idempotent processing

#### 4) Rider trip/wallet/ad execution paths

Rider app remains docs-only. Confirm RLS/RPC design for rider trip requests, rider location writes, wallet consumption, and ad reward crediting before executing rider prompts.
