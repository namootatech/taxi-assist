# Admin app — copy specification

**Audience:** `docs/system/market/admin-audience.md`  
**Voice:** `docs/system/market/voice-guidelines.md`

Internal console: prefer **precision and next action** over marketing warmth; still **no raw technical failures** as the only message.

---

## Global patterns

| Pattern | Direction |
|---------|-----------|
| Page titles | Entity + task: “Driver verification,” “Open tickets” |
| Destructive actions | Name the outcome: “Suspend driver,” “Reject document” |
| Confirmations | Repeat the entity: “Suspend this driver? They won’t receive trips.” |

---

## Primary actions (examples)

| Intent | Preferred label |
|--------|-------------------|
| Save work | Save |
| Send decision | Approve / Reject |
| Queue processing | Start review (context-specific) |
| Export | Export CSV |
| Refresh data | Refresh |

Use **Continue** only in multi-step wizards where it is standard.

---

## Verification queue

| Surface | Direction |
|---------|-----------|
| Approve | Clear success: “Approved — driver can go online if all requirements met.” |
| Reject | Mandatory notes (per PRD) — template hint: “Tell the driver what to fix.” |
| Bulk | “Applied to N items — audit log updated.” |

---

## Trips & interventions

| Surface | Direction |
|---------|-----------|
| Live map | Status chips plain language: En route, Arrived, In progress |
| Intervention | State action + risk: “Cancel trip — use only for …” |

---

## Finance & wallets

| Surface | Direction |
|---------|-----------|
| Adjustment | “This changes the wallet balance — reason required.” |
| Irreversible | Explicit confirm copy per PRD |

---

## Ads (Taxi Assist Media)

| Surface | Direction |
|---------|-----------|
| Campaign save | “Campaign saved — dates and budget apply from …” |
| Publish | Use product-accurate terminology from PRD |

---

## Support & tickets

| Surface | Direction |
|---------|-----------|
| Reply | “Send reply” / “Add internal note” — distinguish public vs internal |

---

## Errors

| Situation | Example |
|-----------|---------|
| Save failed | “Couldn’t save. Check your connection and try again.” |
| Permission | “You don’t have access — ask a Super Admin.” |
| Unknown | “Something went wrong. Retry — if it repeats, note the time and contact engineering.” |

Optional: support reference ID **secondary**, not headline — “Reference: …” for logs.

---

## Empty states

| Surface | Example |
|---------|---------|
| Queue empty | “Queue clear — new items appear here automatically.” |
| No search results | “No matches — try different filters.” |

---

## Microcopy rules

- **Role-appropriate** density — Compliance sees legal-adjacent clarity; Support sees customer context  
- Tables: **consistent** entity names (Rider, Driver, Vehicle, Trip)  
- Audit: remind **once** when an action is logged  

---

## Implementation alignment (2026-05-08)

- **`lib/user-facing-error.ts`** — canonical mapping for load failures, auth, and client mutation errors; use for new surfaces instead of `error.message`.
- **Login banner** — shows decoded message from redirects (already normalized server-side).

---

## Review checklist

- [ ] RBAC-sensitive actions have explicit labels  
- [ ] Reject/suspend paths include human-readable consequences  
- [ ] No rider/driver-facing jargon meant only for engineers  
