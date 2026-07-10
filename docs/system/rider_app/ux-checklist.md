# Taxi Assist Rider — UX checklist (MVP)

Design reference: `design-system/taxi-assist-rider/MASTER.md`

## Global

- [x] 48dp minimum tap targets on primary actions (`AppSpacing.minTapTarget`)
- [x] Lexend headings + Source Sans 3 body via `google_fonts`
- [x] Primary `#2563EB`, CTA `#F97316`, accessible contrast on light background
- [x] Light and dark themes with toggle
- [x] Loading indicators on auth and async lists
- [x] User-facing error messages (no stack traces)

## Auth

- [x] Email/password sign in, register, forgot password
- [x] PENDING/APPROVED gate before booking
- [x] Document upload for verification
- [x] Phone OTP documented as deferred (`docs/system/rider_app/api.md`)

## Booking

- [x] Map placeholder with pickup/destination labels
- [x] GPS pickup default via geolocator
- [x] Booking wizard: pickup → destination → payment/confirm
- [x] Fare estimate display
- [x] Payment method selection (cash/card/wallet)

## Active trip

- [x] Trip status banner (color-coded)
- [x] Driver card with call action (`url_launcher`)
- [x] Message stub
- [x] Cancel before pickup states
- [x] Driver location read via Realtime + `trip_locations`

## Post-trip

- [x] Mandatory 1–5 rating + comment
- [x] Optional wallet tip with R500 cap (server enforced)
- [x] Fare summary

## Taxi Assist Media

- [x] Full-screen ad surface on in-progress trip
- [x] Abandon warning → `ABANDONED` event (no credit)
- [x] Rating+comment gate before credit
- [x] Media summary list screen

## Shell

- [x] Drawer navigation (trips, payments, wallet, media, emergency, invite, support, profile)
- [x] Emergency contacts CRUD (max 5)
- [x] Support ticket create/list
- [x] Invite friends stub with referral code copy

## Maps

- [x] Map placeholder when API key not configured
- [ ] Live Google Maps widget (requires native API key setup)

## Follow-up (post-MVP)

- [ ] Phone OTP Edge Functions
- [ ] Payfast/Paystack card tokenization
- [ ] Production maps polyline + live driver marker
- [ ] Reduced-motion preferences
