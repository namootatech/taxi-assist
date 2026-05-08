# Trip Website — Data model & entities

MVP may use **no database** (form forwarded to email/CRM). If leads persist in Supabase:

### `marketing_leads` (optional)

- `id` (uuid, PK)
- `source` (`contact_form`, `driver_waitlist`, `rider_waitlist`, …)
- `name`, `email`, `phone` (nullable), `message` (nullable), `metadata` (jsonb, UTM)
- `created_at`
- RLS: **no public read**; insert via Edge Function with service key or anon insert with hardened policy (prefer Edge Function).

### UTM / attribution

- Capture `utm_source`, `utm_medium`, `utm_campaign` in form `metadata`.

**No PII** in client-side analytics tags without consent banner per POPIA stance.
