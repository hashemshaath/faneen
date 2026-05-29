# Security, RLS, Grants, Public Views, Storage Audit

_PLATFORM-DEEP-AUDIT-REPAIR-1 — all checks green; no repairs required._

## Public directory privacy

| Check | Status |
|-------|--------|
| `businesses_public` exposes only `is_active = true AND approval_status = 'published' AND is_demo = false` | ✅ verified in `publicDirectoryPublishingReadiness1.test.ts` |
| `businesses` sensitive fields not anon-readable | ✅ `has_table_privilege('anon', 'businesses', 'SELECT') = false` |
| `business_branches` sensitive fields not anon-readable | ✅ same |
| `quote_requests` customer PII not anon-readable | ✅ reveal only via `get-revealed-contact` edge function |

## Customer-portal privacy

| Check | Status |
|-------|--------|
| `customer_tracking_links` never exposes `token_hash` publicly | ✅ all reads go through token-scoped RPC; raw column never SELECTed by wrappers |
| Customer snapshot RPC returns safe fields only | ✅ excludes `internal_note`, `supplier_*`, `staff_*`, raw UUIDs |
| Procurement supplier quotes not customer-visible | ✅ separate `rfq_supplier_quotes` table, business-scoped RLS |
| Work order internal notes not customer-visible | ✅ `work_order_notes` is staff-only |

## Storage

| Bucket | Visibility | Notes |
|--------|-----------|-------|
| `business-logos`, `business-banners`, `portfolio-images` | Public | Marketing assets only |
| `quote-request-files` | Private | 10-min signed URLs (`SIGNED_URL_TTL`) |
| `contract-attachments` | Private | Signed URLs, never persisted |
| `work-order-attachments` | Private | Same |
| `project-evidence` (PDE) | Private | Same |
| Avatars / uploads (user) | Private | RLS by `auth.uid()` |

## Email / token hygiene

- ✅ Customer emails contain only ref IDs and signed redirect URLs — never raw UUIDs or raw tokens.
- ✅ Email queue dispatches are idempotent (`buildRevealIdempotencyKey`, `buildMonthlyGrantIdempotencyKey`).
- ✅ Transactional templates verified by `transactional-email-isolation-audit`.

## Function security

- ✅ 0 app-owned `SECURITY DEFINER` functions without pinned `search_path`.
- ✅ All admin RPCs gated by `has_role(auth.uid(), 'admin')`.
- ✅ Edge functions never log raw tokens (`edge-functions-isolation-audit`).

## Audits run (all green)

broken-links, sitemap-integrity, robots-sitemap-sync, identity-isolation,
profiles-isolation, businesses-reads-isolation,
businesses-sensitive-fields-isolation, businesses-writes-isolation,
business-staff-isolation, contracts-isolation, leads-quotes-isolation,
procurement-isolation, storage-isolation, notifications-isolation,
notifications-insert-isolation, transactional-email-isolation,
edge-functions-isolation, credits-isolation, edge-credits-isolation,
messaging-isolation, memberships-isolation, edge-memberships-isolation,
operations-isolation, jsonld-snapshot, jsonld-parse, seo-noindex.

No repairs required.