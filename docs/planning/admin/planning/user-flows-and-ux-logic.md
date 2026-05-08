# User flows & UX logic — Admin app

## Core journeys

1. **Login** → role-based dashboard
2. **Verification queue** → open entity → side-by-side documents → approve / reject with mandatory notes
3. **Entity search** → profile → history (trips, wallet, documents)
4. **Trip monitor** → map / list → intervention / cancel with reason
5. **Finance** → wallet ledger view → adjustment RPC
6. **Trip Media — Creative review** → queue → review panel → Approve / Reject / Request changes / Suspend / Flag
7. **Trip Media — Campaign oversight** → list → drawer → Pause / Resume / Force-stop / Adjust delivery
8. **Trip Media — Advertiser oversight** → list → detail tabs → Suspend or Restore / Adjust credits
9. **Trip Media — Rider rewards** → recent / holds / wallet trails → Freeze or Reverse with mandatory reason
10. **Trip Media — Fraud triage** → signal queue + auto-candidates → detail panel → Investigate / Resolve / Dismiss / Escalate / Set risk level / Freeze related reward
11. **Trip Media — Reports** → pick report → audited download
12. **Trip Media — Settings** → reward caps, rejection reasons, risk thresholds, watch rules
13. **Support** → ticket inbox → respond / escalate

## UX principles

- Dense data tables with server-side pagination; optimistic UI only where safe.
- Every destructive or financial action requires a **reason** plus an audit row.
- Native `window.prompt` is forbidden in Trip Media surfaces. Use `components/trip-media/PromptDialog.tsx` for short-reason capture (focus management, ESC-to-close, minimum length validation).
- Every form uses `react-hook-form` + `zod` with `sonner` toasts for feedback.

## Trip Media flow detail

### Creative review

1. Moderator opens `/creatives` (default tab: Pending review).
2. Selects a creative — preview loads through a signed URL (videos play inline, images render full-frame).
3. Picks an action:
   - **Approve** — single click, no reason required.
   - **Reject** — RHF form with a required policy reason from `trip_media_settings.rejection_reasons` and a free-text note that the advertiser sees.
   - **Request changes** — RHF form with a free-text instruction.
   - **Flag for review** — `PromptDialog` capture of the team-only note.
   - **Suspend** — `PromptDialog` capture of the policy note. Removes the creative from delivery.
4. The creative status updates and the queue tab counters refresh.

### Campaign oversight

1. Ad Moderator opens `/ads`. Status filter sits across the top.
2. Selecting a campaign opens a side drawer with spend, creative thumbnail, schedule band, and force-stop history.
3. Available actions:
   - **Pause** — `PromptDialog` reason → status becomes `PAUSED`.
   - **Resume** — `PromptDialog` reason for the audit log → status becomes `ACTIVE`.
   - **Force-stop** — RHF form with required reason. Notifies the advertiser. Status becomes `FORCE_STOPPED`.
   - **Adjust delivery** — RHF form for view cap and per-view reward, with required reason.
4. A link from the drawer jumps to `/trip-media/fraud?campaign=<id>` for investigations.

### Advertiser oversight

1. Open `/trip-media/advertisers`. Search by name, filter by status.
2. Open the detail page — tabs cover Overview, Members, Subscription, Billing events, Creatives, Campaigns, Audit trail.
3. The Actions panel offers Suspend / Restore (Super Admin only) and Adjust promotional credits (Super Admin or Finance) — both gated server-side.

### Rider rewards

1. Three tabs: Recent rewards (last 100 ad views), Holds & reversals, Wallet trails (filtered to ad reward types).
2. Per-row actions:
   - **Freeze** opens a `PromptDialog` and creates an `ad_reward_holds` row. The rider's wallet is not touched.
   - **Reverse** opens a `PromptDialog`, debits the wallet, and writes a reversal transaction. Only allowed on rows with a credited reward.

### Fraud triage

1. The console shows status filters across the top, then risk-level filters underneath.
2. Two parallel sources:
   - The **signal queue** (`ad_fraud_signals`) — admin-created or job-created cases.
   - **Auto-candidates** (`vw_fraud_candidates`) — riders that crossed the configured thresholds.
3. Selecting a signal opens the detail panel:
   - Triage actions: **Start investigation**, **Resolve**, **Dismiss**, **Escalate**.
   - Closing actions (Resolve / Dismiss / Escalate) require a reason captured by `PromptDialog`.
   - **Set risk level** runs without a prompt and updates `ad_fraud_signals.level`.
   - **Freeze related reward** is offered when the signal references an `ad_view_id`.

### Reports

1. `/trip-media/reports` lists four pre-built CSVs:
   - Creative moderation log
   - Campaign oversight log
   - Reward ledger
   - Fraud signals export
2. Each download streams from `/api/trip-media/reports/[kind]`. The route handler verifies `run_reports`, builds the CSV, calls `admin_record_report_run`, and returns the file with `Cache-Control: no-store`.
3. The recent runs table shows the last 25 runs with status and row count.

### Settings

1. `/trip-media/settings` is gated by `manage_trip_media_settings` (Super Admin or Ad Moderator).
2. Four RHF + zod forms persist into `trip_media_settings`:
   - **Reward caps** — per-trip, per-day, per-view defaults.
   - **Rejection reasons** — field array with slug / label / description.
   - **Risk thresholds** — values that drive `vw_fraud_candidates`.
   - **Watch rules** — minimum watch ratio, rating, comment length.
3. Below the forms, the page renders the role explainer cards from `lib/trip-media/role-content.ts`.

## Edge cases

- **Insufficient role for a route** — the proxy redirects to `/dashboard` with a "permission denied" toast.
- **Creative without a media file** — preview shows "No preview available" rather than a broken player.
- **Reverse on a non-credited reward** — the button is disabled with a tooltip explaining why.
- **Fraud signal without an `ad_view_id`** — the Freeze button is disabled with a tooltip.
- **Report fails midway** — the route handler records `admin_report_runs.status = 'failed'` with the error message and returns a JSON error.

**Sources:** `app-prd.md`, `data-model-and-app-entities.md`, `technical-implementation.md`, and the in-app modules under `apps/admin_app/lib/trip-media/`.
