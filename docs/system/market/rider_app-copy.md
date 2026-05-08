# Rider app — copy specification

**Audience:** `docs/system/market/rider_app-audience.md`  
**Voice:** `docs/system/market/voice-guidelines.md`

Canonical strings below are **starting points** — align every release with `docs/planning/rider_app/planning/app-prd.md`.

---

## Onboarding & registration

| Surface | Direction | Example |
|---------|-----------|---------|
| Welcome | Outcome + warmth | “Book rides when you’re ready — we’ll guide you through setup.” |
| Phone verification | Clear action | “Enter the code we sent to your phone.” |
| Profile completion | Benefit-led | “Add your details so drivers can find you and support can help if needed.” |

Avoid: “Submit registration payload,” “Verify OTP endpoint.”

---

## Primary CTAs

| Intent | Preferred label |
|--------|-------------------|
| Start using app after signup | Get started |
| Request trip | Book a ride |
| Confirm fare screen | Confirm booking |
| Add payment | Add card |
| Wallet top-up path | Add money |

Avoid default-only: Continue, Submit.

---

## Booking & trip

| Surface | Direction |
|---------|-----------|
| Allocating driver | “Finding a driver nearby…” |
| Driver assigned | “Your driver is on the way” + ETA context |
| Payment choice unclear | Explain hybrid wallet + card/cash in one short line |

---

## Taxi Assist Media (in-trip ads)

| Surface | Direction |
|---------|-----------|
| Intro | Credits apply to **future** trips when rules are met — say so plainly |
| Incomplete ad | Neutral, not blaming: “This ad didn’t count — you can try another on your next trip.” |

---

## Success states

| Moment | Example |
|--------|---------|
| Booking confirmed | “You’re booked” |
| Trip ended | “Trip complete — here’s what you paid.” |
| Profile saved | “Saved” / “You’re all set.” |

---

## Errors

| Situation | Example |
|-----------|---------|
| Network | “Can’t connect right now. Check your signal and try again.” |
| Payment failed | “Payment didn’t go through. Try another card or pay cash.” |
| Generic | “Something went wrong. Try again — contact support if it keeps happening.” |

Never lead with HTTP codes or API names.

---

## Empty states

| Surface | Example |
|---------|---------|
| No trips yet | “No trips yet — book your first ride from home.” |
| No wallet activity | “Your wallet is empty — credits from ads show up here after you qualify.” |

---

## Microcopy rules

- **Benefit first** in feature discovery (wallet, ads, emergency contacts)  
- **One primary action** per screen where possible  
- Mandatory rating: **short** explanation (“Quick rating — helps keep rides fair”)  

---

## Review checklist

- [ ] No internal architecture terms  
- [ ] CTA matches user goal  
- [ ] Error has next step  
- [ ] Claims match PRD (payments, ads, safety)  
