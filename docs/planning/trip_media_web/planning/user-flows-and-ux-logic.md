# Trip Media Web App — User flows & UX logic

## Primary journeys

### 1. Sign up & trial

1. Land from **Trip website** “Advertise with us” CTA.
2. Register (email + password or magic link—implementation detail).
3. Create organization name, industry, contact phone.
4. Choose package → **start trial** or **pay now** (provider checkout redirect).
5. Success → dashboard with **trial/credits banner** and empty state for first campaign.

### 2. Subscribe or top up

1. From **Billing**, view current plan, renewal date, payment method (masked).
2. Upgrade/downgrade (if product allows) → new checkout or proration per provider.
3. **Payment failed** → banner + email; campaigns **auto-pause** when grace period ends (configurable policy).

### 3. Upload creative

1. **Creatives library** → upload file(s) to Storage; add title, CTA URL, optional copy.
2. Validation: format, duration, size limits; optional **processing** state.
3. **Moderation:** if policy requires review, status `pending_review` until admin approves or reject with reason.

### 4. Create campaign

1. Select creative(s), set schedule band (peak/off-peak/all day/night), geo (when available), impression cap or “use package default”.
2. Validate against **remaining trial/credits** and **subscription tier**.
3. Submit → status `draft` → **activate** when eligible.
4. **Hard stop** if over cap or subscription `past_due` after grace.

### 5. Monitor performance

1. Dashboard: impressions delivered, completion rate (rider rules), spend vs cap.
2. Export or date filters (phase 2 if not MVP).

## Edge cases

- **Trial expires mid-flight:** pause new impressions; allow read-only + billing CTA.
- **Creative rejected:** partner notified; campaign cannot go live until replaced.
- **Provider webhook delay:** UI shows “payment processing” optimistic state; reconcile via polling job.

## Accessibility

- WCAG-oriented forms, focus order, error summaries on billing and upload flows.
