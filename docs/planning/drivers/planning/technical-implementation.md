````markdown
# Technical Specification: Taxi Assist Driver App

**Document Type:** Technical Architecture & Implementation Spec  
**Product:** Taxi Assist – Driver Mobile Application (MVP)  
**Tech Stack:** Flutter (Frontend) + Supabase (Backend + Realtime + Auth + Storage)  
**Version:** 1.0  
**Date:** April 2026  
**Target:** Production-ready pilot in one South African corridor (e.g. Cradock area)

**Goal:** Deliver a compliant, real-time, scalable Driver App with minimal custom backend code while enforcing strict document compliance and trip state safety.

---

## 1. Architecture Overview

**High-Level Design (Client-Heavy with Supabase as Operating System)**

- **Frontend:** Flutter (single codebase for Android primary + iOS)
- **Backend:** Supabase (PostgreSQL + Realtime + Auth + Storage + Edge Functions)
  - No separate Node.js/Express server in MVP
  - All business logic enforced via Postgres functions, triggers, RLS policies, and Edge Functions where needed
- **Realtime Layer:** Supabase Realtime (Postgres Changes + Broadcast) for live trip tracking and ride requests
- **Maps:** Google Maps Flutter SDK + Geolocator (deep links for full navigation)
- **File Handling:** Supabase Storage (documents & vehicle photos)
- **Notifications:** Supabase Edge Functions + Firebase Cloud Messaging (FCM) or Supabase Realtime triggers

**Data Flow Philosophy**

- Driver actions → Direct Supabase calls (with RLS guarding everything)
- State changes → Postgres triggers + Realtime broadcast to Rider App and Back-office
- Location updates during trip → Every 3-5 seconds UPDATE on `trip_locations` or `driver_locations` table

---

## 2. Supabase Project Structure

### 2.1 Authentication

- Use Supabase Auth (Email + Password)
- Cellphone verification via custom Edge Function + OTP (Twilio or Clickatell integration recommended for SA)
- Email confirmation for activation
- JWT with custom claims: `driver_id`, `vehicle_id`, `role: 'driver'`

### 2.2 Database Schema (Key Tables)

```sql
-- Core Profiles
profiles (id UUID PK references auth.users, driver_id UUID unique, full_name, id_number, ... status text)
vehicles (vehicle_id UUID PK, registration_number unique, owner_type, make, model, category, status, linked_driver_id)
documents (document_id UUID PK, entity_type, entity_id, document_type, file_path, status, expiry_date, reviewed_by)

-- Trip Management
trips (
  trip_id UUID PK,
  rider_id UUID,
  driver_id UUID,
  vehicle_id UUID,
  status text CHECK (status in ('REQUESTED','ACCEPTED','EN_ROUTE_PICKUP','ARRIVED_PICKUP','IN_PROGRESS','COMPLETED','CANCELLED')),
  pickup_lat_lng geography(Point,4326),
  dropoff_lat_lng geography(Point,4326),
  estimated_fare decimal,
  final_fare decimal,
  payment_method text,
  started_at timestamptz,
  ended_at timestamptz
)

-- Live Location Tracking
trip_locations (
  id BIGSERIAL PK,
  trip_id UUID,
  driver_id UUID,
  lat_lng geography(Point,4326),
  speed decimal,
  recorded_at timestamptz DEFAULT now()
)

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
```
````

**Indexes & Performance**

- GIST index on geography columns for proximity queries
- Partial indexes on `trips(status)` and `documents(status, expiry_date)`

### 2.3 Row Level Security (RLS) Policies (Critical for Compliance)

```sql
-- Example Policies
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver can only see own trips" ON trips
  FOR ALL USING (driver_id = (SELECT driver_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Drivers can only update own location during active trip" ON trip_locations
  FOR INSERT USING (
    driver_id = (SELECT driver_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM trips WHERE trip_id = trip_locations.trip_id AND status = 'IN_PROGRESS')
  );
```

All sensitive tables (`documents`, `vehicles`, `profiles`) must have strict RLS. Back-office users get elevated policies via service_role key (Edge Functions only).

### 2.4 Storage Buckets

- `driver-documents` (private, RLS + signed URLs)
- `vehicle-photos` (private)

---

## 3. Flutter Architecture

**Folder Structure (Clean Architecture Inspired)**

```
lib/
├── core/                  # constants, themes, extensions, supabase client
├── features/
│   ├── auth/
│   ├── onboarding/        # driver + vehicle registration flows
│   ├── home/              # dashboard, go online/offline
│   ├── trip/              # request, lifecycle, map, live tracking
│   ├── profile/
│   ├── documents/
│   └── earnings/
├── shared/                # widgets, models, services
├── utils/                 # location service, permissions, validators
└── main.dart
```

**State Management:** Riverpod 2.0 (recommended for Supabase + Flutter)

**Key Packages (pubspec.yaml)**

```yaml
dependencies:
  flutter:
  supabase_flutter: ^2.5.0+
  google_maps_flutter: ^2.7.0+
  geolocator: ^12.0.0+
  flutter_polyline_points: ^2.0.0+
  riverpod_annotation: ^2.0.0+
  intl: ^0.19.0
  uuid: ^4.0.0
  image_picker: ^1.0.0
  file_picker: ^8.0.0 # for documents
  fluttertoast: ^8.0.0
  permission_handler: ^11.0.0
```

---

## 4. Core Features – Technical Implementation

### 4.1 Onboarding & Document Upload

- Multi-step form with progress
- Image/document capture → Upload to Supabase Storage → Insert record in `documents` table (status = PENDING)
- Back-office approval triggers Realtime update → Driver receives push/in-app notification

### 4.2 Go Online / Offline

- Button calls Supabase RPC or direct UPDATE on `profiles.online_status`
- Guard: Edge Function or Postgres trigger validates:
  - Driver APPROVED
  - Vehicle linked & APPROVED
  - No expired critical documents

### 4.3 Live Map & Real-Time Tracking (Driver Side)

**Implementation:**

1. On trip `ACCEPTED` → Subscribe to Realtime on `trips` and `trip_locations` for that `trip_id`
2. Use `geolocator` to get position every 3-5 seconds (foreground service on Android for reliability)
3. UPDATE `trip_locations` with new geography point (or dedicated `driver_current_location` table with upsert)
4. Map shows:
   - GoogleMap widget
   - Custom car marker (animated with marker rotation based on bearing)
   - Polyline to pickup / dropoff
   - Deep link button: `"google.navigation:q=${lat},${lng}"` for full turn-by-turn

**Battery & Data Optimization (South African Reality):**

- Adaptive interval (5s when moving > 10km/h, 15s when stopped)
- Batch updates if network poor
- Use `geolocator` `LocationAccuracy.bestForNavigation`

### 4.4 Trip State Machine

- Enforced primarily on Supabase backend via Postgres functions/triggers
- Flutter calls RPCs like `accept_ride(trip_id)`, `start_trip(trip_id)`, `end_trip(trip_id, final_distance)`
- Realtime subscription on `trips` table broadcasts status changes instantly to rider

**Example Trigger (simplified)**

```sql
CREATE OR REPLACE FUNCTION handle_trip_state_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify rider via broadcast or edge function
  PERFORM pg_notify('trip_events', json_build_object('trip_id', NEW.trip_id, 'status', NEW.status)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.5 Notifications

- Ride request → Supabase Realtime + FCM push
- Document expiry warnings → Daily Edge Function cron + in-app banner
- Trip updates → Realtime

---

## 5. Security & Compliance

- **RLS Everywhere:** No unauthenticated or cross-user access
- **Document Expiry Enforcement:** View + Trigger that forces `online_status = OFFLINE` when critical docs expire
- **Location Privacy:** Location data only written during active trip; deleted/archived after 30 days
- **POPIA Alignment:** Consent flags in profiles; data minimization
- **Anti-Fraud:** Rate limiting on location updates; GPS consistency checks via Edge Function

---

## 6. Performance & Scalability Considerations (MVP → Scale)

- Supabase free/pro tier sufficient for pilot (thousands of trips)
- Location table can grow fast → Partition by date or use time-series extension later
- Realtime limits: Monitor channel usage; fallback to polling in extreme cases
- Offline Support: Basic caching with Hive or Isar; queue location updates when offline

---

## 7. Testing Strategy

- Unit: Riverpod providers, location service
- Widget: Map rendering, form flows
- Integration: Supabase local + Flutter integration tests for full trip lifecycle
- E2E: Maestro or Appium for critical paths (online → accept → complete trip)

---

## 8. Deployment & CI/CD

- Flutter: Codemagic or GitHub Actions (Android APK + iOS)
- Supabase: Migrations via Supabase CLI (version control all schema + policies + functions)
- Environment: Separate Supabase projects (dev / staging / prod)

---

## 9. Open Technical Decisions & Risks

- **Maps Provider:** Google Maps (good SA coverage). Alternative: Mapbox if cost becomes issue.
- **Navigation:** Deep links first (fastest). Full embedded routing later.
- **OTP for Cellphone:** Edge Function calling South African SMS gateway (budget for this).
- **Back-Office Integration:** Separate Flutter Web or Supabase Dashboard + custom views for approvals.
- **Risk:** Realtime scale in rural areas with poor connectivity → Graceful degradation planned.

---

**Next Recommended Steps (Fastest Path to Ship)**

1. Set up Supabase project + enable PostGIS + Realtime
2. Implement Auth + RLS foundation (profiles, vehicles, documents)
3. Build core trip state machine + realtime subscription
4. Add map + location streaming
5. Onboarding flows last (after core loop works)


```
