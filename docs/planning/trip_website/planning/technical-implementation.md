# Trip Website — Technical implementation

**Stack (proposed):** Next.js 15 App Router (static + ISR) or Astro—**default Next.js** for monorepo consistency with `apps/admin_app` and future shared packages.

## Host

- Vercel, Netlify, or Cloudflare Pages—match org standard (TBD).

## Content

- **Phase 1:** TSX pages + MDX for legal long-form (optional).
- **Phase 2:** Headless CMS if non-dev edits needed frequently.

## Forms

- Server Actions or Route Handler posting to Edge Function → insert `marketing_leads` + optional Resend/SendGrid notification.

## Performance

- Image optimization for hero; Lighthouse targets ≥ 90 performance on home (best effort).

## Environment

- `NEXT_PUBLIC_TRIP_MEDIA_WEB_URL`, `NEXT_PUBLIC_*_APP_STORE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only if using DB).

## References

- `docs/planning/technical-foundation.md`
