# Trip Website — PRD (marketing & growth)

**Sources:** Ecosystem need for **leads, conversions, trust, and distribution**; `product-vision-and-concept.md`

## Problem

Prospective riders, drivers, and **advertising partners** need a single **canonical web** presence: who Trip/Taxi Assist is, how to get the apps, how to drive or earn, how to advertise, and how to contact sales or support.

## Goals

1. **Lead capture:** forms for rider interest, driver signup interest, B2B/partner inquiries—with consent and POPIA-aligned copy.
2. **Conversion paths:** deep links to app stores, clear CTAs to driver onboarding and partner media portal.
3. **Trust:** About, safety/compliance highlights, contact channels.
4. **Cross-linking:** Trip Media Web App, rider/driver FAQ, admin (no public link), social profiles.

## Non-goals

- In-app trip booking (that is rider app).
- Authenticated partner tools (Trip Media Web App).

## Core pages / sections

| Route / section | Purpose |
|-----------------|--------|
| Home | Value prop, hero CTAs (Get the app / Drive with us / Advertise), social proof placeholders |
| About | Company story, South Africa focus, compliance-first positioning |
| Riders | Benefits, how it works, download links |
| Drivers | Earnings narrative, requirements summary, link to driver app + signup |
| **Advertise / Partners** | Taxi Assist Media overview → CTA to Trip Media Web App |
| Contact / Lead | Form + support email/phone |
| Legal | Privacy, terms (placeholders until legal supplies) |

## Integrations

- **Analytics:** privacy-preserving events (Plausible, Umami, or GA4—decide in tech doc).
- **CRM / storage:** Supabase `marketing_leads` table or external form backend (see technical doc).

## Success metrics

- Qualified lead volume, CTA click-through to app stores and Trip Media Web App, form completion rate.

## Dependencies

- Brand assets (logo, colors)—align with `docs/system/market` when extended.
- Final legal pages.
