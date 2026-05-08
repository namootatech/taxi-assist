# 02 — Data & authentication layer (Trip Media Web)

**Goal:** Migrations + RLS for `media_partners`, `partner_members`, and catalog `ad_packages` seeds; wire signup to create partner + owner.

## Deliverables

1. Supabase migration(s): tables per `data-model-and-app-entities.md` (subscriptions can be stub columns if webhook not built yet).
2. RLS policies: partner users read/write own org rows only.
3. Edge-safe RPC or insert pattern: `create_partner_org` (security definer) on first signup.
4. App: complete signup flow creating org + `owner` membership.

## Acceptance

- New user completes signup and sees org name on dashboard header.
- Second user cannot read first org’s rows (smoke test SQL or integration).

**Do not implement:** payment checkout or creative upload yet.
