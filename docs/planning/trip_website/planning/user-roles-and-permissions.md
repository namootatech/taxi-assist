# Trip Website — User roles & permissions

## Roles

| Role | Access |
|------|--------|
| **Anonymous visitor** | All public pages, form submission |
| **Content editor (future)** | CMS or markdown deploy—out of MVP if static |

## Permissions

- No Supabase Auth for general visitors in MVP.
- If **preview** or **staging** uses Basic Auth, document in deployment runbook.

- Form endpoints must **rate-limit** and reject spam (honeypot, Turnstile optional).

## Data

- Submitted leads are **not** published; only backend + notified operations staff.
