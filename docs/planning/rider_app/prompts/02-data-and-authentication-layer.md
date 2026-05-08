# 02 — Data & authentication layer (rider app)

**Goal:** Rider registration, login, OTP verification, email activation flow aligned with `user-roles-and-permissions.md`.

## Deliverables

1. Auth screens: register (fields per `app-prd.md` §3.1), login, forgot password stub.
2. `profiles` integration: create/update **RIDER** profile row; handle `PENDING` / `APPROVED` gating for booking if required by schema.
3. Document upload entry for “get verified” (reuse `documents` entity pattern; entity type must exist or add migration in a **separate** change — this prompt only wires UI + client calls if already allowed).
4. OTP Edge Function contract documented (even if mocked in dev).

## Acceptance

- New rider can sign up and land on home with profile row created (or clear error if RLS blocks — then file gap in `schema-gap-analysis.md`).

**Depends on:** migrations allowing rider profile writes; coordinate with platform schema gaps.
