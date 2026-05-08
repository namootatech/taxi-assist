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

## 2026-05-08 — trip_media_web (`apps/trip_media_web`)

**Scope:** Partner dashboard language pass — clarify “creatives”, “campaign drafts”, and remove “once X is implemented” phrasing.

| Area | Issue | Resolution |
|------|--------|------------|
| Partner dashboard next steps | “Once enabled / after webhooks” copy felt internal and unclear | Rewrote to outcome-first steps: submit creatives for approval, choose a package, track performance |
| Creatives page intro | Users didn’t know what “creatives” are or why review exists | Added plain-language definition + why review exists + what to do next |
| Creatives page upload confusion | No explanation for missing file upload | Added calm note explaining uploads aren’t enabled yet and what partners can do now |
| Campaign drafts | “Drafts” unclear and sounded like a tool, not an outcome | Renamed surface to “Campaign planning” and explained paused plans + requirements to go live |

**Canonical definitions (UI intent):**

- **Creative**: The image or video riders will see during trips.\n+- **Campaign plan**: A paused setup with a cap and schedule, ready to go live once the creative is approved and the package can cover it.

---

## 2026-05-08 — admin_app Trip Media console (`apps/admin_app`)

**Scope:** APD-Market voice pass for the new Trip Media surfaces (`/creatives`, `/ads`, `/trip-media/*`).

| Area | Issue | Resolution |
|------|--------|------------|
| Native `window.prompt` for reasons | Browser dialog, no consequence text, no focus management | Built `components/trip-media/PromptDialog.tsx` with focused outcome-first labels: "Suspending pulls this creative from delivery immediately…", "Reversing debits the rider's wallet" |
| Force-stop button (`/ads`) | Generic "Submit" risk | Renamed to "Force-stop now" plus the consequence note |
| Reward freeze / reverse | Earlier prompts said "Why?" without context | Now "Why are you freezing it?" / "Why are you reversing it?" with a description that names the wallet impact |
| Fraud signal closing actions | Closing without a note | `PromptDialog` always asks for a closing note when moving Resolved/Dismissed/Escalated |
| Reports list | "Run report" was abstract | "Download CSV" — describes the outcome the moderator gets |
| Settings save buttons | A single "Save" was ambiguous across forms | Each form has a specific button: "Save reward caps", "Save reasons", "Save thresholds", "Save watch rules" |
| Role explainer cards | Earlier copy used abstract verbs like "manage" | `lib/trip-media/role-content.ts` lists exact "Can do" / "Cannot do" verbs (e.g. "Reverse rider rewards", "Force-stop campaigns") |
| Empty states | Placeholder lines | "No actions yet — Approvals, rejections, freezes, and reversals show up here as soon as a moderator takes one." |
| Coverage by city panel | Not yet shipping but pretending to | Honest empty state: "Coverage by city is on the roadmap once trip city is captured." |

**Canonical definitions (UI intent) for the admin console:**

- **Creative status set**: Approve, Reject, Request changes, Suspend, Flag for review, Reset to pending.
- **Campaign action set**: Pause, Resume, Force-stop, Adjust delivery.
- **Reward intervention set**: Freeze (no wallet change), Reverse (wallet debited), Release (hold dropped).
- **Fraud triage set**: Start investigation, Resolve, Dismiss, Escalate, Set risk level.

---

## Template (future entries)

```text
## YYYY-MM-DD — <app>

| Area | Issue | Resolution |
|------|--------|--------------|
```
