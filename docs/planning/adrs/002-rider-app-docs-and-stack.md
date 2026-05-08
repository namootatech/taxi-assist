# ADR 002: Rider app documentation & default stack

## Status

Accepted

## Context

Rider behaviour lived only in `supporting-documents/idea.md`. Driver and admin had full APD folders. Platform `schema-gap-analysis` listed missing rider planning.

## Decision

1. Add **`docs/planning/rider_app/`** with full six-pack under `planning/` and **`prompts/01`–`05`**.
2. Default rider client stack: **Flutter + Supabase + Riverpod** for parity with `driver_app`, until an ADR chooses otherwise.
3. Scaffold **`docs/system/rider_app/README.md`** for future runbooks.

## Consequences

- `apps/rider_app` still **does not exist** until implementation prompts run — docs are planning-only.
- Wallet, ads, and rider trip RLS may still be **incomplete** in DB; rider prompts must reference `schema-gap-analysis.md` when blocked.

## Confidence

High for documentation structure; Medium for final mobile framework if product overrides Flutter.
