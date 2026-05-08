# Trip Website — Data model & entities

Source: codebase scan 2026-05-08.

MVP now persists public lead capture in Supabase through `supabase/migrations/20260508073500_trip_website_marketing_leads.sql`. CRM sync remains a later integration.

### `marketing_leads`

- `id` (uuid, PK)
- `source` (`contact_form`, `rider_interest`, `driver_interest`, `partner_interest`, `press_interest`, `support_interest`)
- `name`, `email`, `phone` (nullable), `message` (nullable), `metadata` (jsonb, UTM)
- `created_at`
- RLS: admin-only select via `public.is_admin()`.
- Public inserts: no anon/authenticated insert policy; `apps/trip_website/app/contact/actions.ts` writes server-side with `SUPABASE_SERVICE_ROLE_KEY` when configured.

### UTM / attribution

- Capture `utm_source`, `utm_medium`, `utm_campaign` in form `metadata`.

**No PII** in client-side analytics tags without consent banner per POPIA stance.
