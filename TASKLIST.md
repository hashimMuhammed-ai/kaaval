# Caregiver Agency Platform — Task List

Each phase should be independently demoable before moving to the next.

## Phase 1 — Multi-tenant Foundation
- [x] Nx monorepo scaffolding (NestJS API + Next.js frontend)
- [x] Postgres schema: `tenants`, `users` with roles (owner/staff/
      coordinator)
- [ ] Row-Level Security policies on all tenant-scoped tables
- [ ] JWT auth with `tenantId` + `role` claims
- [ ] NestJS guard/interceptor to set Postgres session var per request
- [ ] Subdomain-based tenant resolution
- [ ] PWA shell: manifest.json, service worker, install prompt, offline
      fallback page

## Phase 2 — Caregiver Management
- [ ] `caregivers` table (full profile fields per brief)
- [ ] Status board UI: Available / Assigned / On Leave / Inactive
- [ ] Document upload to object storage (certifications, ID proof)
- [ ] CSV bulk-import for agencies with existing staff lists

## Phase 3 — Public Site + WhatsApp Enquiry
- [ ] Public marketing pages (services list, about, contact)
- [ ] "Request a Caregiver" form (service type, location, duration,
      gender preference, start date, phone)
- [ ] WhatsApp Business Cloud API setup (Meta app review, phone number
      verification — start this early, approval can take days)
- [ ] Instant WhatsApp notification to agency owner on form submit
- [ ] Form submission creates a `requests` row in the admin dashboard

## Phase 4 — Customer CRM
- [ ] `customers` table linked to `requests`
- [ ] Customer detail view: patient info, requirement, assigned
      caregiver, status
- [ ] Customer list view with status filter (Active / Pending)

## Phase 5 — Smart Matching Engine
- [ ] Enable PostGIS extension; geocode caregiver addresses on create
- [ ] GiST spatial index on caregiver location
- [ ] Matching query: location radius + gender + experience/skill +
      availability filters
- [ ] Match results UI showing distance, experience, availability

## Phase 6 — Attendance + Salary
- [ ] Check-in/check-out capture (mobile-friendly, per assignment/day)
- [ ] Daily rate configuration per caregiver
- [ ] Monthly calculation: days worked, gross, commission split, net
      payout
- [ ] Exportable monthly salary/payment report

## Phase 7 — Feedback Loop
- [ ] Post-assignment-completion WhatsApp rating request
- [ ] Store rating + optional comment linked to assignment
- [ ] Rolling average rating + jobs-completed count per caregiver

## Phase 8 — WhatsApp Lead Automation
- [ ] Conversational intake flow (service, location, duration, patient
      age, gender preference, start date) via WhatsApp
- [ ] Auto-create `requests` row from completed conversation
- [ ] Push/WhatsApp alert to admin for new auto-captured lead

## Phase 9 — Replacement / Backup Flow
- [ ] Model `assignments` as a history table with `replaced_by`
      reference (not a single "current caregiver" pointer)
- [ ] "Find replacement" action re-runs Phase 5 matching engine scoped to
      the same requirement
- [ ] SLA timer: escalate to owner via WhatsApp/push if unresolved within
      the configured window
- [ ] Capture absence reason (leave / quit / complaint) for context

## Phase 10 — Owner Analytics Dashboard
- [ ] Materialized view: occupancy rate, average time-to-fill, revenue
      trend
- [ ] BullMQ scheduled job to refresh the materialized view
- [ ] Redis cache layer for dashboard queries (short TTL)
- [ ] Dashboard UI (charts for the metrics above)

## Cross-cutting (ongoing throughout)
- [ ] Document expiry tracking (optional — revisit if a client asks)
- [ ] Role-based access refinement (owner/staff/coordinator visibility)
- [ ] Subscription billing integration (Razorpay)
- [ ] Data encryption at rest for patient/health-related fields