# Data model & app entities — Rider app

**Sources:** `docs/planning/admin/planning/data-model-and-app-entities.md` (Rider, Trip, Wallet, Ad), `app-prd.md`, `docs/planning/schema-gap-analysis.md`.

## Entities (logical — map to Postgres when building)

### Rider profile

Align with platform notion of **Rider**:

- Identity: name, DOB, age, ID/passport, sex, address (standalone vs apartment + unit + complex name).
- **Username:** phone (verified); email; auth user link (`auth.users`).
- Verification status, KYC flags (admin-controlled).
- Wallet balance display (source of truth: ledger when implemented).
- Referral / promo code fields as needed.

### Emergency contacts

- Up to **5** records: relationship, name, phone, notification preferences (TBD).

### Payment methods

- Multiple **cards** (token references — Stripe/PayGate etc. TBD; store only safe references in DB per PCI rules).

### Trips (read-heavy for rider)

- Rider sees: pickup/dropoff, status, fare estimate/final, payment method, driver assignment, timestamps.
- Shared table `trips` with driver; RLS: rider reads **own** trips only.

### Trip locations

- Rider may contribute location updates if product allows; driver app already writes `trip_locations` — rider write policy **must be designed** (gap until migration).

### Ads / media (rider)

- Session or per-trip linkage: ad asset, progress, **completed** flag only when watch + rating + comment satisfied.
- Maps to planned `ad_views` / wallet credit (see platform schema gap).

### Support

- `support_tickets` (or equivalent) scoped to rider.

## CRUD rules (MVP intent)

| Entity | Rider create | Rider read | Rider update | Rider delete |
|--------|--------------|------------|--------------|--------------|
| Profile | On register | Own | Own non-admin fields | Account deletion policy TBD |
| Emergency contacts | Yes | Own | Own | Own |
| Payment methods | Add | Own | Update default | Remove |
| Trips | Request (insert intent) | Own | Cancel per rules | N/A |
| Ad progress | Update ratings/comments | Own session | N/A | N/A |

## Gaps vs current schema

- Confirm `profiles.profile_type = RIDER` and rider-specific RLS **select/insert/update** mirror driver patterns.
- **Rider** `trip_locations` insert: not specified in existing driver-only policies — **planning gap** for migration.
- Wallets, ad_views, cards vault: see **`docs/planning/schema-gap-analysis.md`**.

**Confidence:** **Medium** (entity list from admin spec + idea; physical schema must be verified against latest migrations).
