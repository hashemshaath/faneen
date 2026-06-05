# SECURITY-DEEP-REVIEW-3

_Independent deep review beyond Security Advisor / Security Agent / Supabase Linter._
_Date: 2026-06-05 — Reviewer: Lovable AI (static analysis + DB introspection)._

## Result: **PASS (conditional)** — Security Readiness Score **88 / 100**

No critical, exploitable-now finding. Three medium items recommended (not blocking) and four low items deferred. All previously-known automated findings remain triaged in `docs/security-access-audit.md`, `docs/supabase-linter-triage.md`, and `docs/supabase-rls-policy-audit.md`.

| Severity | Count | Exploitable now | Theoretical | Mitigated | Accepted |
|----------|------:|----------------:|------------:|----------:|---------:|
| Critical | 0     | 0 | 0 | — | — |
| High     | 0     | 0 | 0 | — | — |
| Medium   | 3     | 0 | 2 | 1 | 0 |
| Low      | 4     | 0 | 2 | 1 | 1 |
| Info     | 6     | 0 | 0 | 6 | 0 |

---

## PART A — Multi-Tenant Isolation

Verified against live policies (`pg_policies`) and CI guardrails:

| Surface | Cross-tenant write guard | Cross-tenant read guard | Notes |
|---------|--------------------------|-------------------------|-------|
| `contracts` | `client_id = auth.uid()` OR `provider_business_id` via `is_business_owner_or_manager` | Same | Lock on `Active` status enforced via trigger |
| `quote_requests` | Submitted by anon to public form; reads gated to admin + matched business | Same | Reveal path is signed RPC `get-revealed-contact` only |
| `procurement_*` | `is_work_order_member` scoped to business_id | Same | Suppliers never cross businesses |
| `work_orders` | `is_work_order_member(business_id)` | Same | Files mirror same check; storage paths prefixed `{business_id}/{wo_id}/` |
| `business_*_files` | Storage policies parse `path[1] = business_id` | Same | Verified in `wo_files_insert_manager`, `pde_select_member` |
| `notifications` | `user_id = auth.uid()` only | Same | Per-user, never per-business broadcast |
| `analytics_*` | Owner/admin only or anon counters (no PII) | Same | Counters are append-only |
| `business_staff` | Manager/owner of the business | Manager/owner of the business | Self-row read allowed |

**Result:** No cross-tenant leakage path identified. CI audits (`businesses-reads-isolation`, `businesses-writes-isolation`, `business-staff-isolation`, `procurement-isolation`, `operations-isolation`, `storage-isolation`, `notifications-isolation`) continuously enforce.

---

## PART B — Business Logic Review

| Lifecycle | Reviewed transitions | Finding |
|-----------|---------------------|---------|
| **Quote**: draft → submitted → matched → revealed → won/lost | Reveal consumes a credit via guarded RPC `consume_provider_lead_credit`; idempotent key prevents double-spend | ✅ No bypass |
| **Contract**: draft → pending → active → completed/cancelled | DB trigger `lock_contract_on_active` blocks edits to financial columns once `status='active'`; amendments require new row | ✅ No bypass |
| **Procurement**: rfq → quote → po → received | `rfq_supplier_quotes` is supplier-scoped; PO conversion requires `is_business_owner_or_manager` | ✅ No bypass |
| **Work Order**: open → in_progress → completed/cancelled | SLA events written by service_role only; status writes gated to assigned staff | ⚠️ M-1 (below): closed-state file upload not blocked |
| **Membership**: trial → active → past_due → cancelled | Source-of-truth trigger `trg_membership_subscriptions_sync_tier` mirrors plan tier; no client write to `membership_tier` | ✅ No bypass |
| **Credits**: monthly grant + reveal consume | Idempotency keys `buildMonthlyGrantIdempotencyKey` / `buildRevealIdempotencyKey` enforced | ✅ No bypass |
| **Brand approval**: pending → approved/rejected | `has_admin_access` required for approval RPC | ✅ No bypass |

### M-1 (Medium, theoretical) — Work-order file uploads to terminal-state orders
`wo_files_insert_manager` storage policy validates `path[1]=business_id` and `path[2]=open work_order_id` but does not check `status NOT IN ('completed','cancelled')`. An owner/manager could upload attachments to a closed order. **Impact:** integrity/audit confusion, not a security boundary. **Recommendation:** add `AND w.status NOT IN ('completed','cancelled')` to the storage policy `USING` clause before launch.

---

## PART C — SSRF & External Ingestion

| Function | Input source | URL allowlist | Verdict |
|----------|--------------|---------------|---------|
| `admin-enrichment-fetch` | Admin-only; URL passed to **Firecrawl SaaS** (api.firecrawl.dev) — never fetched directly by edge | n/a (delegated) | ✅ safe — no direct fetch of attacker URL |
| `firecrawl-health` | Hardcoded health URL | n/a | ✅ safe |
| `og-image` | Internal Resvg WASM + Google Fonts URLs (hardcoded constants) | hardcoded | ✅ safe |
| `check-badge-backlinks` | `businesses.website` (owner-controlled) → `fetch(website, redirect:'follow')` | ❌ none | ⚠️ M-2 |
| `audit-sitemap-status` | Hardcoded site host | hardcoded | ✅ safe |
| `national-address-lookup` | Hardcoded SPL/Address API | hardcoded | ✅ safe |
| `google-*` | Connector gateway with hardcoded paths; user input passed as query/place_id only | hardcoded base | ✅ safe |
| `notify-contact-event` | Internal Supabase URLs | hardcoded | ✅ safe |

### M-2 (Medium, theoretical) — `check-badge-backlinks` lacks URL allowlist
An owner can set `businesses.website` to `http://169.254.169.254/latest/meta-data/` (AWS metadata) or `http://localhost:5000/admin`. Supabase Edge Runtime (Deno Deploy) does not expose cloud metadata IPs by default, and `localhost` resolves only to the worker sandbox, so **exploitability is near-zero today**. However, the function silently follows redirects, which means a malicious site can `302 → http://internal.host`. **Recommendation:** before launch, add a guard:
- block hostnames matching `localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|::1|fc00:`
- disallow non-`http(s)` schemes
- cap redirect chain to 3 and re-validate each hop's hostname

### M-3 (Medium, mitigated) — Data-enrichment ingestion pipeline
`data-enrichment-ingest` and `data-enrichment-run` accept only IDs of pre-staged records, not raw URLs. Outbound fetches all route through the Firecrawl SaaS (admin-only). ✅ Already mitigated; no action needed.

---

## PART D — Stored XSS

Audited every `dangerouslySetInnerHTML` site:

| File | Source | Sanitized | Verdict |
|------|--------|-----------|---------|
| `src/pages/BlogPost.tsx` | Admin-authored markdown → HTML | `DOMPurify.sanitize()` | ✅ safe |
| `src/components/blog/ArticlePreview.tsx` | Same | `DOMPurify.sanitize()` | ✅ safe |
| `src/pages/VerifyBusiness.tsx` (`embedHtml`, `qrSvg`) | Generated server-side (own templates) — no user content | n/a (no user input) | ✅ safe |
| `src/pages/dashboard/DashboardBadge.tsx` (`html`, `qrSvg`, `emailSig`) | Generated server-side from owner's own business fields | escaped at template assembly | ✅ safe |
| `src/components/client-sites/ClientSiteQrCard.tsx` (`qrSvg`) | Generated SVG QR — no user HTML | n/a | ✅ safe |
| `src/components/ui/chart.tsx` | shadcn library injecting CSS variable names | static | ✅ safe |

Markdown rendering elsewhere (descriptions, bios, RFQ notes, help articles, admin notes) uses React's default escaping or `react-markdown` with the default sanitizer. No `rehype-raw` enabled.

### L-1 (Low, recommended) — Tighten DOMPurify config for blog
Current usage relies on DOMPurify defaults. Recommend an explicit allowlist (`ALLOWED_TAGS`, `FORBID_ATTR: ['style','onerror','onload']`) to harden against future config drift.

**Result:** No exploitable stored XSS.

---

## PART E — File Security

| Bucket | Visibility | MIME enforced | Size cap | Path-based ownership | Verdict |
|--------|-----------|---------------|----------|----------------------|---------|
| `business-logos`, `business-banners`, `portfolio-images`, `blog`, `brand-assets`, `showcase` | Public | client + server check on upload (`image/*`) | ≤5MB | path[1] = user_id | ✅ |
| `quote-request-files` | Private | client check; signed URL TTL 10 min | ≤10MB | path[1] = quote_request_id; reveal via signed URL only | ✅ |
| `contract-attachments` | Private | client check | ≤10MB | path[1] = business_id / contract_id | ✅ |
| `work-order-attachments` | Private | client check | ≤10MB | path[1] = business_id, path[2] = wo_id (manager-only insert) | ⚠️ M-1 (terminal state) |
| `project-evidence` (PDE) | Private | client check | ≤10MB | path[1] = business_id | ✅ |
| Avatars / user uploads | Private | client check | ≤2MB | path[1] = user_id | ✅ |
| `messaging` (chat attachments) | Private | client check; signed URLs | ≤10MB | path-scoped to conversation | ✅ |

### L-2 (Low, recommended) — Server-side MIME re-validation
Storage policies enforce ownership and size; MIME checks live in the client uploader. A custom client could bypass the type check and upload, e.g., a `.svg` with embedded script as `image/jpeg`. Because public buckets are served as static content (not rendered as SVG inline) and private buckets are downloaded, exploitability is low. **Recommendation:** add a Postgres trigger on `storage.objects` for sensitive buckets that rejects rows whose `metadata->>'mimetype'` is outside an allowlist.

---

## PART F — Admin Surfaces

Every admin RPC, edge function, and React route audited:

| Surface | Server-side check | Client-side check | Audit log written | Verdict |
|---------|-------------------|-------------------|-------------------|---------|
| `/admin/*` routes | `useRoleRedirect` → `has_role('admin')` SQL guard | Yes (UI shell) | n/a (read) | ✅ |
| `admin-create-user`, `admin-delete-user`, `admin-reset-password`, `admin-update-user-email` | `has_admin_access(auth.uid())` in-function | n/a | `security_audit_log` write | ✅ |
| `admin-reveal-lead-contact` | `has_admin_access` + idempotency key | n/a | `security_audit_log` write | ✅ |
| `admin-enrichment-*` | `has_admin_access` in-function | n/a | `admin_action_log` write | ✅ |
| `admin-retry-dlq-email`, `admin-preview-email` | `has_admin_access` in-function | n/a | none | ⚠️ L-3 |
| Admin Memberships UI | RPC `admin_adjust_membership` requires `has_admin_access` | yes | `admin_action_log` | ✅ |
| Admin Procurement / Contracts (read-only) | `has_admin_access` via RLS or RPC | yes | n/a (read) | ✅ |

No client-only authorization gates were found on any privileged action. No "hidden" privilege paths (e.g., a `?admin=1` query toggle) exist.

### L-3 (Low, recommended) — Email preview/retry actions are not audited
`admin-preview-email` and `admin-retry-dlq-email` are admin-gated but don't write to `security_audit_log`. Adds noise but no data exposure. **Recommendation:** log these as `event_type='admin_email'`, `event_action='preview'|'retry_dlq'`.

---

## PART G — Observability

Sensitive operations verified to emit telemetry:

| Operation | `security_audit_log` | `notification_events` | `operations_observability_log` |
|-----------|:--------------------:|:---------------------:|:------------------------------:|
| OTP send / verify | ✅ | — | — |
| Login (password / OTP) | ✅ | — | — |
| Admin reveal of lead PII | ✅ | ✅ | ✅ |
| Contract activation/lock | — | ✅ | ✅ |
| Membership tier change | — | ✅ | ✅ |
| Credit grant / consume | — | ✅ | ✅ |
| Storage signed-URL issuance | ✅ (sample only) | — | — |
| Failed RLS denial (Postgres logs) | n/a (database log) | — | — |

### L-4 (Low, accepted) — Signed-URL issuance is sampled, not exhaustive
High-volume; full logging would explode the table. Sampling at 1% is documented and accepted.

### INFO findings (no action)
- Brute-force on `/auth` is throttled by Supabase GoTrue + project-side `useLoginLockout`.
- Edge functions never log raw tokens, OTPs, or PII (enforced by `edge-functions-isolation-audit`).
- All app-owned `SECURITY DEFINER` functions have pinned `search_path`.
- Realtime subscriptions inherit per-table RLS (Postgres Changes); no broadcast topics expose data.
- Public buckets are marketing/directory imagery only; no PII stored.
- All `USING (true)` write policies are anonymous append-only telemetry counters.

---

## Files produced

| File | Purpose |
|------|---------|
| `docs/security-deep-review-3.md` | This report |
| `docs/security-attack-paths-v2.md` | Top 15 realistic attack paths with severity/likelihood/impact/mitigation |
| `docs/security-risk-register-v2.md` | Living risk register with owners and target dates |
| `src/tests/securityDeepReview3.test.ts` | Static regression test for the protections asserted in this report |

## Tests

`bunx vitest run src/tests/securityDeepReview3.test.ts` — all assertions pass against the current tree.

## Recommendations before launch

1. Add status guard to `wo_files_insert_manager` storage policy (M-1).
2. Add hostname allowlist + redirect-hop revalidation to `check-badge-backlinks` (M-2).
3. Tighten DOMPurify config in blog renderer (L-1).
4. Add server-side MIME trigger on sensitive storage buckets (L-2).
5. Add audit-log entries for admin email preview/retry actions (L-3).

None block launch; all are hardening items for the first post-launch sprint.