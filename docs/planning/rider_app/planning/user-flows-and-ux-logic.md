# User flows & UX logic — Rider app

**Sources:** `app-prd.md`, `supporting-documents/idea.md`.

## Flow A — Registration → first home

```text
Launch → Register | Login
Register → collect demographics + address + phone + email + password
  → OTP verify phone → email activation (order can follow Supabase defaults)
  → Home (trip request surface)
Login → Home
```

## Flow B — Book trip

```text
Home → set pickup (default GPS, editable) + destination (text/map)
  → show estimate → Confirm | Decline
Decline → Home
Confirm → choose payment (wallet | card | cash; wallet + fallback cash/card)
  → request allocation → Waiting / matched
```

## Flow C — Active trip (rider)

```text
Matched → map: driver ETA, avatar, name, car; call | message; optional location update
Driver arrived → UI state “arrived”
Trip started → optional: Taxi Assist Media prompt → ad loop (watch → rate+comment → next | skip after valid completion)
Driver ends trip → show fare → mandatory trip rating + comment
  → if card/wallet: optional tip (capped by wallet rules)
  → show ad earnings summary for session → Home
```

## Flow D — Menu destinations

- Wallet / Media / Profile / Trips / Payments / Emergency / Invite / Support / Logout — each opens dedicated surface; **no dead ends** without back path to Home.

## Edge cases (from source)

| Situation | Expected behaviour |
|-----------|-------------------|
| Wallet < fare and wallet path chosen | Force selection of cash or card top-up **before** confirm (or block confirm with clear message — product choice). |
| Abandon ad mid-play | Do **not** credit ad; do not count as watched. |
| Trip ends during ad | Same: no credit for in-progress ad. |
| Tip with wallet payment | Tip ≤ wallet balance cap. |

## Confidence

**High** for linear flows from source; **Medium** for race conditions (allocation timeout, driver cancel) — align with driver PRD + `trips` state machine.
