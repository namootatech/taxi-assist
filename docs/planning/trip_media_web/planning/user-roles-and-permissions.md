# Trip Media Web App — User roles & permissions

**Sources:** `app-prd.md`, ADR 003

## Scope

All users authenticate via **Supabase Auth**. Authorization is **partner-scoped**: a user belongs to exactly one `media_partner` organization in MVP (multi-org later optional).

## Roles (partner org)

| Role | Description |
|------|-------------|
| **owner** | Full billing, users, campaigns, creatives; cannot be removed by non-owner. |
| **admin** | Same as owner except transfer ownership / close org (policy TBD). |
| **operator** | Campaigns and creatives only; **no** billing, **no** inviting users. |
| **viewer** | Read-only dashboards and reports. |

## Platform roles (not in this app)

- **Internal admin** (`admin_app`): moderation, takedown, fraud, global policy—not granted inside partner UI.

## Permission matrix (MVP)

| Action | owner | admin | operator | viewer |
|--------|-------|-------|----------|--------|
| View org profile | ✓ | ✓ | ✓ | ✓ |
| Edit org profile | ✓ | ✓ | — | — |
| Billing / subscription | ✓ | ✓ | — | — |
| Invite / remove users | ✓ | ✓ | — | — |
| Upload creatives | ✓ | ✓ | ✓ | — |
| Create / edit campaigns | ✓ | ✓ | ✓ | — |
| Pause / resume campaigns | ✓ | ✓ | ✓ | — |
| View usage & analytics | ✓ | ✓ | ✓ | ✓ |

## RLS principle

Partner users may only `select/insert/update` rows where `partner_id` matches their membership. Service role + Edge Functions handle webhooks and provider sync.
