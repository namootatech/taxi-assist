## Clerk-driven auth + Supabase RLS (implementation & migration runbook)

This document is the operational plan for moving all apps to **Clerk-managed authentication** while keeping **Supabase sessions + RLS** as the canonical authorization layer (so `auth.uid()` continues to drive policies).

### Summary of the target flow

1. User signs in / signs up / recovers account in **Clerk**
2. App obtains an **OIDC ID token** from Clerk (`sub` = Clerk user id)
3. App exchanges that token for a **Supabase session** (`signInWithIdToken`)
4. App uses Supabase as normal; RLS sees `auth.uid()`
5. Logout clears **both** Clerk + Supabase sessions (single sign-out)

### Non-negotiables

- **Do not** use Supabase email/password auth anymore in apps.
- **Do not** use Supabase service-role keys in client code.
- **Do not** relax RLS to “make it work”. Migrate data to match `auth.uid()` instead.

### One-time database changes

Apply migration:

- `supabase/migrations/20260508160000_clerk_identity_mapping_and_migration.sql`

It adds:

1. `public.user_identities`: mapping `(clerk_user_id, supabase_user_id, legacy_supabase_user_id)`
2. `public.migrate_legacy_user_to_current()`: a self-service RPC that re-keys domain rows from a legacy Supabase auth user id to the currently signed-in one

### What happens to existing Supabase users

Existing Supabase Auth users (email/password) **will not automatically be able to sign in** through Clerk until they exist in Clerk.

Because passwords can’t practically be migrated from Supabase to Clerk in a secure, supported way for most setups, migrated users should expect a **password reset** (or “set your password”) on first login in Clerk.

### Migration strategy (recommended)

#### Step 1 — Export users from Supabase Auth

Use the Admin API with the Supabase **service-role key** in a local script (see `scripts/migrate-supabase-users-to-clerk.mjs`) to list users.

We capture:

- `id` (legacy Supabase auth user id)
- `email`
- `phone` (if present)
- `created_at`

#### Step 2 — Import users into Clerk

For each Supabase user:

- Create a Clerk user with:
  - `email_address: [email]` (and/or phone)
  - `external_id: <legacy_supabase_auth_user_id>` (so we can cross-reference)
  - `skip_password_requirement: true` (so we can force reset flows instead of importing passwords)
  - `skip_legal_checks: true` (migration convenience)
  - `created_at` preserved where supported

#### Step 3 — Require a password reset / recovery in Clerk

After users exist in Clerk, the first login path should encourage:

- “Forgot password” / “Set password”
- account recovery flows handled entirely by Clerk

#### Step 4 — First login: exchange Clerk → Supabase session

After Clerk sign-in succeeds, the app must exchange the Clerk token for a Supabase session.

Immediately after the Supabase session is established, call:

- `select public.migrate_legacy_user_to_current()`

This will migrate any domain rows from the legacy Supabase user id to the current `auth.uid()` (the OIDC-linked Supabase user id).

This keeps RLS policies intact without introducing “mapping-aware RLS”.

### Rollback policy (if we need to revert)

Rollback is “stop the bleeding” oriented:

1. Restore old login UI paths (Supabase email/password) temporarily
2. Pause Clerk rollout
3. Keep the `user_identities` table; it’s harmless and useful for debugging

We do **not** attempt to “un-migrate” IDs. If rollback happens, we route users through the auth system that matches the migrated data.

### Known risks

1. **Email collisions**: `migrate_legacy_user_to_current()` links legacy users by matching email. If you had non-unique email behavior historically, migrate via a stricter mapping flow (Clerk `external_id` claim or admin-driven linking).
2. **Long-lived sessions**: users signed in on old Supabase sessions may continue to operate until cookie expiry; cutover should enforce sign-out or short TTL during migration week.
3. **Flutter deep links**: password reset/account recovery flows require correct deep link handling per platform; treat this as a first-class deliverable.

### Cutover checklist (per app)

#### Trip Media Web (`apps/trip_media_web`)

1. Configure Clerk keys in deployment env
2. Verify `/login` → Clerk sign-in → `/api/auth/exchange` sets Supabase cookies → `/dashboard` loads
3. Verify invite accept flow: `/signup?invite=...` → sign-in → exchange → accept route → dashboard
4. Verify sign-out: sidebar sign out clears Supabase cookies and ends Clerk session

#### Admin App (`apps/admin_app`)

1. Configure Clerk keys in deployment env
2. Verify `/login` flow and admin RBAC gating (must still read `admin_profiles.user_id`)
3. Verify `/register` creates an `admin_profiles` row via exchange `mode=admin_register`
4. Verify sign-out (Supabase + Clerk)

#### Driver App (`apps/driver_app`)

1. Add `CLERK_PUBLISHABLE_KEY` to `assets/default.env`
2. Ensure Clerk sign-in completes and the app establishes the expected Supabase session for RLS reads/writes
3. Verify sign-out clears both Supabase and Clerk state
4. Verify password reset/account recovery inside Clerk flows work on-device

#### Rider App (Flutter, not yet built)

1. Use the same Clerk + Supabase integration pattern as driver
2. Ensure deep links for recovery flows are configured at project start (Android intent filters + iOS URL schemes)

### Monitoring & rollback

- **Monitor**: auth exchange error rate (`/api/auth/exchange`), login completion rate, and the count of successful `migrate_legacy_user_to_current()` RPC calls
- **Rollback**: if a release blocks logins, roll back the app deployment and re-enable the prior auth flow temporarily; do not attempt to “reverse” migrated IDs

