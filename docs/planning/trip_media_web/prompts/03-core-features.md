# 03 — Core features (Trip Media Web)

**Goal:** Creatives library + campaign CRUD against `ad_creatives` / extended `ad_campaigns`; caps enforced server-side.

## Deliverables

1. Storage bucket + upload flow with signed URLs; creative metadata forms.
2. Campaign wizard: link creative, schedule band, caps; validate `trial_ends_at` / subscription tier / credits (RPC).
3. Dashboard usage meters reading aggregate counts (views/impressions—align with `ad_views` when present).
4. Team invites: invite flow inserts `partner_members` pending or uses Supabase invite + role claim (choose one; document).

## Acceptance

- Partner can upload creative, create draft campaign, activate when eligible.
- Over-cap activation returns structured error from RPC.

**Depends on:** migrations from prompt 02; platform `ad_views` or placeholder counts if not migrated yet.
