# Caregiver Agency Platform — Project Brief

## 1. Overview

A multi-tenant SaaS platform for home-nursing / caregiver agencies to manage
their public-facing enquiry intake, caregiver workforce, customer
relationships, attendance/payroll, and WhatsApp-based communication — all
from one login, installable as a PWA on the agency owner's phone.

This is a **commercial product**, not a portfolio piece. Target: 20 paying
agency accounts, 4,000+ caregiver records, growing. Design every module
assuming this volume from day one — no shortcuts that only work for a demo.

## 2. Target Users

- **Agency owner** — full access, sees dashboard/analytics, manages staff
  accounts, billing.
- **Office staff** — views/assigns caregivers, manages customer requests,
  no billing access.
- **Field coordinator** (mobile-first) — sees only their assigned
  caregivers/customers, marks attendance, handles replacements.
- **End customer** (families) — no login; interacts only via the public
  "Request a Caregiver" form and WhatsApp.

## 3. Tech Stack

- **Backend:** NestJS + TypeScript, PostgreSQL (with PostGIS extension),
  Redis, BullMQ for background jobs
- **Frontend:** Next.js + React, installable as a PWA (service worker,
  manifest, offline shell caching, web push notifications)
- **Infra:** Nx monorepo (consistent with existing project conventions)
- **Messaging:** WhatsApp Business Cloud API (official Meta API — not an
  unofficial wrapper, to avoid number bans at this scale)
- **File storage:** S3-compatible object storage for caregiver documents
- **Maps/Geocoding:** PostGIS + a geocoding provider for Kerala addresses

## 4. Multi-Tenancy Architecture

- Single PostgreSQL database, shared schema.
- Every tenant-scoped table carries a `tenant_id` (agency_id) column.
- **Row-Level Security (RLS)** policies enforce tenant isolation at the
  database layer — not just app-layer `WHERE` clauses. A bug in the query
  layer should never be able to leak one agency's data to another.
- JWT payload carries `tenantId` + `role`. A NestJS guard/interceptor sets
  the Postgres session variable per request so RLS applies automatically.
- Tenant resolution via subdomain (e.g. `agencyname.app.com`) — feels more
  product-like than path-based routing if this is sold as a branded tool.

## 5. Core Modules (in build order — see TASKLIST.md)

1. Auth + multi-tenant scaffolding (RLS, roles, subdomain resolution)
2. Caregiver management (CRUD, status board: Available / Assigned / On
   Leave / Inactive; profile fields per original spec — photo, phone,
   address, age, gender, experience, skills, certifications, languages,
   preferred locations, availability, expected salary, documents, current
   & previous assignments)
3. Public website + "Request a Caregiver" form + instant WhatsApp
   notification to the agency owner
4. Customer management / CRM (linked to intake requests and assignments)
5. Smart caregiver matching — location, gender, experience, availability
   filtering; **PostGIS spatial queries with a GiST index** for
   distance-aware results (no in-app haversine loops — won't scale past a
   few hundred rows)
6. Attendance + salary management (check-in/out, daily rate calculation,
   commission split, monthly reports)
7. Customer feedback via WhatsApp (post-job rating request, rolling
   average per caregiver)
8. WhatsApp automation for lead intake (structured conversational form →
   auto-created request in the admin dashboard)
9. **Replacement/backup caregiver flow** — assignments modeled as a
   history table (not just a "current caregiver" pointer), re-runs the
   matching engine scoped to the same requirement, SLA timer escalates to
   the owner if no replacement is found within a defined window
10. **Owner analytics dashboard** — occupancy rate, average time-to-fill,
    revenue trend; backed by a materialized view refreshed on a schedule
    (BullMQ cron) and cached in Redis, not computed live against
    transactional tables

**Explicitly out of scope for v1** (dropped from consideration): auto-
generated service agreement PDFs, multi-language (Malayalam) WhatsApp
templates. Revisit later if a client asks.

## 6. Data Model — High-Level Entities

- `tenants` (agencies)
- `users` (owner / office staff / field coordinator, tenant-scoped)
- `caregivers` (tenant-scoped, includes geocoded location for matching)
- `customers` (tenant-scoped)
- `requests` (public form + WhatsApp-originated leads)
- `assignments` (history table: caregiver ↔ customer, status, replaced-by
  reference)
- `attendance` (check-in/check-out per assignment per day)
- `payments` (computed from attendance: gross, commission, net)
- `feedback` (rating + comment, linked to assignment)
- `documents` (caregiver certifications/IDs, with expiry dates, stored in
  object storage)

## 7. Non-Functional Requirements

- **Scale:** must comfortably handle 20 tenants, 4,000+ caregiver rows,
  concurrent office-staff usage per agency — index all tenant-scoped
  foreign keys and the PostGIS location column.
- **Data sensitivity:** patient records include age and health condition
  for elderly/vulnerable individuals who are not the agency's own staff.
  Encrypt documents at rest, restrict patient medical detail visibility by
  role, and keep this in mind as a data-processor obligation, not just a
  technical nice-to-have.
- **WhatsApp costs:** official Cloud API pricing is per 24-hour
  conversation window and varies by message category (utility vs
  marketing) — this is a recurring cost that should be reflected in
  agency subscription pricing, not absorbed silently.
- **Billing:** subscription billing per agency (Razorpay recurring is the
  standard India-first choice).
- **PWA:** installable, offline-capable shell, web push notifications for
  new leads/replacement SLA alerts — critical since owners will use this
  primarily from their phones.