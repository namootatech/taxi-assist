# 05 — Testing & deployment (Trip Media Web)

**Goal:** Billing webhooks, E2E smoke, deploy strategy.

## Deliverables

1. Edge Functions: Payfast + Paystack webhook handlers; idempotency via `partner_billing_events`.
2. Checkout/create subscription flow from Billing page (sandbox keys).
3. Tests: webhook signature verification unit tests; critical path Playwright or API tests optional.
4. Deployment docs: env vars list, provider dashboard callback URLs.

## Acceptance

- Sandbox subscription moves partner from `trialing` to `active`; failed payment sets `past_due` and pauses campaigns per policy.

**Depends on:** prompts 01–04.
