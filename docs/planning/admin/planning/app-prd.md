**PRD & Technical Specification: Trip Admin Platform**

**Version:** 1.0  
**Date:** 07 May 2026  
**Author:** Principal Product Architect  
**Product:** Trip Admin Console (Internal Tool)  
**Target Users:** Operations, Compliance, Finance, Ad Managers, Support, Super Admins

---

### 1. Business Objectives

- Build a secure, real-time internal admin platform that gives full visibility and control over the Trip ecosystem (Riders, Drivers, Vehicles, Trips, Wallets, Ads).
- Enable fast verification, fraud mitigation, and operational efficiency critical for launch in South Africa.
- Support compliance-heavy processes (document expiry, KYC, POPIA).
- Provide powerful ad campaign management for Taxi Assist Media revenue stream.
- Minimize operational headcount while maximizing platform safety and monetization.

**Success Metrics (MVP)**

- 95% of document verifications completed within 24 hours
- < 2% fraud rate on trips
- Full audit trail on all financial and status changes
- Admin team can handle 500+ daily verifications and live trip oversight

---

### 2. Scope & User Roles

**In Scope**

- Authentication & Role-Based Access Control (RBAC)
- Dashboard & Analytics
- Rider / Driver / Vehicle Management & Verification
- Document Management & Expiry Handling
- Trip Monitoring & Intervention
- Wallet & Financial Operations
- Ad Campaign Management (Taxi Assist Media)
- Support Ticketing & Communication
- Audit Logging

**Out of Scope (Phase 1)**

- Advanced BI reporting (use Supabase + external tools)
- Driver training module
- Public-facing rider/driver apps (separate products)

**Admin Roles & Permissions (RBAC)**

- **SuperAdmin**: Full access
- **Compliance**: Document & profile approvals, flags
- **Operations**: Trips, drivers online, interventions
- **Finance**: Wallets, payouts, reconciliations, advertiser credits, rider reward freeze/reverse
- **AdManager**: Creative moderation, campaign oversight, Trip Media analytics + settings
- **Support**: Tickets + messaging
- **FraudAnalyst**: Fraud signal triage, reward freezes, escalation to Super Admin

The complete capability matrix (per-role, per-action) lives in `user-roles-and-permissions.md`. The capability list is defined in code at `apps/admin_app/lib/permissions.ts`.

---

### 3. Core Features & Workflows

#### 3.1 Dashboard

- Live KPIs: Active trips, online drivers, pending verifications, today’s revenue, ad views
- Map view of active trips
- Quick actions (pending items)

#### 3.2 User & Entity Management

- Searchable tables for Riders, Drivers, Vehicles, Companies
- Detailed profile views (documents, trip history, wallet ledger, emergency contacts)
- Status management (Suspend, Ban, Verify)
- Bulk actions (export, flag)

#### 3.3 Document Verification Queue

- Prioritized queue with filters (expiry soon, high-risk, etc.)
- Side-by-side document viewer + approval/rejection with mandatory notes
- Auto-expiry detection + notifications
- Version history for re-uploads

#### 3.4 Trip Management

- Live trip tracking (status, location, ETA)
- Manual intervention (cancel, adjust fare – audited)
- Dispute resolution workflow
- Historical search & export

#### 3.5 Wallet & Finance

- Ledger view per user
- Manual adjustments (with reason + approval)
- Driver payout processing (upload proof of payment)
- Cash trip reconciliation

#### 3.6 Taxi Assist Media (Ads)

- Campaign creation: upload video, targeting (time, geo, driver category), max views, reward per view
- Performance dashboard (views, completion rate, revenue)
- Targeting rules engine

#### 3.7 Support & Communication

- In-app ticket system
- Direct messaging to riders/drivers
- Template library

#### 3.8 Reporting & Audit

- Activity logs (immutable)
- Exportable reports (CSV/Excel)

---

### 4. Non-Functional Requirements

- Real-time updates (new requests, trip changes, document uploads)
- Responsive design (desktop-first, tablet support)
- Strong security & auditability
- Offline resilience where possible
- Performance: < 2s load for major tables (pagination + indexing)
- Scalable to 10k+ daily active users (riders/drivers)

**Compliance & Security**

- POPIA compliant data handling
- Full audit trail on all mutations
- Secure file storage for documents
- Rate limiting & anomaly detection

---

### 5. Assumptions & Dependencies

- Supabase project already set up or will be provisioned
- Payment gateway and mapping APIs available via backend services
- South African phone/OTP provider integrated
- File storage via Supabase Storage

**Risks & Mitigations**

- Document fraud → OCR + manual review + periodic re-verification
- Admin abuse → Strict RBAC + audit logs
- Data growth → Proper indexing + archiving strategy

---

## Tech Stack Document

**Primary Stack: Next.js + Supabase (Fullstack)**

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS + shadcn/ui + Radix primitives
- **State Management**: React Server Components + TanStack Query (for client data)
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table v8
- **Real-time**: Supabase Realtime + Subscriptions
- **File Upload**: Supabase Storage with resumable uploads
- **Maps**: Leaflet or Mapbox (TBD based on cost)
- **Charts**: Tremor or Recharts
- **Auth**: Supabase Auth (with Row Level Security)

### Backend / Database

- **Database**: Supabase Postgres (with pg_cron, triggers, RLS)
- **Auth & Authorization**: Supabase Auth + Custom RBAC tables + Policies
- **Storage**: Supabase Storage (documents, car photos, ad videos)
- **Functions**: Supabase Edge Functions (for webhooks, heavy computations, payouts)
- **Realtime**: Supabase Broadcast + Presence (online drivers)

### Architecture Highlights

- Monorepo (Turborepo recommended)
- Server-first approach (Server Components + Server Actions)
- Heavy use of Database views, materialized views, and triggers for complex logic (verifications, expiry, balances)
- Row Level Security (RLS) as primary authorization layer
- Event-driven patterns via Postgres triggers + Supabase Functions

### Key Tables (High-Level)

- `profiles` (riders + drivers unified with type)
- `vehicles`, `vehicle_documents`, `driver_documents`
- `trips`, `trip_events` (audit)
- `wallets`, `wallet_transactions`
- `ad_campaigns`, `ad_views`
- `creative_categories`, `ad_creatives`
- `ad_fraud_signals`, `ad_reward_holds`
- `trip_media_settings`, `admin_report_runs`
- `vw_trip_media_overview`, `vw_fraud_candidates` (views for admin KPIs)
- `admin_users`, `admin_roles`, `audit_logs`
- `support_tickets`

### Development & Deployment

- **Local**: Supabase CLI + Docker
- **Hosting**: Vercel (Frontend + Edge Functions) + Supabase Hosted
- **CI/CD**: GitHub Actions
- **Testing**: Jest + React Testing Library + Playwright (E2E)
- **Monitoring**: Supabase logs + Vercel Analytics + Sentry
- **Code Quality**: ESLint, Prettier, TypeScript, Husky

### Security & Compliance Features

- RLS policies on every sensitive table
- Signed URLs for document access
- Audit log trigger on all mutations
- OTP + MFA for admin login (via Supabase)
- Input validation + sanitization (Zod)

---

### Phase 1 Delivery (MVP – 6-8 weeks)

1. Auth + RBAC
2. Dashboard + User Management
3. Document Verification Queue
4. Trip Monitoring
5. Basic Wallet View
6. Audit Logging

**Subsequent Phases**

- Finance & Payouts
- Full Ad Management
- Advanced Analytics
- Mobile-responsive optimizations

### Trip Media console (May 2026)

The Trip Media admin console is now live in the same Next.js app under two parents:

- `/creatives` and `/ads` for creative moderation and campaign oversight (existing URLs preserved).
- `/trip-media/overview`, `/trip-media/advertisers`, `/trip-media/rider-rewards`, `/trip-media/fraud`, `/trip-media/analytics`, `/trip-media/reports`, `/trip-media/settings`.

It introduces a `fraud_analyst` role and a richer capability matrix (see `user-roles-and-permissions.md`). All money-affecting actions go through `SECURITY DEFINER` RPCs that re-check role and write to `audit_logs`. Reports stream CSV inline through `/api/trip-media/reports/[kind]`, and every download is recorded in `admin_report_runs`. Schema changes (new tables, enum extensions, views, RPCs) are documented in `data-model-and-app-entities.md` §11.

---

**Recommendations for Fast Execution**

1. Start with Supabase schema + RLS design (most important foundation)
2. Use shadcn/ui + Tailwind for rapid UI development
3. Implement core entities first, then real-time subscriptions
4. Build verification workflow as the highest priority feature

This PRD + Tech Stack is ready for immediate handoff to engineering. I can now generate:

- Full Supabase schema (SQL)
- Cursor-ready implementation prompts (module by module)
- API / Service layer spec
- UI component breakdown

What would you like next?
