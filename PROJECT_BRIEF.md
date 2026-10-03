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

- **Super Admin** — platform-level, not tenant-scoped. Manually creates a new tenant
  (agency) and its initial Owner account after confirming payment.
- **Agency Owner** — full tenant access: staff invites, CRM, analytics, billing /
  subscription status.
- **Office Staff** — tenant-scoped: manages customer requests, caregiver profile &
  portal login creation, smart matching, assignments, and replacement/backup
  coordination (previously split with Field Coordinator — now unified here).
- **Caregiver** — tenant-scoped, self-view only: sees their own current assignment,
  schedule, attendance check-in/out, payment/salary history, and document status.
  No visibility into other caregivers, customers, or agency data.
- **End Customer** (families) — no login; interacts only via the public "Request a
  Caregiver" form and WhatsApp.

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

## 4. Multi-Tenancy Architecture & Account Provisioning

- Single PostgreSQL database, shared schema.
- Every tenant-scoped table carries a `tenant_id` (agency_id) column.
- **Row-Level Security (RLS)** policies enforce tenant isolation at the
  database layer — not just app-layer `WHERE` clauses. A bug in the query
  layer should never be able to leak one agency's data to another.
  Caregivers are further restricted at the database/RLS layer to self-view
  only (`user_id` / linked caregiver ID).
- JWT payload carries `userId`, `tenantId`, and `role`. A NestJS guard/interceptor
  sets the Postgres session variables per request so RLS applies automatically.
- Tenant resolution: currently path-based (`/t/:tenantSlug/...`) on free-tier infrastructure without custom domain; automatically transitions back to subdomain-based routing (`agencyname.app.com`) once a custom domain with wildcard DNS is attached (see Section 8).
- **Account Provisioning Hierarchy (Strictly Top-Down — No Public Signup):**
  There is zero public signup anywhere on the platform. Accounts are created
  strictly from the top down:
  1. **Super Admin → Tenant + Owner:** Super Admin manually provisions a tenant
     and creates its primary Owner account after confirming payment out-of-band
     (direct phone call + GPay/bank transfer to direct account — no automated
     checkout flow, no Razorpay).
  2. **Owner → Office Staff:** Owner invites Office Staff via a single-use,
     expiring invite token bound to `tenant_id` + `role`. Tokens are delivered
     via WhatsApp link or a temporary login code.
  3. **Office Staff → Caregiver (Single Combined Action):** Office Staff creates
     Caregiver records. This is a single, combined action that creates the
     caregiver's complete profile data (name, phone, skills, experience,
     documents, etc.) AND their self-service portal login credentials / temporary
     access code at the same time. There is no separate "add profile" vs "invite
     to login" step.
  4. **Invite Tokens Table:** `invite_tokens` (`invite_token`, `tenant_id`, `role`,
     `expires_at`, `used_at`). Tokens must be random, non-sequential, single-use,
     and time-limited (e.g., 48 hours). Used for Owner and Office Staff onboarding;
     caregiver accounts are created directly by Office Staff rather than via a
     separate invite-acceptance step, though they may still use a token or
     temporary code as their first-login credential.
  5. **Public Website Surface:** The public website only exposes the "Request a
     Caregiver" intake form (for customers) and a login page. There is no public
     signup UI for agencies, staff, or caregivers.

## 5. Core Modules (in build order — see TASKLIST.md)

1. **Auth & Multi-Tenant Foundation** (RLS, 4 roles, invite tokens table,
   Super Admin manual tenant/owner provisioning, subdomain resolution)
2. **Caregiver Management** (single combined profile + login creation, CRUD,
   status board: Available / Assigned / On Leave / Inactive, profile fields,
   document upload, bulk import)
3. **Public Website + "Request a Caregiver" Form** + instant WhatsApp
   notification to agency owner
4. **Customer Management / CRM** (linked to intake requests and assignments)
5. **Smart Caregiver Matching** — location, gender, experience, availability
   filtering; **PostGIS spatial queries with a GiST index** for distance-aware
   results (no in-app haversine loops — won't scale past a few hundred rows)
6. **Attendance + Salary Management** (check-in/out capture, daily rate calculation,
   commission split, monthly reports)
7. **Caregiver Self-Service Portal** (PWA-installable, mobile-first, minimal UI:
   view current assignment, check-in/check-out feeding attendance, read-only
   salary/payment history, view certification/document status)
8. **Customer Feedback via WhatsApp** (post-job rating request, rolling average per
   caregiver)
9. **WhatsApp Automation for Lead Intake** (structured conversational form →
   auto-created request in admin dashboard)
10. **Replacement/Backup Caregiver Flow** (assignments history table with
    `replaced_by` reference, re-runs matching engine scoped to requirement,
    handled by Office Staff with SLA escalation to Owner)
11. **Owner Analytics Dashboard** (occupancy rate, average time-to-fill, revenue
    trend; backed by a materialized view refreshed on a schedule via BullMQ cron
    and cached in Redis, not computed live against transactional tables)

**Explicitly out of scope for v1** (dropped from consideration): auto-
generated service agreement PDFs, multi-language (Malayalam) WhatsApp
templates, public self-serve registration. Revisit later if a client asks.

## 6. Data Model — High-Level Entities

- `tenants` (agencies)
- `users` (Super Admin [system], Owner, Office Staff, Caregiver)
- `invite_tokens` (invite_token, tenant_id, role, expires_at, used_at)
- `caregivers` (tenant-scoped, linked to user account, includes geocoded location for matching)
- `customers` (tenant-scoped)
- `requests` (public form + WhatsApp-originated leads)
- `assignments` (history table: caregiver ↔ customer, status, replaced-by reference)
- `attendance` (check-in/check-out per assignment per day)
- `payments` (computed from attendance: gross, commission, net)
- `feedback` (rating + comment, linked to assignment)
- `documents` (caregiver certifications/IDs, with expiry dates, stored in object storage)

## 7. Non-Functional Requirements

- **Scale:** must comfortably handle 20 tenants, 4,000+ caregiver rows, concurrent
  office-staff usage per agency — index all tenant-scoped foreign keys and the
  PostGIS location column.
- **Data sensitivity:** patient records include age and health condition for
  elderly/vulnerable individuals who are not the agency's own staff. Encrypt
  documents at rest, restrict patient medical detail visibility by role (Caregiver
  sees only their assigned patient's necessary details), and keep this in mind as
  a data-processor obligation, not just a technical nice-to-have.
- **WhatsApp costs:** official Cloud API pricing is per 24-hour conversation window
  and varies by message category (utility vs marketing) — this is a recurring cost
  that should be reflected in agency subscription pricing, not absorbed silently.
- **Billing:** out-of-band manual billing (phone call + GPay / bank transfer verified
  by Super Admin before tenant activation / renewal; no self-service checkout or
  Razorpay integration).
- **PWA:** installable, offline-capable shell, web push notifications for new leads /
  replacement SLA alerts for Owner/Staff, and ultra-simple mobile PWA interface
  for Caregiver self-service.

## 8. Deployment & Free-Tier Infrastructure

To validate the product and secure the first paying client with zero fixed monthly infrastructure overhead, the platform is configured for free-tier cloud deployment:

### Free-Tier Stack Architecture
- **Backend API & Queue Workers (Render):**
  - NestJS API running on Render's free web service tier.
  - Reads `PORT` dynamically from Render's runtime environment (listens on `0.0.0.0`).
  - BullMQ background workers run in-process with the API server to avoid the cost of an independent background worker instance.
  - Exposes `GET /health` (and `GET /api/health`) returning `200 OK` for platform health checks and keep-alive pings.
  - Build command: `npm install && npm run build`
  - Start command: `npm run start:prod` (configured in `package.json` and `render.yaml`).
- **Database (Neon PostgreSQL):**
  - Serverless PostgreSQL with native `postgis` spatial extension enabled.
  - Connected via `DATABASE_URL` with SSL connection pooling (`sslmode=require`, `rejectUnauthorized: false`).
  - Full Row-Level Security (RLS) enforcement and migrations executed seamlessly via `npm run migration:run`.
- **Background Queue & Cache (Upstash Redis):**
  - Serverless Redis instance connected via TLS (`REDIS_URL`, `rediss://...`).
  - Powers BullMQ job queues (WhatsApp lead ingestion, analytics cron refresh) and Redis caching for the owner analytics materialized view.
- **Object Storage (Cloudflare R2):**
  - S3-compatible storage for caregiver certifications, ID proofs, and compliance documents.
  - Zero egress fees. Configured via `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`.
- **Frontend PWA (Vercel):**
  - Next.js web application deployed on Vercel's free hobby tier.
  - PWA manifest (`manifest.json`) and service worker (`sw.js`) operate natively on `*.vercel.app` subdomains.
  - Backend API base URL configured dynamically via `NEXT_PUBLIC_API_URL`.
- **Keep-Alive & Monitoring (UptimeRobot):**
  - Configured to ping `GET /health` on the Render backend every 5 minutes to prevent the free instance from spinning down due to inactivity.

### Tenant Resolution — Path-Based Routing & Migration Path
- **Free-Tier Constraint:** Free hosting domains (such as `*.vercel.app` and `*.onrender.com`) do not permit wildcard subdomains (`*.domain.com`).
- **Path-Based Routing:** Tenant resolution is temporarily adapted from subdomain-based (`agencyname.app.com`) to path-based (`/t/:tenantSlug/...`).
  - Next.js edge middleware transparently rewrites `/t/:tenantSlug/*` to internal application routes while retaining the path in the user's browser and injecting the `x-tenant-slug` header.
  - NestJS middleware resolves the tenant via `tenant_slug` (or URL path / header) and attaches the tenant context before rewriting the request URL to standard API endpoints.
  - The `tenants` table includes a dedicated, indexed `tenant_slug` column.
  - **Isolation Guarantee:** The underlying multi-tenant architecture remains 100% identical. PostgreSQL Row-Level Security (RLS), tenant session parameters (`app.current_tenant_id`), and all database relationships are strictly anchored to the immutable `tenant_id` UUID.
- **Custom Domain Switch (Future):** Once the agency acquires a custom domain (e.g., `caregiverplatform.com`) with wildcard DNS (`*.caregiverplatform.com`), the routing layer will revert directly to subdomain resolution without requiring any schema migrations or database changes.

### WhatsApp Integration — Test Mode Limitations & Production Transition
- **Current Mode:** Configured for Meta's WhatsApp Business Cloud API Test Mode.
  - Uses Meta's sandbox test phone number.
  - Outbound messaging is restricted to up to 5 verified recipient phone numbers added in the Meta Developer Portal.
  - Inbound webhook verification handled via `WHATSAPP_WEBHOOK_VERIFY_TOKEN` and authenticated via `WHATSAPP_ACCESS_TOKEN`.
  - Does not require upfront Meta Business Verification or WhatsApp display name review.
- **Commercial Production Transition:**
  - Before onboarding real agency customers and public care recipients, the platform must be registered with a verified Meta Business Manager account.
  - A dedicated permanent phone number (clean SIM or virtual DID) must be acquired and registered as an official WhatsApp Business phone number.
  - Production WhatsApp message templates (for notifications, replacement SLAs, and feedback) must be submitted for Meta approval.