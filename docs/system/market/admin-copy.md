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

## Trip Media console (May 2026)

The Trip Media surfaces speak in everyday language. Outcomes first; jargon last. Every reason field is also seen by the advertiser or the rider, so name the consequence.

### Voice

- Page subtitles describe what the page is *for*, not what it *contains*. Good: "A live read on what advertisers are running, what is waiting on a moderator, and what the team has touched today." Less good: "Trip Media KPIs."
- Buttons describe outcomes. "Approve creative", "Force-stop campaign", "Freeze reward" — not "Submit", "OK".
- Action confirmations carry consequences: "Suspending pulls this creative from delivery immediately."

### Surface examples

| Surface | Direction |
|---------|-----------|
| Creative review | "Approve" / "Reject" / "Request changes" / "Suspend" / "Flag for review". Reject and Request changes show "The advertiser sees this." next to the note field. |
| Force-stop campaign | "Force-stop now" with the consequence line: "Use only when the campaign needs to stop now. Advertiser is notified." |
| Adjust delivery | "Save delivery change". Reason is required and audited. |
| Reward freeze | "Freeze reward" — note: "The hold pauses the reward while the case is open. The rider's wallet is not changed yet." |
| Reward reverse | "Reverse reward" — note: "Reversing debits the rider's wallet. Use only after the freeze has been investigated." |
| Fraud triage | "Start investigation", "Resolve", "Dismiss", "Escalate to Super Admin", "Set risk level", "Freeze related reward". |
| Reports | "Download CSV". Recent runs show "completed", "failed", or "running" in plain words. |
| Settings | Save buttons follow the section: "Save reward caps", "Save reasons", "Save thresholds", "Save watch rules". |
| Empty states | "No actions yet — Approvals, rejections, freezes, and reversals show up here as soon as a moderator takes one." |

### Role explainer cards

Source of truth: `apps/admin_app/lib/trip-media/role-content.ts`. Each role card lists "Can do" and "Cannot do" lists in plain English. Avoid abstract verbs like "manage" — name the actual capability ("Reverse rider rewards", "Force-stop campaigns").

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
