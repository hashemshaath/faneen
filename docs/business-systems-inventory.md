# Business Systems Inventory

_BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase A._

Source of truth for every business system implemented in Qitaat. Discovered
by enumerating `src/modules/**`, `src/pages/**`, and existing audit docs
(`docs/workflow-architecture.md`, `docs/workflow-map.md`,
`docs/database-inventory.md`, `docs/edge-function-inventory.md`).

Status legend: **Live** (in production use) · **Pilot** (gated, real-data
capable) · **Scaffold** (module exists, partial UI) · **Deferred** (out of
scope for v1.0).

| # | System | Module(s) | Primary Routes | Key DB Objects | Owner Role | Status |
|---|--------|-----------|----------------|----------------|------------|--------|
| 1  | Identity & Roles          | `identity`, `auth`                       | `/auth`, `/dashboard/profile`, `/admin/users`           | `auth.users`, `profiles`, `user_roles`, `has_role` RPC                | Admin                    | Live    |
| 2  | Businesses (Directory)    | `businesses`                             | `/businesses`, `/business/:slug`, `/dashboard/business` | `businesses`, `business_branches`, `business_internal_notes`          | Provider Owner / Admin   | Live    |
| 3  | Provider Directory (Public) | `businesses`, `search`, `seo`          | `/sectors/*`, `/q/:slug`, `/search`                     | `businesses` (public view), `business_categories`                     | Public                   | Live    |
| 4  | Provider Review           | `admin`, `businesses`                    | `/admin/provider-review`                                | `businesses.status`, `business_review_log`                            | Admin                    | Live    |
| 5  | Memberships & Credits     | `memberships`, `credits`                 | `/dashboard/membership`, `/admin/memberships`           | `memberships`, `membership_tiers`, `provider_lead_credit_*`           | Provider / Admin         | Live    |
| 6  | Leads                     | `leads`                                  | `/dashboard/leads`, `/admin/leads`                      | `leads`, `lead_events`, `lead_revealed_contacts`                      | Provider / Admin         | Live    |
| 7  | Quote Requests (RFQs from Customers) | `quotes`                      | `/quote`, `/admin/quote-requests`                       | `quote_requests`, `quote_request_files`, `quote_request_events`       | Customer / Admin         | Live    |
| 8  | Quotations                | `quotes`, `contracts`                    | `/dashboard/quotes`                                     | `quotes`, `quote_items`, `quote_signatures`                           | Provider                 | Live    |
| 9  | Contracts                 | `contracts`                              | `/dashboard/contracts/*`                                | `contracts`, `contract_items`, `contract_amendments`, `contract_payments` | Provider / Customer  | Live    |
| 10 | Work Orders               | `workOrders`                             | `/dashboard/work-orders/*`, `/dashboard/work-orders/board` | `work_orders`, `work_order_stage_history`, `work_order_comments`   | Provider Staff           | Live    |
| 11 | Measurements & BOQ        | `workOrders` (lib)                       | `/dashboard/work-orders/:id/measurements`               | `work_order_measurements`, `work_order_boq`                           | Provider Staff           | Live    |
| 12 | Production Board          | `workOrders`                             | `/dashboard/work-orders/board`                          | (view over `work_orders`)                                             | Provider Staff           | Live    |
| 13 | Procurement (RFQ → Award) | `procurement`, `rfq`                     | `/dashboard/procurement/*`                              | `procurement_requests`, `procurement_rfqs`, `procurement_rfq_items`, `procurement_supplier_quotes`, `procurement_supplier_quote_items` | Provider Staff | Live |
| 14 | Supplier Quotes (internal) | `procurement`                           | `/dashboard/procurement/rfq/:id`                        | `procurement_supplier_quotes(_items)`                                 | Provider Staff           | Live    |
| 15 | Purchase Orders           | `procurement` (handoff only)             | (work-order comment handoff)                            | (no dedicated PO table — handoff to WO)                               | Provider Staff           | Scaffold |
| 16 | Installation Appointments | `installationAppointments`               | `/dashboard/installations`                              | `installation_appointments`, `installation_appointment_events`        | Provider Staff / Customer | Live   |
| 17 | Customer Tracking         | `customerTracking`                       | `/customer/track/:token`, `/dashboard/customer-experience` | `customer_tracking_sessions`, `customer_tracking_events`            | Customer / Provider      | Live    |
| 18 | Project Closure           | `projectClosure`                         | `/dashboard/contracts/:id/closure`                      | `project_closures`, `project_closure_items`                           | Provider / Customer      | Live    |
| 19 | Warranty                  | `projectClosure` (warranty submodule)    | `/dashboard/warranties`                                 | `warranties`, `warranty_claims`                                       | Provider / Customer      | Live    |
| 20 | Feedback & NPS            | `projectClosure` (feedback)              | `/customer/feedback/:token`                             | `project_feedback`, `nps_responses`                                   | Customer                 | Live    |
| 21 | Notifications             | `notifications`                          | `/dashboard/notifications`                              | `notifications`, `notification_events`                                | All authed               | Live    |
| 22 | Transactional Email       | `notifications` (email subm.)            | (edge: `send-transactional-email`)                      | `email_send_log`                                                      | System                   | Live    |
| 23 | Messaging                 | `messaging`                              | `/dashboard/messages`                                   | `conversations`, `messages`, `message_attachments`                    | All authed               | Live    |
| 24 | Help Center               | `helpCenter`                             | `/help`, `/dashboard/help-center`, `/admin/help-center` | `help_articles`, `help_searches`, `help_feedback`                     | All authed               | Live    |
| 25 | Help Assistant (AI)       | `helpCenter`, `ai`                       | `/help` (panel)                                         | (edge: `help-assistant`)                                              | All authed               | Live    |
| 26 | Provider Growth Engine    | `growth`                                 | `/dashboard/provider-growth`                            | `provider_growth_metrics`                                             | Provider                 | Live    |
| 27 | Operations Center         | `operations`, `observability`            | `/dashboard/operations-center`                          | `operations_observability_log`                                        | Admin                    | Live    |
| 28 | Observability             | `observability`                          | (within Operations Center)                              | `operations_observability_log` + diagnostics                          | Admin                    | Live    |
| 29 | SEO Surface               | `seo`                                    | `/sitemap.xml`, `/q/*`, `/sectors/*`                    | sitemap edge fn + JSON-LD helpers                                     | Public                   | Live    |
| 30 | Reference Resolver        | `reference`                              | (cross-cutting; `useDisplayRefId`)                      | `ref_id` columns + sequences                                          | System                   | Live    |
| 31 | Bookings                  | `bookings`                               | `/dashboard/bookings`                                   | `bookings`, `booking_slots`                                           | Provider / Customer      | Live    |
| 32 | Catalog & Categories      | `catalog`, `categories`                  | `/dashboard/services`, `/admin/categories`              | `service_catalog`, `categories`                                       | Provider / Admin         | Live    |
| 33 | Client Sites              | `client-sites`                           | `/dashboard/client-sites`                               | `client_sites`, `client_site_events`                                  | Provider Staff           | Live    |
| 34 | Barcodes                  | `barcodes`                               | (embedded in work-orders, items)                        | `barcodes`, `barcode_scans`                                           | Provider Staff           | Live    |
| 35 | Loyalty                   | `loyalty`                                | `/dashboard/loyalty`                                    | `loyalty_points`, `loyalty_redemptions`                               | Customer                 | Pilot   |
| 36 | Installments / BNPL       | `installments`                           | (within contracts)                                      | `installment_plans`                                                   | Customer                 | Pilot   |
| 37 | Blog / Content            | `blog`                                   | `/blog`, `/admin/blog`                                  | `blog_posts`, `blog_categories`                                       | Admin                    | Live    |
| 38 | International / Locales   | `international`, `locations`             | (cross-cutting)                                         | `countries`, `cities`, `sa_regions`                                   | System                   | Live    |
| 39 | Files / Storage           | `files`                                  | (cross-cutting; service wrappers)                       | storage buckets + signed URLs                                         | System                   | Live    |
| 40 | Workspace State           | `workspace`                              | (cross-cutting)                                         | `workspace_preferences`                                               | All authed               | Live    |
| 41 | Analytics & Tracking      | `analytics`, `customerTracking`          | `/admin/analytics`                                      | `analytics_events`, `page_view_log`                                   | Admin                    | Live    |
| 42 | Contact Center            | `contact`                                | `/admin/contact-center`                                 | `contact_messages`                                                    | Admin                    | Live    |

## Deferred / not in scope
- Inventory stock movements
- Supplier payments
- Public supplier portal
- Multi-currency accounting ledger

## Per-system detail

The columns above are the authoritative cross-reference. For deeper detail
(notifications, services, dependencies) see:

- Workflow chain: `docs/workflow-map.md`
- Module boundaries: `docs/microservice-boundaries.md`, `docs/service-boundary-audit.md`
- DB objects: `docs/database-inventory.md`
- Edge functions: `docs/edge-function-inventory.md`
- Notifications per event: `docs/notification-coverage-audit.md` (this audit)
- Ownership: `docs/system-ownership-audit.md` (this audit)
- Health score: `docs/system-health-scorecard.md` (this audit)