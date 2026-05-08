# Driver app — copy specification

**Audience:** `docs/system/market/driver_app-audience.md`  
**Voice:** `docs/system/market/voice-guidelines.md`

Canonical strings are **starting points** — align with `docs/planning/drivers/planning/app-prd.md` and implemented trip state machine.

---

## Onboarding & documents

| Surface | Direction | Example |
|---------|-----------|---------|
| Welcome | Earning + compliance without fear | “Let’s get you verified so you can drive with Taxi Assist.” |
| Upload document | Specific | “Upload a clear photo of your PDP.” |
| Pending review | Honest wait state | “We’re reviewing your documents — we’ll notify you.” |

Avoid: “Workflow,” “module,” “backend verification queue.”

---

## Primary CTAs

| Intent | Preferred label |
|--------|-------------------|
| Finish profile/docs | Finish setup |
| Submit for review | Send for review |
| Ready to receive trips | Go online |
| Stop receiving trips | Go offline |
| Add vehicle | Add vehicle |
| Link to vehicle | Link this vehicle |

---

## Trip flow

| State | Direction |
|-------|-------------|
| Incoming request | Short urgency without panic — accept window clear |
| Navigate pickup | Action-forward: “Head to pickup” |
| Rider in vehicle | “Start trip” when PRD allows |
| Complete | “End trip” — follow with earnings visibility per spec |

---

## Compliance & expiry

| Surface | Example |
|---------|---------|
| Expiring soon | “Your [document] expires on [date]. Renew to stay online.” |
| Expired | “Renew your [document] to drive again.” |

---

## Success states

| Moment | Example |
|--------|---------|
| Document uploaded | “Received — we’ll review soon.” |
| Approved | “You’re approved — go online when you’re ready.” |
| Trip completed | “Trip complete — see your earnings for today.” |

---

## Errors

| Situation | Example |
|-----------|---------|
| Upload failed | “Upload didn’t finish. Check your connection and try again.” |
| Cannot go online | State reason in plain language (e.g. missing document) + link to fix |
| Generic | “Something went wrong. Try again — contact support if it keeps happening.” |

---

## Empty states

| Surface | Example |
|---------|---------|
| No trips today | “No trips yet today — stay online to get requests.” |
| No earnings period | “No trips in this period — your summary will show here.” |

---

## Microcopy rules

- **Approved vs online** — distinguish clearly  
- **Owner vs driver** — use the right role in labels  
- Never promise instant approval unless product config guarantees it  

---

## Review checklist

- [ ] Document states match admin workflow wording users will hear from support  
- [ ] Trip verbs match state machine (no duplicate labels for different states)  
- [ ] Pilot scope not overstated  
