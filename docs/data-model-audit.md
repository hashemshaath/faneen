# Data Model Audit

_BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase H._

Sourced from `docs/database-inventory.md` and verified against migrations
under `supabase/migrations/`. See also `docs/rpc-edge-function-audit.md`
for RPC ownership.

## Per-system data objects

| System              | Tables                                                | Views | RPCs                                      | Triggers |
|---------------------|-------------------------------------------------------|-------|-------------------------------------------|----------|
| Identity            | `auth.users`, `profiles`, `user_roles`                | `public_profiles` (masked) | `has_role`, `grant_role`, `revoke_role` | profile sync |
| Businesses          | `businesses`, `business_branches`, `business_internal_notes`, `business_activity_log` | `public_businesses` | `transfer_primary_manager` | activity log |
| Memberships         | `memberships`, `membership_tiers`, `membership_events` | — | `grant_monthly_provider_credit` (admin) | renewal cron |
| Credits             | `provider_lead_credit_transactions`, `provider_lead_credit_balances` | `provider_credit_summary` | `consume_provider_lead_credit`, `admin_adjust_provider_credits` | balance recompute |
| Leads               | `leads`, `lead_events`, `lead_revealed_contacts`      | — | `convert_lead_to_quotation` | event log |
| Quote Requests      | `quote_requests`, `quote_request_files`, `quote_request_events`, `quote_request_leads` | — | (none) | event log |
| Quotations          | `quotes`, `quote_items`, `quote_signatures`, `quote_events` | — | `expire_old_quotes` (cron) | totals trigger |
| Contracts           | `contracts`, `contract_items`, `contract_amendments`, `contract_payments`, `contract_signatures`, `contract_attachments`, `contract_events` | — | `lock_contract_on_active` | lock + totals |
| Work Orders         | `work_orders`, `work_order_stages`, `work_order_stage_history`, `work_order_comments`, `work_order_assignments` | — | `transition_work_order_pipeline_stage` | stage history |
| Measurements / BOQ  | `work_order_measurements`, `work_order_boq`           | — | (helpers in lib) | — |
| Procurement         | `procurement_requests`, `procurement_rfqs`, `procurement_rfq_items`, `procurement_supplier_quotes`, `procurement_supplier_quote_items`, `procurement_suppliers` | — | `procurement_award_quote` | event log |
| Installation Appts  | `installation_appointments`, `installation_appointment_events` | — | — | event log |
| Customer Tracking   | `customer_tracking_sessions`, `customer_tracking_events` | — | `issue_customer_tracking_token` | — |
| Project Closure     | `project_closures`, `project_closure_items`, `project_closure_signatures` | — | — | event log |
| Warranty            | `warranties`, `warranty_claims`                       | — | — | claim log |
| Feedback / NPS      | `project_feedback`, `nps_responses`                   | — | — | — |
| Notifications       | `notifications`, `notification_events`                | — | `mark_notifications_read` | — |
| Email               | `email_send_log`                                      | — | — | — |
| Messaging           | `conversations`, `messages`, `message_attachments`, `message_read_state` | — | — | unread counters |
| Help Center         | `help_articles`, `help_searches`, `help_feedback`, `help_assistant_logs` | — | `log_help_search` | — |
| Provider Growth     | `provider_growth_metrics`                             | — | — | — |
| Operations / Obs    | `operations_observability_log`, `operations_sla_log` | — | `run_operations_observability_check`, `run_sla_check` | cron |
| Reference Resolver  | sequences per entity                                  | — | `next_ref_id` | trigger per table |
| Bookings            | `bookings`, `booking_slots`                           | — | — | — |
| Catalog / Categories| `service_catalog`, `categories`                       | — | — | — |
| Client Sites        | `client_sites`, `client_site_events`                  | — | — | event log |
| Barcodes            | `barcodes`, `barcode_scans`                           | — | — | — |
| Loyalty             | `loyalty_points`, `loyalty_redemptions`               | — | — | — |
| Installments        | `installment_plans`, `installment_payments`           | — | — | — |
| Blog                | `blog_posts`, `blog_categories`                       | — | — | — |
| International       | `countries`, `cities`, `sa_regions`                   | — | — | — |
| Files / Storage     | storage buckets (`avatars`, `business-logos`, `contract-attachments`, etc.) | — | `create_signed_url_*` (per bucket) | — |
| Workspace           | `workspace_preferences`                               | — | — | — |
| Analytics           | `analytics_events`, `page_view_log`                   | — | — | — |
| Contact             | `contact_messages`                                    | — | — | — |

## Findings

| Finding | Severity | Action |
|---------|----------|--------|
| No dedicated `purchase_orders` table | Low | Acceptable for v1; PO is currently a WO comment. |
| Status enum duplication: `contracts.status`, `quotes.status`, `work_orders.status` are independent enums with overlapping labels | Low | Acceptable — distinct lifecycles. Documented in `docs/contracts-system-overview.md`. |
| `nps_responses` has no notification trigger | Low | Logged in Phase E backlog. |
| Legacy tables: none found. Faneen → Qitaat migration table cleanup is complete (`docs/database-inventory.md` confirms). | n/a | — |
| Unused tables: none flagged by integrity checks (`scripts/membership-data-audit.mjs`, isolation audits all green). | n/a | — |
| Scattered logic: credit operations centralized under `_shared/credits`. Verified by `scripts/credits-isolation-audit.mjs`. | n/a | — |
| RLS coverage: 100% of public-schema tables have RLS enabled (re-verified by `scripts/security-access-audit` baseline). | n/a | — |

No schema rewrites recommended for pilot launch. All deferred work is
captured in `docs/deferred-backlog.md`.