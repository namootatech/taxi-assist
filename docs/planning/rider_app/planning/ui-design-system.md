# UI design system — Rider app

**Sources:** `app-prd.md`, `user-flows-and-ux-logic.md`.

## Principles

- **Consumer-grade** clarity (contrast with admin internal UI): large typography, forgiving forms, clear trip state on every screen during active ride.
- **South Africa context:** low bandwidth, intermittent GPS — skeleton loaders, retry, offline messaging where applicable.

## Navigation

- **Home** = trip request CTA + hamburger / drawer for Wallet, Media, Profile, Trips, Payments, Emergency, Invite, Support, Logout.
- **Active trip** = persistent strip or full-screen map mode so state is never ambiguous.

## Trip request UI

- Map-first or form-first (product decision); must show **estimate** before confirm; **payment** selector before dispatch.

## Ads surface

- Full-screen takeover during trip when enabled; **visible progress** toward “rated + commented”; clear **discard = no credit** copy.

## Payments & wallet

- Saved cards list with add/remove; wallet balance prominent; hybrid payment explanation when wallet short.

## Accessibility

- Tap targets ≥ 48dp; support dynamic type; color-blind safe state colors (requested vs en route vs in trip).

## Branding

- Align with Taxi Assist / Trip marketing when assets exist; until then use neutral primary + semantic colors for trip states.

**Confidence:** **Medium** (no Figma in repo; refine when design system tokens exist).
