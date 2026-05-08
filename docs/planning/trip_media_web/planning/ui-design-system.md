# Trip Media Web App — UI design system

## Principles

- **Trust-first:** billing and usage numbers are clear, never buried.
- **Consistent with Trip:** Reuse palette and typography from admin/rider brand guidelines when documented; until then, professional neutral UI (slate/zinc + single accent).
- **Density:** dashboard-first; tables for campaigns and creatives.

## Components

- Layout: sidebar nav (Dashboard, Creatives, Campaigns, Billing, Team, Settings).
- Status chips: trial active, past_due, paused, pending_review.
- Empty states with single primary CTA per `docs/system/market` when copy exists.

## Key screens

1. **Dashboard** — usage meters, trial/credits, quick “New campaign”.
2. **Creatives** — grid/list, upload dropzone, moderation badge.
3. **Campaigns** — list + editor wizard (creative → schedule → review → activate).
4. **Billing** — plan card, payment method, invoices link-out if provider hosts receipts.
5. **Team** — invite by email, role select.

## Responsive

- Desktop-first; mobile usable for monitoring, not full creative upload (acceptable MVP caveat).
