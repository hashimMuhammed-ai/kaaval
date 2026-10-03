# Caregiver Agency Platform — Task List

Each phase should be independently demoable before moving to the next.

## Phase 1 — Multi-tenant Foundation & Account Provisioning
- [x] Nx monorepo scaffolding (NestJS API + Next.js frontend)
- [x] Update Postgres schema: 4 roles (`super_admin`, `owner`, `office_staff`, `caregiver`), `tenants`, `users`, and `invite_tokens` table
- [x] Super Admin manual tenant & Owner provisioning flow (out-of-band payment confirmation, no public signup)
- [x] Single-use, expiring invite token infrastructure for Owner/Office Staff (`invite_tokens`: token, tenant_id, role, expires_at, used_at) delivered via WhatsApp link / temporary login code
- [x] Row-Level Security policies on all tenant-scoped tables (with self-view isolation for caregivers)
- [x] JWT auth with `userId`, `tenantId`, and `role` claims
- [x] NestJS guard/interceptor to set Postgres session vars per request
- [x] Subdomain-based tenant resolution
- [x] Public site entrypoints: "Request a Caregiver" form and login page only (no public registration UI)
- [x] PWA shell: manifest.json, service worker, install prompt, offline fallback page

## Phase 2 — Caregiver Management
- [x] Combined caregiver profile + login creation: single action creating full profile data (name, phone, skills, experience, documents, etc.) AND self-service portal user account/temporary credentials
- [x] `caregivers` table (full profile fields per brief, linked to user account)
- [x] Status board UI: Available / Assigned / On Leave / Inactive
- [x] Document upload to object storage (certifications, ID proof)
- [x] CSV bulk-import for agencies with existing staff lists

## Phase 3 — Public Site + WhatsApp Enquiry
- [x] Public marketing pages (services list, about, contact)
- [x] "Request a Caregiver" form (service type, location, duration, gender preference, start date, phone)
- [x] WhatsApp Business Cloud API setup (Meta app review, phone number verification — start this early, approval can take days)
- [x] Instant WhatsApp notification to agency owner on form submit
- [x] Form submission creates a `requests` row in the admin dashboard

## Phase 4 — Customer CRM
- [x] `customers` table linked to `requests`
- [x] Customer detail view: patient info, requirement, assigned caregiver, status
- [x] Customer list view with status filter (Active / Pending)

## Phase 5 — Smart Matching Engine
- [x] Enable PostGIS extension; geocode caregiver addresses on create
- [x] GiST spatial index on caregiver location
- [x] Matching query: location radius + gender + experience/skill + availability filters
- [x] Match results UI showing distance, experience, availability

## Phase 6 — Attendance + Salary
- [x] Check-in/check-out backend & data model (per assignment/day)
- [x] Daily rate configuration per caregiver
- [x] Monthly calculation: days worked, gross, commission split, net payout
- [x] Exportable monthly salary/payment report for Owner and Office Staff

## Phase 7 — Caregiver Self-Service Portal
- [x] Minimal, mobile-first PWA interface for Caregiver role (lowest privilege)
- [x] Current assignment view (customer name, care location, schedule)
- [x] One-tap attendance check-in / check-out (feeds attendance table)
- [x] Read-only salary and payment history view (computed from attendance)
- [x] Document & certification status view (uploaded documents, expiry dates)

## Phase 8 — Feedback Loop
- [x] Post-assignment-completion WhatsApp rating request
- [x] Store rating + optional comment linked to assignment
- [x] Rolling average rating + jobs-completed count per caregiver

## Phase 9 — WhatsApp Lead Automation
- [x] Conversational intake flow (service, location, duration, patient age, gender preference, start date) via WhatsApp
- [x] Auto-create `requests` row from completed conversation
- [x] Push/WhatsApp alert to admin for new auto-captured lead

## Phase 10 — Replacement / Backup Flow
- [x] Model `assignments` as a history table with `replaced_by` reference (not a single "current caregiver" pointer)
- [x] Office Staff "Find replacement" action re-running Phase 5 matching engine scoped to same requirement
- [x] SLA timer: escalate to Owner via WhatsApp/push if unresolved within configured window
- [x] Capture absence reason (leave / quit / complaint) for context

## Phase 11 — Owner Analytics Dashboard
- [x] Materialized view: occupancy rate, average time-to-fill, revenue trend
- [x] BullMQ scheduled job to refresh the materialized view
- [x] Redis cache layer for dashboard queries (short TTL)
- [x] Dashboard UI (charts for the metrics above)

## Phase 12 — Mobile-First Office Staff & Agency Owner Experience
- [x] Adaptive Navigation & Mobile Shell: Responsive top app bar, mobile bottom tab bar (Requests, Caregivers, Matching, CRM, More), and slide-out mobile drawer for secondary views (`dashboard/layout.tsx`)
- [x] Care Requests Mobile Card Feed: Responsive table-to-card toggle, 1-tap Call (`tel:...`) & WhatsApp actions, swipeable horizontal status filter chips (`dashboard/requests/page.tsx`)
- [x] Caregivers Roster Mobile Cards & Quick Dial: Touch cards with skills badges, 1-tap Call/WhatsApp, and persistent `+ Add Caregiver` Floating Action Button (`dashboard/caregivers/page.tsx`)
- [x] Touch-Friendly Smart Matching Engine: Thumb-friendly distance radius slider and touch filter chips, mobile match result cards with 1-tap assign (`dashboard/matching/page.tsx`)
- [x] Mobile Forms & Document Capture: Single-column responsive layout for caregiver onboarding, native camera/gallery document upload triggers, 44px+ touch targets

## Cross-cutting (ongoing throughout)
- [x] Document expiry tracking
- [ ] Four-role access refinement (Super Admin / Owner / Office Staff / Caregiver visibility & permissions)
- [ ] Manual subscription billing & renewal tracking (Super Admin out-of-band payment recording)
- [ ] Data encryption at rest for patient/health-related fields

## Free-Tier Deployment & Cloud Readiness
- [x] Environment configuration templates (`.env.example`, `apps/api/.env.example`, `apps/web/.env.example`)
- [x] Migration and entity support for `tenant_slug` on `tenants` table (`018_add_tenant_slug.sql`)
- [x] Path-based tenant resolution (`/t/:tenantSlug/...` on frontend Next.js rewrite, `/api/t/:tenantSlug/...` & `x-tenant-slug` header on NestJS backend)
- [x] Cloudflare R2 S3-compatible client storage configuration with zero egress fees
- [x] Backend Render preparation: dynamic `PORT`, `0.0.0.0` host binding, `GET /health` endpoint (bypassing global prefix), in-process BullMQ execution, `render.yaml` blueprint, `start:prod` npm script
- [x] Frontend Vercel preparation: PWA `manifest.json` and service worker compatibility on `*.vercel.app`, configurable `NEXT_PUBLIC_API_URL`, `vercel.json` build config
- [x] WhatsApp Business Cloud API test mode handling and recipient verification workflow
- [x] Deployment documentation in `PROJECT_BRIEF.md` and manual dashboard configuration runbook