# User flows & UX logic — Admin app

**Status:** Stub — derive detailed flows from `app-prd.md` §3 and `data-model-and-app-entities.md` workflows.

## Core journeys (headlines)

1. **Login** → role-based dashboard
2. **Verification queue** → open entity → side-by-side documents → approve/reject with mandatory notes
3. **Entity search** → profile → history (trips, wallet, documents)
4. **Trip monitor** → map/list → intervention / cancel with reason (when RPCs exist)
5. **Finance** → wallet ledger view → adjustment RPC (post-migration)
6. **Ads** → campaign CRUD → performance metrics
7. **Support** → ticket inbox → respond / escalate

## UX principles

- Dense data tables with server-side pagination; optimistic UI only where safe.
- Every destructive or financial action requires **reason** + audit (once `audit_logs` exists).

**Sources:** `app-prd.md`, `technical-implementation.md` (execution plan).
