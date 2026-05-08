# User roles & permissions — Rider app

**Sources:** `app-prd.md`, `docs/planning/admin/planning/data-model-and-app-entities.md` (Rider entity), platform `master-prd.md`.

## Roles

| Role | Description |
|------|-------------|
| **Rider (authenticated)** | Default in-app role; owns profile, trips, wallet view, payment methods, emergency contacts, referrals. |
| **Guest** | If product allows browse without login — **not** in `idea.md`; default **no guest booking** unless PRD extended. |

## Permissions (product-level)

- Rider may **read/write own** profile, documents, payment instruments, emergency contacts, referral codes.
- Rider may **create** trip requests and **read** own trips; **read** assigned driver **non-sensitive** display fields during active trip (per trip contract).
- Rider may **not** approve own verification documents (admin-only).
- Rider may **insert/read own** support tickets (align with `support_tickets` RLS pattern used for drivers).

## Auth identifiers (from source)

- **Username:** cell phone (verified via OTP).
- **Email:** activation and account recovery (exact Supabase mapping TBD in technical doc).

## Confidence

**High** for phone-as-username narrative; **Medium** for JWT claims shape shared with driver profiles.
