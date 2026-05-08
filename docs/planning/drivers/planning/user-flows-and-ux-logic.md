# User flows & UX logic — Driver app

**Status:** Stub — full state machine and edge cases live in `data-model-and-app-entities.md`.

## Headline flows

1. **Register** driver → upload docs → pending → training (if required) → approved
2. **Register vehicle** (private vs company) → photos + compliance docs → approved → Car ID
3. **Link** vehicle to driver via Car ID + plate
4. **Go online** → receive request → accept/decline → navigate → arrived (5-min rule) → start → end
5. **Rate rider** + comment → home
6. **Support** ticket from profile

## UX notes

- SA network + battery: conservative realtime, clear offline/error states.
- Maps: deep link to native maps where full in-app nav is out of MVP scope.

**Source:** `app-prd.md`, `data-model-and-app-entities.md`.
