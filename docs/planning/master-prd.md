# Master PRD (platform)

**Sources:** Admin `app-prd.md`, driver `app-prd.md`, supporting `prd-overview.md` / `idea.md`

## Platform MVP themes

1. **Identity & compliance** — Multi-role profiles (rider, driver, admin), document lifecycle (pending → approved/rejected/expired), training gates for drivers where applicable.
2. **Trip execution** — Request → assign → en route → arrived → in progress → complete/cancel; location capture; dual ratings; payment method visibility (cash/card/wallet/hybrid).
3. **Money movement** — Wallets, ledger, payouts, tips (rules vary by payment channel); **admin** visibility and controlled adjustments (schema TBD per gap analysis).
4. **Operations** — Admin verification queues, trip monitoring, support tickets, audit logs.
5. **Media (phase-aligned)** — Campaign setup, targeting, view accounting; rider in-trip ad UX; reward only on **completed** watch + rating + comment (per business notes). **Partner self-serve** via Trip Media Web App (packages, trials, promo credits, recurring billing); **public** acquisition via Trip website.
6. **Growth surface** — Canonical marketing site for **leads**, **app downloads**, and **cross-links** to rider/driver/partner products.

## Explicitly global (cross-app)

- One auth namespace per human; role-specific profiles (`profile_type` pattern in DB).
- Single trip and wallet truth in Postgres.
- POPIA-oriented storage access (signed URLs; migrate off public buckets per gap doc).

## Out of scope for this document

Per-app screens and detailed acceptance criteria live in:

- `docs/planning/admin/planning/app-prd.md`
- `docs/planning/drivers/planning/app-prd.md`
- `docs/planning/rider_app/planning/app-prd.md`
- `docs/planning/trip_media_web/planning/app-prd.md`
- `docs/planning/trip_website/planning/app-prd.md`

## Confidence

| Theme | Level |
|-------|--------|
| Driver + admin scope | **High** |
| Rider feature depth | **Medium** (PRD in `rider_app/`; DB/RLS for rider trip + wallet + ads still partial per schema gap) |
| Partner media + billing | **Medium** (PRD + ADR 003; provider SKUs + migration ordering TBD) |
| Marketing site | **High** (mostly content + forms; optional `marketing_leads`) |
