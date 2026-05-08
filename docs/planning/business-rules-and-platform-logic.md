# Business rules & platform logic

**Sources:** `planning/admin/planning/data-model-and-app-entities.md`, `planning/drivers/planning/data-model-and-app-entities.md`, `supporting-documents/idea.md`

## Global invariants (non-exhaustive)

- **No supply without compliance:** Driver cannot go **online** without approved profile, linked **approved** vehicle, and non-expired critical documents (enforced in app + DB rules per specs).
- **One active driving context (MVP):** One linked vehicle per active driver session; no overlapping in-progress trips for same driver.
- **Document truth:** Each document has status, expiry, reviewer, timestamps; re-uploads versioned or auditable per admin spec.
- **Trip payments:** Cash vs card vs app wallet vs hybrid affects **driver collection** instructions and **tip** rules (see rider notes: tips capped by wallet when applicable).
- **Ads / rewards:** Partial watch or abandoned ad session **does not** count as completed; requires rating + comment to advance (rider narrative—must match eventual schema).
- **Admin power:** Suspensions, approvals, forced offline, financial adjustments require **reason** + **audit** once `audit_logs` exists (see `schema-gap-analysis.md`).

## Cross-cutting workflows

- **Verification pipeline:** Upload → pending → admin approve/reject → downstream status unlocks.
- **Cancellation:** Driver cancel with reason; waiting-time rules (e.g. 5-minute arrival window) per driver business spec.
- **Support:** Tickets visible to owning user; admin handles from console.

## Conflict resolution

If code and docs disagree during recovery: **implemented migrations + RLS win** for schema; **PRDs win** for intended product behavior—file an ADR when changing direction.

## Confidence

| Rule | Level |
|------|--------|
| Driver-side trip + doc rules | **High** (detailed in driver business spec) |
| Wallet/ad ledger mechanics | **Low** until tables land |
