# Admin app — system docs

This folder is for **runtime** documentation: deployment, runbooks, smoke tests.

## Where things live

| Concern                | Location                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| App code               | `apps/admin_app/`                                                      |
| Planning docs          | `docs/planning/admin/`                                                 |
| Capability matrix      | `docs/planning/admin/planning/user-roles-and-permissions.md`           |
| Trip Media schema      | `docs/planning/admin/planning/data-model-and-app-entities.md` §11      |
| User-facing copy       | `docs/system/market/admin-copy.md`                                     |

## Trip Media admin console (May 2026)

- **Sidebar group**: "Trip Media".
- **Routes**: `/creatives`, `/ads`, `/trip-media/{overview,advertisers,rider-rewards,fraud,analytics,reports,settings}`.
- **Schema**: `supabase/migrations/20260508140000_trip_media_admin_oversight.sql` extends `ad_creatives` and `ad_campaigns`, adds `ad_fraud_signals`, `ad_reward_holds`, `creative_categories`, `trip_media_settings`, `admin_report_runs`, plus views and RPCs.
- **CSV reports**: `/api/trip-media/reports/[kind]` audited via `admin_record_report_run`.
- **Role added**: `fraud_analyst` (see capability matrix).

## Smoke tests (manual)

1. Sign in as a Super Admin → verify the "Trip Media" sidebar group renders.
2. `/trip-media/overview` loads with the eight KPI cards and the two panels.
3. `/creatives` queue lets you Approve a pending creative; the row moves to Approved.
4. `/ads` drawer opens; Pause prompts for a reason and updates status.
5. `/trip-media/rider-rewards` Freeze action opens the dialog and writes an `ad_reward_holds` row.
6. `/trip-media/fraud` console shows the candidate table and lets you set risk level.
7. `/trip-media/reports` downloads a CSV; row appears in the recent runs table.
8. `/trip-media/settings` saves a change to reward caps; refresh shows the new value.

## Planned additions

- `deployment.md` — Vercel + Supabase project linkage
- `api.md` — Server Actions / RPC surface
- `troubleshooting.md` — common auth/RLS errors
