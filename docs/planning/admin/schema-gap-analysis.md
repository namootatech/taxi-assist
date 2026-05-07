## Trip Admin Platform — schema gap analysis (plan)

This document summarizes what is **already implemented** in `supabase/migrations/` and what is **still missing** to satisfy:
- `docs/admin/prd&techstack.md`
- `docs/admin/business-logic.md`

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

