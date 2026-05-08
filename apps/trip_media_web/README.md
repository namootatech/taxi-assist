# Trip Media Web

Self-serve advertiser portal for Taxi Assist Media partners.

## Planning

- `docs/planning/trip_media_web/about.md`
- `docs/planning/trip_media_web/planning/app-prd.md`
- `docs/planning/trip_media_web/planning/user-flows-and-ux-logic.md`
- `docs/planning/trip_media_web/planning/data-model-and-app-entities.md`
- `docs/planning/trip_media_web/planning/technical-implementation.md`
- `docs/planning/trip_media_web/planning/user-roles-and-permissions.md`

## Local development

```bash
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and set the required values below.

| Variable | Required | Purpose |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL for auth and function invocation |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key used by server helpers to invoke `send-email` |
| `EMAIL_INTERNAL_SECRET` | Yes | Shared secret passed to the `send-email` Edge Function via `x-internal-email-secret` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Optional | Support contact rendered in smoke test template payload |
| `EMAIL_SMOKE_TO` | Optional | Default recipient for `POST /api/internal/email-smoke` |
| `EMAIL_SMOKE_BILLING_URL` | Optional | Billing URL inserted into the smoke email payload |

Supabase function secrets for `send-email` are documented in `supabase/functions/send-email/README.md`.

## Routes

| Path | Notes |
|------|-------|
| `/` | Public landing |
| `/login` | Sign-in. Accepts `?invite=<token>` to attach an existing Trip Media login to a workspace invite. |
| `/signup` | Partner setup. Accepts `?setup=partner` for authed users finishing partner creation, and `?invite=<token>` to render the **AcceptInvite** form for an invited member. |
| `/dashboard` | Live KPIs, alerts, recent campaign activity, role-gated quick actions. |
| `/dashboard/campaigns` | Draft creation, status pipeline (`DRAFT → PENDING_REVIEW → ACTIVE → PAUSED → COMPLETED`, plus `REJECTED`), submit/pause/resume/end actions. |
| `/dashboard/creatives` | Drag-and-drop upload to `partner-ad-creatives` storage, signed-URL preview, submit-for-review, delete. |
| `/dashboard/analytics` | Campaign performance, creative coverage, schedule-band breakdown sourced from current schema. |
| `/dashboard/billing` | Current subscription, package grid, recent billing events, promotional credits, past-due banner. |
| `/dashboard/team` | Members + pending invites, link-shareable invite tokens, role explainer cards, role-gated actions. |
| `/dashboard/notifications` | Partner notifications inbox with mark-as-read. |
| `/dashboard/settings` | Org profile, account, change password, danger zone (close workspace). |

## Member invites (no email required)

Trip Media Web does **not** require email delivery for invites. Owners or admins:

1. Open `/dashboard/team` and click **Invite member**.
2. Enter email + role + optional display name. The role is locked to `viewer | operator | admin` (never `owner`).
3. The portal mints a one-time invite token (default 7-day expiry) and renders a copy-shareable link of the form:

   ```
   https://<your-portal>/signup?invite=<token>
   ```

4. Share the link with the invitee directly (Slack, SMS, internal ticket, whatever the team already uses).
5. The invitee opens the link, the portal validates the token via `public.get_partner_invite_preview`, and they sign up (or sign in if their email already has a Trip Media login). On success, `public.accept_partner_invite` attaches their `auth.users` id to the existing `partner_members` row — invitees never spawn a new partner workspace.

Owners and admins can revoke or regenerate invite links from the same page. Pending invites also surface in the **Pending invites** list with their expiry date.

## Roles

The portal enforces a 4-role model server-side via RLS and surfaces the same gating client-side via `lib/permissions.ts`:

| Role | Can do |
|------|--------|
| `owner` | Everything, plus close the workspace. One per partner. |
| `admin` | Manage team, billing, creatives, campaigns. Cannot close the workspace. |
| `operator` | Manage creatives and campaigns. Cannot edit the org, billing, or team. |
| `viewer` | Read-only across dashboards and reports. |

Role explainer cards are rendered on `/dashboard/team` so every member can see the model. Copy lives in `lib/role-content.ts`.

## Observability and deployment

- Sentry project: `trip-media-web` in the `namoota` organization.
- Google Analytics: `NEXT_PUBLIC_GA_MEASUREMENT_ID` is wired, but GA4 property creation is pending account selection.
- Vercel: app is deploy-ready as a standalone Next.js app; select the intended Vercel team before project creation/deployment.

## Payfast callbacks

Set the sandbox or live notify URL to:

```text
https://<trip-media-domain>/api/payfast-webhook
```

The equivalent Supabase Edge Function scaffold also exists at `supabase/functions/payfast-webhook`.

## Email smoke test (development only)

Use this to verify end-to-end email sending through the shared Supabase `send-email` function:

```bash
curl -X POST "http://localhost:3000/api/internal/email-smoke" \
  -H "Content-Type: application/json" \
  -H "x-internal-email-secret: $EMAIL_INTERNAL_SECRET" \
  -d '{"to":"you@example.com"}'
```

The route is disabled in production.

## Out of scope (current build)

- Real email delivery for invites — link-share is sufficient until email infra lands.
- Email verification gating, password reset, magic-link sign-in.
- Per-impression rider analytics — the analytics page is sourced from current schema only and shows honest empty states.
- Wallet top-up separate from subscription billing — the **Add funds** CTA is disabled with an explainer.
