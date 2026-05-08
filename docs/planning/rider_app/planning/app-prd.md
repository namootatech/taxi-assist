# App PRD — Rider (Taxi Assist)

**Product:** Taxi Assist — Rider mobile application  
**Version:** 1.0 (MVP planning)  
**Primary source:** `docs/planning/supporting-documents/idea.md` (rider section, lines 7–21)  
**Market:** South Africa (align with driver pilot corridors)  
**Stack assumption:** Flutter + Supabase (same as `driver_app`) — see `technical-implementation.md` for confidence.

---

## 1. Problem & outcome

Riders need a **safe, simple** way to book trips, pay with **cash / card / app wallet** (including hybrid when wallet balance is insufficient), track the assigned driver, optionally **earn trip credits** via **Taxi Assist Media** during rides, and manage profile, payments, and safety (emergency contacts).

**Outcome:** Rider completes registration → books trip → pays → rates trip; ad credits accrue only when ad rules are satisfied; support and referrals are available from the shell.

---

## 2. Target users

- **Primary:** Registered rider (passenger) with verified phone and email.
- **Secondary:** Invited friends (promo / referral link via SMS or email).

---

## 3. In scope (MVP)

### 3.1 Authentication & registration

- Register or login.
- Registration fields: first name, last name, age, DOB, ID or passport, sex, residential address (**standalone** vs **apartment**; if apartment: unit number + complex name).
- Phone as **username**; OTP to phone for verification.
- Email for account activation.
- Password + password confirmation.

### 3.2 Shell navigation (post-login)

Home for trip request plus **menu / tabs**:

| Area | Behaviour (from source) |
|------|---------------------------|
| **App wallet** | Balance accumulated from watching ads (usable toward trips). |
| **Taxi Assist Media** | Total from ads, count of ads watched, amount available to use. |
| **My profile** | View/edit info; attach documents for **verification**. |
| **Trips** | History; ability to **contact driver** (e.g. forgotten item). |
| **Payments** | Multiple saved cards as payment options. |
| **Emergency contacts** | Up to **5** contacts notified if driver in accident. |
| **Invite friends** | Promo code; invite via SMS or email link. |
| **Support** | Reach support team. |
| **Log out** | End session. |

### 3.3 Booking flow

- Pickup: default **current location**, editable.
- Destination: text entry and/or **map pick**.
- Show **estimated trip total**; rider **confirms or declines** (decline → home).
- **Payment method:** app wallet, card, or cash.
- If **app wallet** selected: rider must also pick **cash or card** as top-up path when wallet balance **does not** cover fare.
- After confirm: **allocate driver**; show driver **live location**, **ETA**, photo, name, car make/colour; **call** or **in-app message**; rider may **update pickup/location during trip** when product allows; show **driver arrived** when applicable.

### 3.4 In-trip ads (Taxi Assist Media)

- When driver **starts trip**, suggest watching ads to accumulate money for **next** trip.
- Ad playback: to advance, rider must **rate product 1–5** and **leave comment** before **skip** / next ad.
- If rider **opens ad URL** in browser, must **return** to app and still **rate + comment** to count ad.
- If rider **leaves** app / ad surface / or driver **ends trip** while ad playing → ad **not** counted as watched (incomplete + unrated).

### 3.5 Post-trip

- Show **total trip amount**.
- **Mandatory:** rate trip **1–5** + comment.
- **Tip:** shown only for **card** or **app wallet** payment; tip **cannot exceed** app wallet balance when paying from wallet rules (per source).
- **Final slide:** total **ad accumulation** this session for use on **next** trip before returning home.

---

## 4. Out of scope (MVP planning — confirm before build)

- Exact matching algorithm, surge pricing, scheduled rides (unless added to platform PRD).
- In-app voice/video (source implies messaging; voice TBD).
- Driver-side behaviour (covered in driver app PRD).

---

## 5. Success metrics (proposal)

- Registration completion rate; OTP success rate.
- Booking funnel: request → confirm → completed.
- Post-trip rating completion rate.
- Ad completion rate (full watch + rate + comment) vs abandoned.
- Support ticket volume per 100 trips.

---

## 6. Dependencies on platform / other apps

- **Supabase:** `profiles` (rider), `trips`, `trip_locations`, wallets/ledger when available, ad tables when available.
- **Driver app:** Accept/decline, trip state, arrival, start/end trip.
- **Admin:** Verification, campaigns, support.

---

## 7. Open questions

- Rider **profile_type** and RLS parity with existing `profiles` schema (see `data-model-and-app-entities.md`).
- In-app messaging transport (Realtime vs third-party).
- Map SDK parity with driver app (Google Maps Flutter).

**Confidence:** **High** for UX narrative (single authoritative email); **Medium** for metrics and edge cases not spelled out in source.
