# 03 — Lead capture & integrations (Trip Website)

**Goal:** Working contact/waitlist forms with server-side handling.

## Deliverables

1. Contact form with validation (Zod); Server Action or POST handler.
2. Optional: Supabase insert into `marketing_leads` + transactional email to ops.
3. Honeypot field; basic rate limiting (IP bucket Edge or middleware).

## Acceptance

- Successful submit shows confirmation; data visible in DB or email inbox (test).

**Depends on:** `data-model-and-app-entities.md` if using Supabase.
