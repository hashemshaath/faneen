# Database Inventory — PLATFORM-DEEP-AUDIT-REPAIR-1

_Snapshot taken against the live `public` schema at audit time._

## Top-level counts

| Object | Count |
|--------|-------|
| Tables (`public`) | 214 |
| Views (`public`) | 10 |
| Materialized views | 0 |
| Functions / RPCs | 400 |
| Triggers | 227 |
| Storage buckets | 11 |
| Edge functions | see `docs/edge-function-inventory.md` |

## Privilege posture (verified via `has_table_privilege`)

| Check | Result |
|-------|--------|
| Tables with RLS disabled | **0** |
| `anon` SELECT on raw `businesses` | ❌ denied ✓ |
| `anon` SELECT on `businesses_public` view | ✅ allowed ✓ (intentional) |
| `anon` SELECT on raw `profiles` | ✅ allowed — restricted by RLS to publishable rows (`profiles-isolation-audit` green) |
| `authenticated` SELECT on `businesses` | ✅ allowed ✓ |
| App-owned `SECURITY DEFINER` functions without pinned `search_path` | **0** |

## Public views (anon-readable surface)

| View | Purpose | Sensitive fields excluded |
|------|---------|---------------------------|
| `businesses_public` | Public directory feed | Owner UUIDs, internal notes, draft/demo rows |
| `business_branches_public` | Branch detail | Owner staff, internal notes |
| `category_public_counts` | Sector/category counts | n/a |
| `contract_amendment_approvals_safe` | Public verification | Internal approver metadata |
| `contract_amendment_audit_safe` | Public verification | Raw audit payloads |
| `contract_template_versions_public` | Marketing pages | Draft revisions |
| `private_sectors_public` | Private sectors marketing | Member-only rows |
| `provider_landing_settings_public` | Provider landings | Owner UUIDs |
| `reviews_public` | Public reviews | Reviewer PII |
| `v_contract_attachments_unparsed` | Internal helper view | Not anon-granted |

## Domain summary

| Domain | Key tables | Ref prefix | Owner scope | RLS | Notes |
|--------|-----------|-----------|-------------|-----|-------|
| Identity | `profiles`, `user_roles`, `access_violation_log` | `USR-` | `auth.uid()` | ✅ | Roles in separate table; `has_role()` SECURITY DEFINER |
| Businesses | `businesses`, `business_branches`, `business_staff` | `ENT-`, `BRN-` | `business_id` | ✅ | Public via `businesses_public` only |
| Memberships | `memberships`, `membership_*`, `membership_payments` | `MEM-` | `user_id` | ✅ | Lifecycle dispatcher via cron |
| Credits | `credit_*`, `provider_lead_credit_*` | `CTL-`, `CPN-` | `provider_id` | ✅ | Guarded by `credits-isolation-audit` |
| Contracts | `contracts`, `contract_amendments`, `contract_attachments` | `CNT-`, `APT-` | `contract.created_by` + party scope | ✅ | Locks on Active |
| Quotes/BOQ | `quotations`, `quotation_items`, `boq_*` | `QTN-`, `BOQI-` | `business_id` | ✅ | |
| Leads | `quote_requests`, `quote_request_*` | `LED-` | Server-side reveal | ✅ | PII masked by edge function |
| Procurement | `rfqs`, `rfq_items`, `rfq_supplier_quotes`, `purchase_orders` | `RFQ-`, `PO-` | `business_id` | ✅ | Award via RPC |
| Work Orders | `work_orders`, `work_order_stages`, `work_order_notes` | `WO-` | `business_id` | ✅ | Internal notes never anon |
| Customer Tracking | `customer_tracking_links`, `customer_tracking_events` | `CTL-` | Token (`token_hash`) | ✅ | Token never returned to client |
| Installation | `installation_appointments` | `IAP-` | `business_id` + token | ✅ | |
| Closure | `project_closures`, `project_delivery_evidence` | `CLS-`, `PDE-` | `business_id` | ✅ | |
| Feedback / NPS | `customer_feedback`, `customer_nps_responses` | `FDB-` | Token | ✅ | |
| Warranty | `work_order_warranties` | `WAR-` | `business_id` | ✅ | |
| Notifications | `notifications`, `notification_*` | n/a | `user_id` | ✅ | Inserts via wrapper only |
| Messaging | `conversations`, `messages` | n/a | `participant_id` | ✅ | |
| Operations | `cron_runs`, `sla_*`, `email_queue` | n/a | Admin / service | ✅ | |
| Reference | `reference_lookup`, ref-sequence functions | 23 prefixes | n/a | ✅ | See `docs/reference-map.md` |

## Storage buckets (11 total)

All buckets enumerated by `storage-isolation-audit`. Private buckets (`work-order-attachments`, `quote-request-files`, `contract-attachments`, `project-evidence`, etc.) require signed URLs (10-minute TTL, never persisted).

## Findings & flags

- ✅ **All tables have RLS enabled.**
- ✅ **No anon grants on raw business/PII tables.**
- ✅ **All public-facing views exclude PII and internal metadata.**
- ✅ **All app-owned `SECURITY DEFINER` functions have `search_path` pinned.**
- ⚠️ `anon` has SELECT on `profiles` — restricted at the row level to publishable provider rows; `profiles-isolation-audit` enforces the masking pattern. Acceptable for v1.0.
- ⚠️ 214 tables / 400 functions — high count reflects 23 domains. Future consolidation deferred to v1.1.

No schema repairs required.