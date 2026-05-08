# 03 — Core features (rider app)

**Goal:** Booking funnel, trip tracking UI, payments selection, post-trip rating + tip rules, menu sections (trips history, payments, emergency contacts, invite, support).

## Deliverables

1. **Booking:** Pickup (default location + edit), destination, estimate display, confirm/decline, payment method including wallet + fallback.
2. **Active trip:** Realtime trip + driver info + call/message actions (message transport stub OK).
3. **Post-trip:** Fare summary, mandatory rating+comment, conditional tip UI with cap text.
4. **Shell pages:** Trips list, payments (cards list), emergency contacts (CRUD max 5), invite flow stub, support ticket create/list.
5. Integrate with existing `trips` / RPCs from rider perspective (read + request actions only—**no** rewriting driver RPCs here).

## Acceptance

- End-to-end **happy path** against dev Supabase with seeded rider+driver (may require migration/RLS updates tracked in schema gap doc).

**Depends on:** driver matching and trip creation RPC/API design (may be partially absent — document blockers).
