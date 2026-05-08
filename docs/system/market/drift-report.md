# Copy drift report

Tracks divergences between **implemented UI** and APD-Market voice rules; resolutions are either **code changes** or **document updates**.

---

## 2026-05-08 — driver_app (`apps/driver_app`)

**Scope:** APD-Market-Execute pass — onboarding gate, waiting approval, home dashboard, documents, go-online toasts, auth helpers, landing.

| Area | Issue | Resolution |
|------|--------|--------------|
| Onboarding gate | User-facing text referenced Supabase, `profiles`, RLS | Rewrote for drivers: refresh / sign-in again / support |
| Waiting approval | Empty state: “document rows,” “wizard” | Plain language; errors use `userFacingError` |
| Waiting approval | “Back-office” | “We’re reviewing…” |
| Home / Documents | “No profile,” raw `$e` on errors | Guided recovery copy + `userFacingError` |
| Session timer | “(soft MVP)” | Removed — timer label only |
| Go online/offline toasts | Raw exception strings | `userFacingError` |
| Compliance offline toast | Slightly system-centric | Shortened to outcome-focused line |
| Forgot password helper | SMTP / Supabase | Inbox / spam, human timing |
| OTP success toast | Email confirmation + Supabase | Product-only wording |
| Landing | Photo attribution footnote | Removed for cleaner marketing surface |

**Follow-up (not changed this pass):**

- Go-online **blocker list** still reflects server-supplied reason strings — map codes → driver-friendly lines when RPC payloads stabilize.

---

## 2026-05-08 — admin_app (`apps/admin_app`)

**Scope:** APD-Market-Execute pass — internal console: server page load errors, auth redirects, toasts, ads MVP form, marketing landing, verification blurb.

| Area | Issue | Resolution |
|------|--------|------------|
| All dashboard data pages | Raw `{error.message}` from Postgrest on load | `userFacingError()` in `lib/user-facing-error.ts` + consistent error line |
| Login / register redirects | Encoded raw auth/DB messages in query string | Redirects use `userFacingError` before `encodeURIComponent` |
| Client toasts (drivers, admins, wallets) | `e.message` to operator | `userFacingError(e)` |
| Ads form | “Supabase Storage path,” `target_json` in UI | “Video path in storage,” “Targeting options are simplified for this MVP” |
| Marketing landing footer | `admin_profiles` in `<code>` | “Ask your ops owner to invite you to the admin console” |
| Marketing hero | Unsplash photo credit | Replaced with short “Illustrative preview” note (KPIs on dashboard) |
| Verification intro | “signed URLs” (jargon) | “Secure, time-limited window” |

**Shared helper:** `apps/admin_app/lib/user-facing-error.ts` — network, session, permission heuristics (no raw stack traces as the only line).

---

## Template (future entries)

```text
## YYYY-MM-DD — <app>

| Area | Issue | Resolution |
|------|--------|--------------|
```
