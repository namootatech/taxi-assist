# User roles & permissions — Admin app

**Status:** Stub created by APD-Resume — expand from `app-prd.md` §2 (Scope & User Roles).

## Roles (from PRD)

- **SuperAdmin** — full access + admin user management
- **Compliance** — documents & profile verification
- **Operations** — live trips, interventions
- **Finance** — wallets, payouts, adjustments
- **AdManager** — Taxi Assist Media campaigns
- **Support** — tickets and messaging

## Next steps

- Encode capability matrix in `technical-implementation.md` middleware + `lib/permissions.ts` plan (already outlined in execution plan).
- Align with eventual `admin_profiles.role` enum in Postgres.

**Source:** `app-prd.md` (migrated from `prd&techstack.md`).
