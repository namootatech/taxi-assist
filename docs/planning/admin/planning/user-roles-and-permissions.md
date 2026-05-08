# User roles & permissions — Admin app

The admin console stores a single `role` string on `public.admin_profiles` per admin user. The application layer expands the role into a fine-grained capability set defined in `apps/admin_app/lib/permissions.ts` and enforced by:

1. The reverse proxy (`apps/admin_app/proxy.ts`) — gates routes by capability before the page renders.
2. Server actions and route handlers — re-check capability before mutating data.
3. RPCs in Postgres — verify `admin_profiles.role` is in an allowlist for elevated actions.

## Roles

Each role is a single value stored as text in `admin_profiles.role`.

| Role            | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| `superadmin`    | Full control. Manages other admins.                                   |
| `compliance`    | Driver, vehicle, and rider verification. Can also moderate creatives. |
| `operations`    | Live trips, interventions, and campaign oversight.                    |
| `finance`       | Payments, wallets, advertiser credits, rider reward freeze/reverse.   |
| `ad_manager`    | Trip Media moderation and campaign oversight.                         |
| `support`       | Read access plus support tickets. No money or moderation actions.     |
| `fraud_analyst` | Investigates rider activity, freezes rewards, escalates Critical.     |

## Capability matrix

Capabilities are the unit of authorisation. Capabilities are grouped here for readability, not stored grouped.

### Core platform capabilities

| Capability        | superadmin | compliance | operations | finance | ad\_manager | support | fraud\_analyst |
| ----------------- | :--------: | :--------: | :--------: | :-----: | :---------: | :-----: | :------------: |
| `view_drivers`    |     yes    |     yes    |     yes    |    no   |      no     |    no   |       no       |
| `view_riders`     |     yes    |     yes    |     yes    |    no   |      no     |    no   |       no       |
| `view_vehicles`   |     yes    |     yes    |     yes    |    no   |      no     |    no   |       no       |
| `view_verification` |   yes    |     yes    |     no     |    no   |      no     |    no   |       no       |
| `review_documents`  |   yes    |     yes    |     no     |    no   |      no     |    no   |       no       |
| `view_trips`      |     yes    |     no     |     yes    |   yes   |      no     |    no   |       no       |
| `intervene_trips` |     yes    |     no     |     yes    |    no   |      no     |    no   |       no       |
| `view_payments`   |     yes    |     no     |     no     |   yes   |      no     |    no   |       no       |
| `view_wallets`    |     yes    |     no     |     no     |   yes   |      no     |    no   |       no       |
| `adjust_wallets`  |     yes    |     no     |     no     |   yes   |      no     |    no   |       no       |
| `view_ratings`    |     yes    |     no     |     no     |    no   |      no     |    no   |       no       |
| `view_support`    |     yes    |     no     |     no     |    no   |      no     |   yes   |       no       |
| `manage_support`  |     yes    |     no     |     no     |    no   |      no     |   yes   |       no       |
| `manage_admins`   |     yes    |     no     |     no     |    no   |      no     |    no   |       no       |
| `view_analytics`  |     yes    |     no     |     no     |    no   |      no     |    no   |       no       |
| `manage_settings` |     yes    |     no     |     no     |    no   |      no     |    no   |       no       |
| `view_audit`      |     yes    |     yes    |     yes    |   yes   |     yes     |   yes   |       yes      |

### Trip Media capabilities

| Capability                       | superadmin | compliance | operations | finance | ad\_manager | support | fraud\_analyst |
| -------------------------------- | :--------: | :--------: | :--------: | :-----: | :---------: | :-----: | :------------: |
| `view_trip_media`                |     yes    |     yes    |     yes    |   yes   |     yes     |   yes   |       yes      |
| `view_trip_media_overview`       |     yes    |     yes    |     yes    |   yes   |     yes     |   yes   |       yes      |
| `view_ads`                       |     yes    |     no     |     no     |    no   |     yes     |    no   |       no       |
| `manage_ads`                     |     yes    |     no     |     no     |    no   |     yes     |    no   |       no       |
| `moderate_creatives`             |     yes    |     yes    |     no     |    no   |     yes     |    no   |       no       |
| `oversee_campaigns`              |     yes    |     no     |     yes    |    no   |     yes     |    no   |       no       |
| `view_advertisers`               |     yes    |     no     |     no     |   yes   |     yes     |   yes   |       yes      |
| `suspend_advertiser`             |     yes    |     no     |     no     |    no   |      no     |    no   |       no       |
| `adjust_advertiser_credits`      |     yes    |     no     |     no     |   yes   |      no     |    no   |       no       |
| `view_rider_rewards`             |     yes    |     no     |     yes    |   yes   |      no     |   yes   |       yes      |
| `freeze_rider_reward`            |     yes    |     no     |     no     |   yes   |      no     |    no   |       yes      |
| `reverse_rider_reward`           |     yes    |     no     |     no     |   yes   |      no     |    no   |       no       |
| `view_fraud`                     |     yes    |     no     |     no     |    no   |      no     |    no   |       yes      |
| `triage_fraud`                   |     yes    |     no     |     no     |    no   |      no     |    no   |       yes      |
| `escalate_fraud`                 |     yes    |     no     |     no     |    no   |      no     |    no   |       no       |
| `view_trip_media_analytics`      |     yes    |     no     |     no     |    no   |     yes     |    no   |       no       |
| `view_reports`                   |     yes    |     no     |     no     |   yes   |     yes     |    no   |       yes      |
| `run_reports`                    |     yes    |     no     |     no     |   yes   |     yes     |    no   |       no       |
| `manage_trip_media_settings`     |     yes    |     no     |     no     |    no   |     yes     |    no   |       no       |

The source of truth lives in `apps/admin_app/lib/permissions.ts`. The matrix above is generated from that file and must be kept in sync.

## Server-side enforcement

| Action                                | RPC / handler                                         | Allowed roles                              |
| ------------------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| Approve / reject / change creative    | `admin_set_creative_status`                           | `superadmin`, `compliance`, `ad_manager`   |
| Pause / resume / force-stop campaign  | `admin_set_campaign_status`                           | `superadmin`, `ad_manager`, `operations`*  |
| Adjust delivery cap / reward          | `admin_adjust_campaign_delivery`                      | `superadmin`, `ad_manager`                 |
| Freeze rider reward                   | `admin_freeze_reward`                                 | `superadmin`, `finance`, `fraud_analyst`   |
| Reverse rider reward                  | `admin_reverse_reward`                                | `superadmin`, `finance`                    |
| Log fraud signal                      | `admin_log_fraud_signal`                              | `superadmin`, `fraud_analyst`              |
| Triage fraud signal status            | `admin_set_fraud_signal_status`                       | `superadmin`, `fraud_analyst`              |
| Set fraud risk level                  | `admin_set_fraud_signal_level`                        | `superadmin`, `fraud_analyst`              |
| Suspend / restore advertiser          | `admin_set_partner_status`                            | `superadmin`                               |
| Adjust advertiser credits             | `admin_adjust_partner_credits`                        | `superadmin`, `finance`                    |
| Update Trip Media settings            | `admin_set_trip_media_setting`                        | `superadmin`, `ad_manager`                 |
| Record report run                     | `admin_record_report_run`                             | Any admin (via the audited route handler)  |

\* Operations can pause/resume but cannot force-stop without a Super Admin or Ad Moderator. The capability gate (`oversee_campaigns`) enables read and pause/resume; force-stop is checked separately in the handler.

## Adding a role or capability

1. Add the new capability to the union in `apps/admin_app/lib/permissions.ts`.
2. Update the relevant `*Caps` arrays for each role.
3. Update `allowedNavForRole` if the capability gates navigation.
4. Update `apps/admin_app/proxy.ts` if the capability gates a route prefix.
5. If a new RPC requires the capability, add the role allowlist inside the SQL function (e.g. `if v_role not in ('superadmin','...') then ...`).
6. Update this document.

## Source of truth

| Concern              | File / location                                                |
| -------------------- | -------------------------------------------------------------- |
| Capability list      | `apps/admin_app/lib/permissions.ts`                            |
| Role to capability   | `apps/admin_app/lib/permissions.ts` (`*Caps` arrays)           |
| Route gating         | `apps/admin_app/proxy.ts`                                      |
| Sidebar gating       | `allowedNavForRole` in `apps/admin_app/lib/permissions.ts`     |
| RPC role allowlists  | `supabase/migrations/20260508140000_trip_media_admin_oversight.sql` |
| Role explainer copy  | `apps/admin_app/lib/trip-media/role-content.ts`                |
