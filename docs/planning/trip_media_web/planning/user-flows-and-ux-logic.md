# Trip Media Web App — User flows & UX logic

## Primary journeys

### 1. Sign up & trial

1. Land from **Trip website** “Advertise with us” CTA.
2. Register (email + password or magic link—implementation detail).
3. Create organization name, industry, contact phone.
4. Choose package → **start trial** or **pay now** (provider checkout redirect).
5. Success → dashboard with **trial/credits banner**, a welcome notification, and empty state for first campaign.

### 1b. Invite & onboard a teammate (no email delivery required)

1. Owner or admin opens `/dashboard/team` → **Invite member**.
2. Fills email, role (`viewer | operator | admin`), optional display name.
3. The portal mints a `partner_invites.token` (default 7-day expiry) and renders a copy-shareable link of the form `/signup?invite=<token>`. The inviter copies it and shares it via Slack/SMS/etc.
4. Invitee opens the link. The page calls `public.get_partner_invite_preview(token)` to render an **AcceptInvite** form with email locked, role badge visible, and partner name.
5. Branch:
   - **New user** → fills full name + password → `auth.signUp` → `public.accept_partner_invite(token)` attaches them to the existing partner.
   - **Existing user** → uses **Sign in instead** link to `/login?invite=<token>` → `signInWithPassword` → `public.accept_partner_invite(token)` runs server-side after auth.
6. On success, redirect to `/dashboard`. The invitee inherits the role set at invite time and never spawns a new `media_partners` row.
7. Owners/admins can **Copy link**, **Regenerate** (mints a new token, invalidating the previous one), or **Revoke** any pending invite from the same page. Revoked or expired tokens render a clear error state on the accept page.

### 2. Subscribe or top up

1. From **Billing**, view current plan, renewal date, payment method (masked).
2. Upgrade/downgrade (if product allows) → new checkout or proration per provider.
3. **Payment failed** → banner + email; campaigns **auto-pause** when grace period ends (configurable policy).

### 3. Upload creative

1. **Creatives library** → upload file(s) to Storage; add title, CTA URL, optional copy.
2. Validation: format, duration, size limits; optional **processing** state.
3. **Moderation:** if policy requires review, status `pending_review` until admin approves or reject with reason.

### 4. Create campaign

1. Select an **approved** creative, set schedule band (peak/off-peak/all day/night), `start_date` / `end_date`, geo (when available), impression cap or “use package default”.
2. Validate against **remaining trial/credits** and **subscription tier**.
3. Status pipeline: `DRAFT → PENDING_REVIEW → ACTIVE → PAUSED → COMPLETED` (plus `REJECTED` from admin moderation and `ENDED` for partner-initiated stops).
4. **Submit for review** moves a draft to `PENDING_REVIEW` (records `submitted_at`); admin moderation flips it to `ACTIVE` (records `activated_at`) or `REJECTED` (with `review_note`).
5. Partner can **Pause** an active campaign and **Resume** it (blocked when subscription is `past_due`). **End campaign** sets it to `COMPLETED` / `ENDED`.
6. **Hard stop** if over cap or subscription `past_due` after grace.

### 5. Monitor performance

1. Dashboard: impressions delivered, completion rate (rider rules), spend vs cap, role-gated quick actions (Create Campaign, Upload Creative, Invite Team, View Billing).
2. Live alerts panel surfaces trial-ending warnings, low credits, rejected creatives, `past_due` subscription, and pending review queue size.
3. Notifications inbox at `/dashboard/notifications` mirrors `partner_notifications`; sidebar shows an unread badge.
4. Analytics page (`/dashboard/analytics`) reports per-campaign delivery, creative coverage, and schedule-band breakdown from current schema only — detailed rider engagement analytics are an honest empty state until rider impression events are wired through.
5. Export or date filters (phase 2 if not MVP).

## Edge cases

- **Trial expires mid-flight:** pause new impressions; allow read-only + billing CTA.
- **Creative rejected:** partner notified; campaign cannot go live until replaced.
- **Provider webhook delay:** UI shows “payment processing” optimistic state; reconcile via polling job.
- **Invite already accepted / revoked / expired:** accept page renders the appropriate message and links back to `/login`; the inviter can mint a fresh link from `/dashboard/team`.
- **Authed user clicks an invite link:** `proxy.ts` allows `/signup?invite=…` and `/login?invite=…` to bypass the default authed-user redirect to `/dashboard`, so the invite flow always runs.
- **Owner deletion attempt:** owners cannot be removed or demoted from `/dashboard/team`; transfer of ownership is an explicit, separate flow (out of scope for this build).

## Accessibility

- WCAG-oriented forms, focus order, error summaries on billing and upload flows.
