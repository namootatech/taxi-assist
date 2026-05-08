# ADR 001: APD-Resume documentation layout (2026-05-07)

## Status

Accepted

## Context

Planning lived under mixed paths (`supporting-ducuments` typo, flat `admin/` files, driver prompts `1.md`–`8.md`). Global APD skills expect `supporting-documents/`, per-app `planning/` + `prompts/`, platform kebab-case files, and `docs/system/project-state.json`.

## Decision

1. Rename intake folder to **`docs/planning/supporting-documents/`**.
2. Move **admin** and **drivers** artifacts into **`planning/`** and **`prompts/`** subfolders with APD-oriented names.
3. Add **synthesized platform** markdown files at `docs/planning/` root.
4. Move **`docs/seed-data.md`** → **`docs/system/seed-data.md`**.
5. Keep **eight** driver implementation prompts, with an **INDEX** describing how they map to APD phases (optional consolidation later).

## Consequences

- Internal links in older docs pointing at `docs/admin/...` or `docs/seed-data.md` are **stale** until updated.
- `data-model-and-app-entities.md` for admin/drivers currently contains **full** prior business-logic specs (richer than name implies)—acceptable for recovery; may split later.

## Confidence

High for layout; Medium for long-term split of business-logic vs data model files.
