# User roles & permissions — Driver app

**Status:** Stub — driver is primary in-app role; owners/fleet implied via vehicle `owner_type`.

## In-app roles

- **Driver** — uses app daily; linked to one active vehicle (MVP).
- **Vehicle owner** — may overlap with driver; registers vehicle and documents before driver linkage.

## Permissions (conceptual)

- Driver may only read/write own profile, vehicles, documents, trips, tickets, payouts per RLS.
- Admin-side actions are **out of app** but affect status fields the driver reads.

**Source:** `app-prd.md`, `data-model-and-app-entities.md` (driver business logic).
