**Business Logic Specification: Admin Platform (Trip)**

**Version:** 1.0  
**Date:** May 2026  
**Author:** Principal Product Architect  
**Scope:** Backend admin console for operations, compliance, verification, financials, ad management, and oversight of riders, drivers, vehicles, and trips.

---

### 1. Business Objectives

- Enable centralized verification, approval, and monitoring of all actors (Riders, Drivers, Vehicles, Owners).
- Minimize fraud and compliance risk (especially POPIA, financial crimes, road safety).
- Support efficient ad inventory management and revenue from Taxi Assist Media.
- Provide operational visibility and intervention capabilities for trips and wallets.
- Facilitate payouts, dispute resolution, and performance management.
- Ensure auditability and reversibility of all critical actions.

---

### 2. Core Entities & Relationships

**Users / Profiles**

- **Rider** (Passenger)
  - ID, full name, DOB, age, ID/Passport number, sex, residential address (standalone/apartment + unit/complex), phone (username), email, password hash, verification status, wallet balance, KYC status, emergency contacts (up to 5), promo code, referral data.
- **Driver**
  - ID, full name, DOB, age, ID/Passport, sex, residential address, license details (code, number, PRDP), phone, email (username), bank details, profile photo, training status, verification status, linked car(s).
- **Vehicle / Car**
  - Unique Car ID, registration number, make, model, color, category (tuk tuk, sedan, luxury, van), VIN, speedometer reading, owner type (private/business), linked driver(s).
- **Company Owner** (for fleet vehicles)
  - Company reg number, name, address, director ID/CK/approval letter.

**Documents**

- Document ID, type (ID, license, NATIS, double disc, insurance, proof of residence, photos, etc.), file URL(s), expiry date, status (Pending, Approved, Rejected, Expired), uploaded_by, reviewed_by, review_timestamp, notes.

**Trips**

- Trip ID, rider_id, driver_id, car_id, pickup/dropoff (lat/long + address), status (Requested, Assigned, DriverEnRoute, Arrived, InProgress, Completed, Cancelled), estimated/actual fare, payment_method (AppWallet, Card, Cash, Hybrid), tip (if applicable), ad_watch_session data, ratings/comments (both sides).

**Wallets**

- RiderWallet, DriverWallet.
  - Balance, transaction history (rides, ads, top-ups, payouts, tips).

**Ad Campaigns (Taxi Assist Media)**

- Campaign ID, advertiser, video asset, target zones/times (off-peak/peak/all), max_views, current_views, play_conditions, reward_per_view (for rider).

**Admin Users**

- Roles: SuperAdmin, Operations, Compliance, Finance, AdManager, Support.
- Permissions matrix (CRUD on entities, approve/reject, payout, etc.).

---

### 3. Key Invariants (Always True)

- A Driver can only be online with exactly one approved Vehicle linked.
- Vehicle documents and Driver documents must both be Approved before any trip assignment.
- Rider phone number is unique and verified via OTP.
- Wallet balances cannot go negative (except explicit overdraft rules for hybrid payments).
- Expiry dates on documents trigger automatic status change to Expired.
- Completed trip financials are immutable after settlement window (e.g., 24h).
- Ad view is only credited after full watch + rating + comment.

---

### 4. State Machines & Transitions

**Document Status**

- Pending → Approved / Rejected (by Compliance)
- Approved → Expired (cron job on expiry date)
- Rejected → Pending (re-upload allowed)

**Driver Profile**

- Incomplete → PendingVerification → TrainingRequired → Active / Suspended / Deactivated

**Vehicle**

- Registered → DocumentsPending → Approved / Rejected

**Trip Status**

1. Requested
2. Assigned (driver accepted)
3. DriverEnRoute
4. Arrived (5-min wait timer starts)
5. InProgress (driver starts trip)
6. Completed (driver ends + ratings)
7. Cancelled (with reason + penalties where applicable)

**Wallet Transaction Types**

- Credit: Ad rewards, refunds, manual top-up
- Debit: Ride fare, tip, payout to bank

---

### 5. Core Business Rules

**Verification & Onboarding**

- All identity/documents require manual review by Compliance.
- Auto-reject rules: mismatched names, expired docs, blacklisted IDs.
- Driver activation requires: all docs approved + online training completed + bank verified.
- Rider verification (for higher limits or features): ID + address proof.

**Trip Matching & Execution**

- Matching respects driver availability, proximity, vehicle category preferences.
- Hybrid payments: AppWallet first, then fallback (Cash/Card) for remainder.
- 5-minute arrival grace period: cancellation rules differ before/after.
- Location updates during trip trigger driver notification and fare recalculation.
- Cash trips: driver collects physical cash; system records expected amount for reconciliation.

**Ad Watching (Rider)**

- Ads only during InProgress state.
- Credit only on completion of watch + 1-5 star rating + comment.
- Clicking ad opens external link but session must return to app for credit.
- Incomplete ads (app close, trip end, skip without rating) = no credit.
- Reward capped per trip / per day.

**Financials & Payouts**

- Driver earnings settled post-trip (minus platform fee).
- Rider wallet usable for future trips.
- Driver bank payouts initiated via admin (with proof of transaction upload).
- Tip only on non-cash payments; capped by available wallet for app payments.

**Ratings & Feedback**

- Mutual rating required post-trip.
- Low ratings trigger admin review flags.

---

### 6. Admin Platform Capabilities & Workflows

**Dashboard**

- Live metrics: active trips, online drivers, daily earnings, pending verifications, ad views.

**User Management**

- Search/filter riders/drivers/vehicles.
- View full profile + document gallery.
- Manual approve/reject documents (with notes).
- Suspend / ban / flag accounts.
- View trip history, wallet ledger, emergency contacts.

**Verification Queue**

- Prioritized list of pending documents/profiles.
- Bulk actions + individual review with audit log.

**Trip Oversight**

- View live + historical trips.
- Intervene: cancel trip (with reason), adjust fare (rare, audited), contact parties.
- Dispute resolution workflow.

**Wallet & Finance**

- View ledgers.
- Manual adjustments (audited).
- Initiate/confirm driver payouts (upload proof).
- Reconciliation for cash trips.

**Ad Management (Taxi Assist Media)**

- Upload/refine video ads.
- Define targeting: time slots, geo-zones, driver segments.
- Set view limits, reward rates.
- Performance dashboard (views, completion rate, revenue).

**Support & Communication**

- In-app messaging / ticket system with riders & drivers.
- Template responses.

**Reporting & Analytics**

- KPI dashboards (completion rate, fraud signals, ad ROI, driver utilization).
- Export capabilities.

---

### 7. Fraud Vectors & Mitigation

- **Fake Documents:** OCR + manual review + expiry enforcement + periodic re-verification.
- **Driver Collusion / Fake Trips:** GPS validation, trip duration/fare sanity checks, rating patterns, velocity checks.
- **Ad Fraud (Rider):** Enforce full interaction sequence, rate-limit views, session integrity.
- **Wallet Abuse:** OTP on high-value actions, velocity limits, negative balance prevention.
- **Ghost Drivers:** Photo verification on login + periodic selfie checks.
- **Payment Disputes:** Clear audit trail, 24h settlement window for disputes.
- **Multi-accounting:** Phone/ID uniqueness + device fingerprinting.

**All critical actions must generate immutable audit logs (who, what, when, why).**

---

### 8. Triggers & Event-Driven Flows

- Document expiry → auto status update + notification + driver offline.
- Trip Completed → calculate fare, credit driver, debit rider, credit ad rewards, trigger ratings.
- Driver Payout Requested → Finance review → record transaction → credit wallet or bank.
- Low rating cluster → auto flag for Operations.
- Wallet low balance on hybrid → enforce fallback selection.

---

### 9. Non-Functional & Compliance Rules

- All PII handling compliant with POPIA.
- Financial transactions auditable for SARB / FIC requirements.
- Soft deletes + full history for reversibility.
- Rate limiting and input sanitization everywhere.
- Observability: logs, metrics, traces for all state changes.

---

### 10. Phased Implementation Priorities (MVP Focus)

**Phase 1 (Launch Critical)**

- Document upload/review/approval workflow
- Rider + Driver + Vehicle basic CRUD + verification
- Trip status management + basic financial settlement
- Wallet ledger + ad reward crediting

**Phase 2**

- Advanced ad targeting and campaign management
- Payout processing + reconciliation
- Full support ticketing + emergency contact handling

**Phase 3**

- Advanced analytics, bulk actions, AI-assisted review flags.

---

**Open Questions / Assumptions**

- Exact platform fee structure and ad revenue share?
- Integration details with payment gateway (cards) and banks?
- Geofencing / city launch boundaries?
- Training module provider (in-app or external)?

This spec provides a production-ready foundation for engineering the admin backend (entities, services, workflows) and UI. It is designed for rapid iteration while protecting the platform moat through strong compliance and fraud controls.

Ready for database schema derivation, API spec, or Cursor implementation prompts. Let me know the next artifact needed.
