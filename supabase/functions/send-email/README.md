# `send-email` Supabase Edge Function

Centralized provider-agnostic email API for all Trip apps.

## Contract

`POST /functions/v1/send-email`

```json
{
  "to": "recipient@example.com",
  "subject": "Subject line",
  "template": "payment-failed",
  "data": {
    "partnerName": "Acme Mobility"
  },
  "requestId": "optional-idempotency-key"
}
```

Response shape:

- Success: `{ "data": { "id": "provider-message-id", "provider": "resend" }, "error": null }`
- Error: `{ "data": null, "error": { "code": "ERROR_CODE", "message": "Readable message" } }`

## Required Supabase function secrets

Set these with `supabase secrets set` (or in the Supabase dashboard):

| Variable | Required | Purpose |
|------|------|------|
| `RESEND_API_KEY` | Yes | Resend API key used by the default provider |
| `EMAIL_FROM` | Yes | Sender identity, for example `Trip Media <no-reply@your-domain.com>` |
| `EMAIL_INTERNAL_SECRET` | Yes | Shared secret required in `x-internal-email-secret` request header |
| `EMAIL_PROVIDER_ORDER` | Optional | Comma-separated provider order (defaults to `resend`) |
| `EMAIL_BRAND_NAME` | Optional | Brand text in email header (defaults to `Trip`) |
| `EMAIL_SUPPORT_EMAIL` | Optional | Footer support contact (defaults to `support@taxiassist.co.za`) |

## Security model

This endpoint is intended for server-side calls only.

Every request must include:

- `x-internal-email-secret: <EMAIL_INTERNAL_SECRET>`

Requests without the correct secret are rejected with `401`.

## Retry/fallback behavior

1. Try Resend (default provider)
2. Retry once for transient provider/network failures
3. Future providers can be appended in `EMAIL_PROVIDER_ORDER` without changing app callers
