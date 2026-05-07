```markdown
# Business Logic Specification: Taxi Assist Driver App

**Document Type:** Business Logic & Rules Engine  
**Product:** Taxi Assist – Driver Mobile Application  
**Version:** 1.0 (MVP)  
**Date:** April 2026  
**Scope:** All backend-enforced rules, state machines, invariants, validations, triggers, and fraud/abuse prevention for the Driver App.

---

## 1. Core Principles

- **Compliance First**: No driver or vehicle may operate without fully approved, non-expired documents.
- **Auditability**: Every state transition, document change, and action is logged with actor (Driver ID), timestamp, GPS (where applicable), and reason.
- **Supply Quality**: The platform protects riders by enforcing strict vehicle and driver standards.
- **Operational Safety**: Clear state machine prevents race conditions and overlapping trips.
- **Fraud Resistance**: Designed to minimize fake documents, ghost drivers, and cash-handling abuse.

---

## 2. Key Entities

### 2.1 Driver Profile

- `driver_id` (UUID, unique)
- `full_name`, `id_number`, `dob`, `age`, `sex`, `residential_address`
- `license_number`, `license_code`, `pdp_number`, `pdp_expiry`
- `cellphone` (verified), `email` (username, verified)
- `bank_details` (account_holder, bank_name, account_number, branch_code)
- `selfie_url`
- `status`: `PENDING` | `REJECTED` | `APPROVED` | `SUSPENDED` | `DEACTIVATED`
- `created_at`, `updated_at`, `approved_at`, `last_online_at`
- `online_status`: `OFFLINE` | `ONLINE`
- `current_vehicle_id` (nullable)

### 2.2 Vehicle Profile

- `vehicle_id` (UUID, unique)
- `owner_type`: `PRIVATE` | `COMPANY`
- `registration_number`, `colour`, `make`, `model`, `category` (`TUKTUK` | `SEDAN` | `LUXURY` | `VAN`)
- `vin`, `speedometer_reading`
- `owner_details` (for PRIVATE) or `company_details` (for COMPANY)
- `status`: `PENDING` | `APPROVED` | `REJECTED` | `SUSPENDED`
- `linked_driver_id` (nullable, one active driver per vehicle in MVP)

### 2.3 Document

- `document_id` (UUID)
- `entity_type`: `DRIVER` | `VEHICLE`
- `entity_id`
- `document_type` (enum: ID, PROOF_OF_RESIDENCE, DRIVERS_LICENSE, NATIS, DOUBLE_DISC, INSURANCE, CK, DIRECTOR_APPROVAL, VEHICLE_PHOTOS, SELFIE, etc.)
- `file_url`
- `status`: `PENDING` | `APPROVED` | `DECLINED` | `EXPIRED`
- `expiry_date` (nullable)
- `uploaded_by`, `reviewed_by`, `reviewed_at`
- `decline_reason` (nullable)

### 2.4 Trip

- `trip_id` (UUID)
- `rider_id`, `driver_id`, `vehicle_id`
- `status`: `REQUESTED` | `ACCEPTED` | `EN_ROUTE_PICKUP` | `ARRIVED_PICKUP` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED` | `NO_SHOW`
- `pickup_location`, `dropoff_location` (lat/lng + address)
- `estimated_fare`, `final_fare`
- `payment_method`: `CASH` | `CARD` | `APP_WALLET` | `APP_WALLET+CASH` | `APP_WALLET+CARD`
- `started_at`, `ended_at`, `cancelled_at`
- `rider_rating`, `driver_rating`, `comments`
- `distance_traveled`, `duration`

---

## 3. State Machines

### 3.1 Driver Online Status
```

OFFLINE → ONLINE (only if: profile APPROVED + vehicle linked + vehicle APPROVED + all critical documents non-expired)
ONLINE → OFFLINE (manual or auto on decline/cancel)

````

**Invariants:**
- A driver cannot be ONLINE without an approved linked vehicle.
- Only one active trip per driver at any time.

### 3.2 Trip Lifecycle (Driver Perspective)

```mermaid
graph TD
    A[Idle - ONLINE] -->|Ride Request| B[REQUESTED]
    B -->|Accept| C[EN_ROUTE_PICKUP]
    B -->|Decline| A
    C -->|Arrived| D[ARRIVED_PICKUP]
    D -->|5min timeout or Start Trip| E[IN_PROGRESS]
    E -->|End Trip| F[COMPLETED]
    C -->|Cancel| A
    D -->|Cancel| A
    E -->|Cancel| F
````

**Strict Rules:**

- Driver can only **Accept** if ONLINE and no current trip.
- After **Decline**: Driver forced OFFLINE for configurable cooldown (default 120 seconds).
- **Arrived at Pickup**: Starts 5-minute rider grace period.
  - Cancel before 5 min → Reason required → OFFLINE.
  - Cancel after 5 min → Reason required → remains ONLINE.
- **Start Trip**: Only after rider is confirmed in vehicle (driver presses button).
- **End Trip**: Only at/near dropoff location (geofence validation recommended).
- Rider destination update during `IN_PROGRESS` → Push alert to driver.

---

## 4. Core Business Rules & Invariants

### 4.1 Registration & Approval Rules

1. **Vehicle Approval**
   - All mandatory documents must be APPROVED.
   - Double disc and Insurance must have valid `expiry_date` > today.
   - Vehicle photos must show current condition (back-office manual check).

2. **Driver Approval**
   - All driver documents APPROVED.
   - PDP and Driver’s License not expired.
   - Online training completed (tracked via flag `training_completed`).
   - Bank details validated (format + optional manual check).

3. **Linking Rule**
   - A vehicle can have only **one** linked active driver at a time.
   - Driver can link only to **one** vehicle.
   - Linking requires both Driver and Vehicle status = APPROVED.

4. **Document Expiry Rules**
   - 30 days before expiry → In-app + push warning.
   - 7 days before expiry → Strong warning + cannot go ONLINE after 0 days.
   - On expiry date → Auto set document status = EXPIRED → Force driver OFFLINE if critical.
   - Critical documents: Driver License, PDP, Double Disc, Insurance, NATIS.

### 4.2 Ride Request Rules

- Ride requests only sent to ONLINE drivers whose vehicle category matches rider request (if filtered).
- Driver sees: pickup, dropoff, estimated fare, estimated time, rider verification status, payment method.
- Payment method display logic:
  - `APP_WALLET` or `CARD` → Show as “Card/App”
  - `APP_WALLET + CASH` → Show as “Cash Top-up”
  - `CASH` → Show as “Cash”

### 4.3 Trip Completion Rules

- Final fare calculated on server (distance + time + base + any surge).
- For **Cash** payments: Driver instructed exact amount to collect.
- For **Card/App**: Driver does **not** collect cash.
- Tip allowed only on Card/App Wallet rides (capped by rider wallet balance in future).
- Both rider and driver must rate each other before trip fully closes (soft enforcement).

### 4.4 Earnings & Payout Rules

- Earnings credited to driver internal ledger upon trip `COMPLETED`.
- Payouts to bank processed manually via back-office (weekly recommended).
- Driver can view detailed trip earnings breakdown.

---

## 5. Triggers & Automated Actions

- **Document Upload** → Set status = PENDING → Notify back-office.
- **Back-office Approval** → Update status → Notify driver via push + email.
- **Document Expiry (approaching)** → Scheduled job sends warnings.
- **Driver goes ONLINE** → Server validates all conditions; reject if violated.
- **Trip Accepted** → Rider notified + driver navigation starts.
- **5-minute Pickup Timeout** → If rider no-show, trip can be cancelled automatically.
- **End of Trip** → Trigger ratings, earnings credit, trip history update.

---

## 6. Validation Rules

**Driver Profile**

- Cellphone must be unique and OTP-verified.
- Email must be unique.
- ID number must pass Luhn-like validation (South African ID format).
- Age ≥ 21 for drivers.

**Vehicle**

- Registration number unique across platform.
- VIN unique.
- Category must match allowed types.

**Trip**

- Pickup and dropoff cannot be same location (configurable radius).
- Trip distance must be reasonable (anti-fraud).
- GPS drift detection on trip start/end.

---

## 7. Fraud & Abuse Prevention

| Vector                    | Rule                                             | Enforcement                         |
| ------------------------- | ------------------------------------------------ | ----------------------------------- |
| Fake Documents            | Manual back-office review + random sampling      | Decline + permanent suspension flag |
| Ghost Drivers             | Selfie + live location on every trip             | GPS + photo match on random audits  |
| Multiple Accounts         | Unique cellphone + ID + device fingerprinting    | Block on detection                  |
| Declining Good Rides      | Cooldown on decline + acceptance rate monitoring | Warnings → Temporary offline lock   |
| Cash Fare Under-reporting | Rider rating + dispute flow                      | Back-office investigation           |
| Document Sharing          | Watermark documents with driver/vehicle ID       | Visual + metadata check             |
| Location Spoofing         | Server-side GPS consistency checks               | Trip rejection + suspension         |

**Zero-Tolerance**:

- Forged documents
- Operating with expired critical documents
- Driver-rider collusion to fake trips

---

## 8. Permissions & Visibility

- Driver can only see **own** profile, vehicle, documents, and trips.
- Back-office has full read/write on all entities.
- Rider sees only limited driver info (name, photo, vehicle details, rating).

---

## 9. Event-Driven Flows (Recommended Implementation)

Use a workflow engine or state machine library:

1. `DriverDocumentUploaded`
2. `DocumentStatusChanged`
3. `DriverStatusChanged`
4. `VehicleLinked`
5. `RideRequested`
6. `TripStateChanged`
7. `TripCompleted`
8. `DocumentExpiring`

Each event triggers notifications, ledger updates, and compliance checks.

---

## 10. Assumptions & Open Items

- **Assumption**: Back-office web dashboard exists and can approve/decline documents with reasons.
- **Assumption**: Matching engine lives on backend and only sends requests to eligible ONLINE drivers.
- **Open**: Exact grace period after document expiry before forcing offline.
- **Open**: Will drivers earn from rider ad-watching in Phase 1? (Recommended: No for MVP – keep simple).
- **Open**: Handling of trip chaining / back-to-back rides near drop-off.
