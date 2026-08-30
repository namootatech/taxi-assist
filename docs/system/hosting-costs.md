# Trip platform — hosting and run costs

Estimated monthly operating costs for a Gauteng pilot launch with three Vercel-hosted Next.js apps (`trip_website`, `trip_media_web`, `admin_app`), shared Supabase backend, and two Flutter mobile apps (driver + rider).

All figures are approximate ZAR at ~R18/USD unless noted. Transaction fees and usage overages are excluded.

## Fixed monthly infrastructure

| Service | Plan / usage | Est. monthly (ZAR) |
|---------|----------------|-------------------|
| **Vercel** — 3 Next.js projects | Pro team, moderate bandwidth | R400–800 |
| **Supabase** — DB, auth, storage, edge functions | Pro ($25) + 5–20 GB document/photo storage | R500–1,200 |
| **Sentry** — web + mobile error tracking | Free tier or Team | R0–500 |
| **Google Maps** — rider app map loads | ~10k loads/mo (often within $200 credit) | R0–400 |
| **Domains** — marketing, media, admin subdomains | 2–3 domains amortized | R50–100 |
| **Apple Developer + Google Play** | Store listing (annual fee amortized) | ~R200 |

**Estimated fixed run cost (pilot): R1,500–3,200/month (~USD 80–170)**

## Variable / usage-based costs

| Service | Notes |
|---------|-------|
| **Payfast** | ~2.9% + R2 per successful transaction (campaign checkout, Starter subscription, vehicle onboarding fees) |
| **Supabase overages** | Extra storage, egress, or MAU beyond Pro limits |
| **Google Maps** | Billable after free monthly credit is exhausted |
| **SMS / email** | If added for OTP or notifications beyond Supabase Auth defaults |

## What is not hosted separately

| Component | Hosting model |
|-----------|---------------|
| **driver_app** (Flutter) | Distributed via APK / TestFlight / Play Store — no app server |
| **rider_app** (Flutter) | Same as driver app |
| **Payfast webhooks** | Trip Media Vercel route + Supabase edge functions |
| **Supabase migrations** | Applied to shared project — no per-deploy hosting fee |

## Deployment targets

| App | Host | Config |
|-----|------|--------|
| trip_website | Vercel | `apps/trip_website/vercel.json` |
| trip_media_web | Vercel | `apps/trip_media_web/vercel.json` |
| admin_app | Vercel | `apps/admin_app/vercel.json` |
| Backend | Supabase | `supabase/migrations/` |
| Edge functions | Supabase | `supabase/functions/` |

## One-time / setup costs

| Item | Est. cost |
|------|-----------|
| Android release keystore | R0 (self-generated) |
| Supabase project setup | R0 (Pro subscription starts on upgrade) |
| Payfast merchant account | R0 setup; per-transaction fees apply |
| Domain registration | R150–300/year per domain |

## Cost optimisation tips (pilot phase)

1. **Stay on Supabase Pro** until storage or MAU consistently exceeds included limits.
2. **Use Vercel preview deployments** for QA; promote to production only for releases.
3. **Monitor Google Maps** usage in GCP console; set billing alerts at 80% of free credit.
4. **Sentry free tier** is sufficient for early pilot; upgrade when event volume grows.
5. **Payfast sandbox** for all non-production payment testing — no transaction fees.

## Related docs

- [Rider app deployment](../rider_app/deployment.md)
- [Trip Media README](../../apps/trip_media_web/README.md)
- [Shared services registry](../planning/shared-services.md)

_Last updated: August 2026_
