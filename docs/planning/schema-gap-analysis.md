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
- **Support tickets**: `public.support_tickets` (driver insert/select own).
- **Payouts**: `public.payouts` (driver select own; admin/service inserts later).
- **Storage**:
  - Buckets: `driver-documents`, `vehicle-photos` (currently public)
  - Policies enforce `{auth.uid()}/...` prefix ownership.

### Gaps to build the Admin Platform (migrations to add)

#### 1) Admin identity + RBAC (required)

Add tables and policies so that an authenticated **admin user** can read/write admin-only data under RLS.

- `public.admin_profiles`:
  - `user_id uuid primary key references auth.users(id)`
  - `role text not null` (enum-like check constraint)
  - `created_at`, `disabled_at`, optional `display_name`
- Optional `public.admin_role_permissions` (if capability matrix needs to be data-driven)

RLS requirements:

- Only admins can `select` from `admin_profiles`.
- Allow `superadmin` to manage admin profiles; other roles read-only or none.

#### 2) Admin-facing RLS policies on existing tables

Today, many tables are “driver owns row” policies. Admin app requires **read access** and **mutation access** (approve/reject, suspend, etc.) under RLS.

Approach:

- Create `public.is_admin()` helper (security definer) that checks `admin_profiles` for `auth.uid()`.
- Create `public.admin_role()` helper for role-based policies.
- Add `select` policies on:
  - `profiles`, `vehicles`, `documents`, `trips`, `trip_locations`, `support_tickets`, `payouts`
- Add carefully scoped `update` policies for admin actions:
  - `documents`: set `status`, `reviewed_by`, `reviewed_at`, `decline_reason`
  - `profiles`: set `status`, `online_status` (force offline), flags/suspensions
  - `vehicles`: set `status`
  - `trips`: admin cancel + reason, (rare) fare adjustment fields
  - `payouts`: status transitions + references

#### 3) Audit logging (required)

Add `public.audit_logs` (append-only) with a consistent schema:

- `audit_id bigserial primary key`
- `actor_admin_user_id uuid` (auth.users id)
- `actor_role text`
- `action text` (e.g. `document.approve`, `profile.suspend`)
- `entity_type text`, `entity_id uuid`
- `reason text` (mandatory for sensitive actions)
- `metadata jsonb` (diff snapshot)
- `created_at timestamptz default now()`

Implementation:

- Prefer trigger helpers like `public.audit_log_insert(...)` called from RPCs or from controlled UPDATE triggers.
- For high-risk mutations, prefer **RPCs** that both mutate and audit in one transaction.

#### 4) Wallets + ledger (required by PRD/business logic)

Missing tables:

- `public.wallets` (one per profile per wallet type)
- `public.wallet_transactions` (append-only ledger)

Constraints:

- Non-negative balance invariant enforced via:
  - computed balance from ledger, or
  - balance column + trigger that blocks negative results.

Admin actions:

- Manual adjustment RPC requiring reason + optional second-factor approvals later.

#### 5) Ads (Taxi Assist Media) (required by PRD/business logic)

Missing tables:

- `public.ad_campaigns`
- `public.ad_views`

Key rule:

- Reward credit only after **full watch + rating + comment** → model as `ad_views.state` with required fields, and only then allow wallet credit transaction.

#### 5b) Partner media & billing (Trip Media Web — add with or after §5)

Missing tables (planning detail in `trip_media_web/planning/data-model-and-app-entities.md`):

- `public.media_partners`, `public.partner_members`, `public.ad_packages` (catalog)
- `public.partner_subscriptions`, `public.partner_billing_events`
- `public.ad_creatives` (partner-owned assets + moderation fields)

Extensions:

- `ad_campaigns.partner_id` (nullable during transition), links to `ad_creatives` / subscription for entitlement checks

Edge:

- Webhook handlers for **Payfast** (primary ZA) and optional **Paystack**; idempotent processing

#### 6) Trip events / admin interventions (required)

Add `public.trip_events` (append-only event stream) capturing:

- status transitions, cancels, fare adjustments, dispute events
- actor info (driver vs admin)

#### 7) Document expiry automation + side effects

Current migrations include an index; they do **not** implement the automated transition.

Add either:

- a `pg_cron` job (preferred for “daily sweep”), or
- an `on update/insert` trigger that sets `EXPIRED` when `expiry_date < today` (still needs periodic enforcement).

Side effects:

- if critical docs expire → prevent go-online (already checked) and optionally force offline.

#### 8) Storage hardening for POPIA

Buckets are currently `public=true`. For admin platform + POPIA, plan to:

- make buckets private
- use signed URLs for document viewing
- keep RLS on `storage.objects` aligned to admin access

### Suggested migration ordering (when you build later)

1. `admin_profiles` + admin helper functions (`is_admin`, `admin_role`)
2. Admin RLS `select` policies on existing tables
3. `audit_logs` + audit helper functions/RPC pattern
4. Admin mutation policies (or RPCs) for documents/profiles/vehicles/trips/payouts
5. Wallets + ledger
6. Ads tables + reward credit logic
7. `trip_events`
8. Document expiry automation
9. Storage bucket privacy + signed URL strategy
