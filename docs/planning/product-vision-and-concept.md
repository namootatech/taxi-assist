# Product vision & concept

**Sources:** `docs/planning/supporting-documents/idea.md`, `supporting-documents/prd-overview.md`, `planning/admin/planning/app-prd.md`, `planning/drivers/planning/app-prd.md`

## Problem

South Africa needs a **compliance-first, multi-sided ride-hailing platform** (Taxi Assist / Trip) that connects riders and verified drivers, with **document-heavy onboarding** (NATIS, PDP, double discs, insurance), **wallet + card + cash** payments, **in-trip advertising** (rider-funded credits), and **internal operations** tooling for verification, fraud control, and media campaigns.

## Target users

- **Riders** — book trips, pay, watch ads for credits, manage profile and safety (emergency contacts). **Planning:** `docs/planning/rider_app/`.
- **Drivers & vehicle owners** — register vehicles and drivers, stay compliant, go online, complete trips, earn.
- **Internal staff** — compliance, operations, finance, ad managers, support, super-admins (admin web app).

## Vision

A **pilot-first** rollout in defined corridors (Eastern Cape / Gauteng), expanding nationally with **auditability**, **POPIA-aware** data handling, and **Supabase-centric** backend (Postgres + RLS + Realtime + Storage).

## Success (MVP)

- High document verification throughput with **full audit trails**.
- Stable **driver supply** (online utilization, acceptance, compliance).
- **Admin console** can manage riders, drivers, vehicles, trips, wallets, ads, and support at pilot scale.
- **Driver Flutter app** aligned with enforced trip state machine and document gates.

## Confidence

| Area | Level |
|------|--------|
| Product shape from existing PRDs | **High** |
| Corridor prioritization | **Medium** (docs mention multiple options) |
