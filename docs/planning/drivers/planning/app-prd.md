# PRD: Taxi Assist Drivers App

**Product Name:** Taxi Assist – Driver Mobile Application  
**Version:** 1.0 (MVP)  
**Date:** April 2026  
**Author:** Principal Product Architect (Grok)  
**Target Market:** South Africa (focus on Eastern Cape + Gauteng corridors initially)  
**Primary Goal:** Enable verified drivers and vehicle owners to efficiently accept rides, earn income, maintain compliance, and operate safely within the Taxi Assist multi-sided marketplace.

---

## 1. Executive Summary

The **Taxi Assist Driver App** is the companion mobile application for drivers and vehicle operators in the Taxi Assist ecosystem. It allows approved drivers to go online, receive ride requests, navigate to passengers, complete trips, earn from both fares and potential media incentives, and manage their vehicle profiles and compliance documents.

This app is **critical to supply-side liquidity**. Without a frictionless, compliant, and motivating driver experience, rider demand cannot be fulfilled. The MVP focuses on core ride operations, document compliance, and basic earnings visibility while enforcing South African regulatory requirements (Natis, double discs, insurance, PDPs, etc.).

**Key Differentiator:** Built-in document expiry tracking, back-office approval workflow, and future ad-media revenue share for drivers who opt-in.

**Launch Strategy:** Pilot in one corridor (e.g., Cradock – Port Elizabeth or Johannesburg local) before national rollout.

---

## 2. Objectives & Success Metrics

### Business Objectives

- Achieve driver activation rate > 70% within 30 days of document submission
- Maintain driver online utilization > 45% during peak hours
- Keep trip acceptance rate > 65%
- Ensure 100% of active vehicles have valid, back-office approved documents at all times
- Minimize operational disputes through clear state transitions and audit logs

### KPIs (MVP)

- Daily active drivers (DAD)
- Average trips per active driver per day
- Average earnings per trip (fare + future tip/media)
- Document expiry warning compliance (drivers renew before expiry)
- Driver churn rate (monthly)
- Rider rating of driver (target ≥ 4.3/5)

---

## 3. User Personas

**Primary User:**

- **Registered Driver** – Individual with valid PDP license, owns or linked to an approved vehicle. Wants to maximize earning hours while staying compliant.

**Secondary Users:**

- **Vehicle Owner (Private)** – Registers vehicle and links drivers.
- **Vehicle Owner (Company/Fleet)** – Registers fleet vehicles and manages multiple drivers.
- **Back-Office Admin** – Approves/declines documents and verifies profiles (separate web dashboard, not in this app).

---

## 4. Scope

### In Scope (MVP)

- Driver registration + document upload
- Vehicle registration + document upload (private & company)
- Document expiry tracking & renewal reminders
- Driver login (email + password + OTP where required)
- Link driver profile to approved vehicle
- Go Online / Go Offline toggle
- Real-time ride request acceptance/decline
- Navigation to pickup & drop-off
- Trip state management (Arrived → Start Trip → End Trip)
- Cash / Card / App Wallet payment visibility
- Basic ratings & comments (rider rating + optional tip handling for cash)
- Daily earnings summary
- Profile management & document status view
- In-app support / contact back-office
- Push notifications for ride requests, document expiry, account status

### Out of Scope (MVP – Phase 2+)

- Driver ad-watching / media revenue share (will be rider-initiated only in MVP)
- Driver wallet top-up / airtime purchase
- Multi-vehicle switching for one driver
- Advanced fleet management dashboard
- In-app voice/video calling (use native dialer initially)
- Dynamic pricing / surge
- Driver heat-map / zone incentives
- Background navigation with full turn-by-turn (use Google/Apple Maps deep link)

---

## 5. Functional Requirements

### 5.1 Onboarding & Registration

#### Vehicle Registration Flow

1. Choose ownership type: **Private** or **Company/Fleet**
2. **Private Owner**
   - Owner details (full name, ID/passport, age, address, contact)
   - Car details (registration number, colour, make, model, category: Tuk-Tuk/Sedan/Luxury/Van, VIN, speedometer reading)
   - Upload documents:
     - Certified owner ID
     - Proof of residence
     - NATIS copy
     - Double disc (with expiry)
     - Insurance (liability cover, 1-year expiry)
   - Upload 5 vehicle photos (front, left, right, back, speedometer)
3. **Company/Fleet**
   - Company CIPC number, name, address
   - Director’s certified ID + signed approval letter + CK document
   - Same car details + documents (no owner ID/proof of residence)
4. All documents enter **Pending** state
5. Back-office approves/declines per document with reason
6. Upon full approval → Vehicle receives unique **Car ID**

#### Driver Registration Flow

1. Personal details (full name, ID/passport, DOB, age, sex, address, license code + PDP, license number, bank details)
2. Contact verification (cellphone OTP + email activation)
3. Upload documents:
   - Certified ID/passport (+ work permit if foreign)
   - Proof of residential address
   - Certified SA driver’s license
   - Bank statement/details
   - Clear selfie
4. Driver profile enters **Pending** until:
   - Online training completed (link to external or in-app module)
   - All documents approved by back-office
5. Upon approval → Driver receives unique **Driver ID**

#### Linking

- Driver links to Vehicle using **Car ID + Number Plate**
- One driver can only be linked to one active vehicle at a time (MVP)

### 5.2 Authentication

- Login: Email (username) + Password
- Session management with auto-logout after inactivity
- Biometric login (optional, Phase 1.1)

### 5.3 Home Screen (After Login & Vehicle Linked)

- Daily earnings summary (today’s completed trips)
- Trips completed today
- **Big Go Online / Go Offline** toggle (with reason if going offline)
- Available driving hours timer (if regulatory limits apply)
- Quick access to: Profile, Documents, Earnings, Support

### 5.4 Ride Lifecycle (Core Workflow)

**States:**

1. **Idle (Online)**
2. **Ride Requested** → Show pickup, destination, estimated fare, estimated time, rider name, rider verified status, payment method
   - Accept → Move to **En Route to Pickup**
   - Decline → Auto go Offline + cooldown (configurable, default 2 min)
3. **En Route to Pickup**
   - Navigation instructions
   - **Arrived at Pickup** button (triggers 5-minute wait timer)
4. **At Pickup (Waiting)**
   - 5-minute window
   - Cancel before 5 min → Provide reason → Auto Offline
   - Cancel after 5 min → Allowed, reason required, continue online
5. **Trip In Progress**
   - Start Trip button (when rider in vehicle)
   - Real-time location sharing with rider
   - Rider can update destination → Driver receives alert
   - End Trip button (at final destination)
6. **Trip Completed**
   - Display final fare
   - If Cash: Show amount to collect
   - If Card/App: Show amount (no cash handling)
   - Rate rider (1-5 stars) + optional comment
   - Tip handling (cash only in MVP)
   - Return to Home

**Additional Rules:**

- Driver can receive “trip chaining” requests near current drop-off (notify rider they are en-route)
- All state transitions logged with timestamp, GPS, and actor

### 5.5 Profile & Documents

- View personal profile & linked vehicle
- Document status grid (Approved / Pending / Declined / Expired)
- Expiry warnings (push + in-app banner) 30, 14, 7, 3, 1 days before expiry
- Re-upload expired/declined documents
- Bank details update (with verification)

### 5.6 Payments & Earnings

- View trip-by-trip earnings breakdown
- Daily/weekly payout summary
- Manual payout request to linked bank (back-office processes)
- Visibility of payment method used by rider (for cash handling awareness)

---

## 6. Non-Functional Requirements

- **Platform:** Android (primary, South Africa focus) + iOS (Phase 1.2)
- **Offline Support:** Cache last known documents status, basic profile. Ride requests require online.
- **Performance:** Ride request notification < 3 seconds
- **Security:** OTP on sensitive actions, document encryption at rest, audit trail for all approvals
- **Compliance:** Full POPIA alignment, data minimization, consent flows
- **Localization:** English + isiXhosa/isiZulu support (Phase 1.1)
- **Notifications:** Firebase / OneSignal push + in-app

---

## 7. Edge Cases & Failure States

- Driver attempts to go online without approved vehicle/documents → Block + clear message
- Document expires while driver is online → Soft warning first, then force offline after grace period
- Rider cancels after driver arrived → Record as cancellation, apply fairness rules
- Network drop during trip → Allow driver to end trip manually with note
- Multiple drivers trying to link same vehicle → Back-office rule enforcement
- Fake GPS / location spoofing → Server-side validation + anomaly detection (future)

---

## 8. Risks & Mitigation

| Risk                                     | Likelihood | Impact | Mitigation                                                   |
| ---------------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Drivers operating with expired documents | High       | High   | Hard enforcement + expiry alerts + back-office dashboard     |
| Document fraud                           | Medium     | High   | Certified copies + manual back-office review + random audits |
| Low acceptance rate due to poor UX       | Medium     | High   | Simple accept/decline + clear fare & distance                |
| Cash handling disputes                   | Medium     | Medium | Clear payment method display + rating system                 |
| Driver churn due to payout delays        | Medium     | High   | Transparent earnings + fast back-office payout process       |

---

## 9. Dependencies

- Back-office web dashboard for document approval & user verification
- Rider App (for ride requests and matching logic)
- Mapping service (Google Maps / Mapbox)
- Payment gateway integration (for card/app wallet visibility)
- Notification service
- SMS/Email service for OTP and alerts

---

## 10. Phased Rollout

**MVP (Phase 1 – Launch in 1 Corridor)**

- All above features

**Phase 2 (within 3 months)**

- Driver media/ad-watching module (revenue share)
- In-app wallet for drivers (airtime top-up)
- Multi-language
- Advanced analytics for drivers

**Phase 3**

- Fleet management tools
- Dynamic incentives
- Driver training modules inside app

---

## 11. Open Questions / Assumptions

- Will drivers be able to register multiple vehicles? (Assumption: No in MVP)
- Exact payout cadence to driver bank account? (Recommend weekly)
- Will we enforce maximum daily driving hours? (Assumption: Soft warning only in MVP)
- Training module – in-app or external link? (Recommend simple checklist + video for MVP)
- How do we handle driver → rider messaging? (In-app chat or SMS fallback)

---

**Next Steps Recommendation:**

1. Validate this PRD with founder & operations team
2. Create detailed wireframes for core flows (Home → Ride Request → Trip Lifecycle)
3. Define exact data model & API contracts
4. Build Cursor-ready implementation prompts for Flutter/React Native module

This Driver App PRD is engineered for **fast pilot launch** while protecting the platform’s compliance moat and supply quality.

Ready for engineering handoff.
