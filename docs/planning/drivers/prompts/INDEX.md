# Driver app — implementation prompts index

Eight sequential Cursor prompts live in this folder (`01`–`08`). They predate strict APD five-file naming; **content** maps to phases as follows:

| APD phase | File(s) | Topic |
|-----------|---------|--------|
| 01 Foundation | `01-driver-implementation-prompt.md` | Flutter project setup, core architecture, dependencies |
| 02 Data & auth | `02-driver-implementation-prompt.md` | Auth + driver profile foundation |
| 03 Core features | `03-driver-implementation-prompt.md` … `06-driver-implementation-prompt.md` | Onboarding, vehicle, documents, trip flow modules (split across files—execute in numeric order) |
| 04 UI & UX | Continues in `05`–`06` if UI-heavy | Maps, location, trip UI |
| 05 Testing & deploy | `07-driver-implementation-prompt.md`, `08-driver-implementation-prompt.md` | Hardening, testing, launch readiness |

**Rule:** Do not skip numeric order. Optional future cleanup: merge into exactly five `01-foundation-setup.md` … `05-testing-and-deployment.md` files without losing text.
