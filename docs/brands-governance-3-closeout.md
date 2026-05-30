# Brands Governance 3 — Closeout

Status: **CLOSED ✅**
Date: 2026-05-30

## What shipped

- Public `/brands` catalog and `/brands/:slug` detail (approved brands only, via `brands_public` view).
- Legacy private-sector pages preserved at `/private-sectors` and `/private-sectors/:slug`.
- Admin queue at `/admin/brand-requests` with `pending`, `in_review`, `needs_more_info`, `approved`, `rejected` states.
- Admin brand detail at `/admin/brands/:id` with audit log, provider relationships, sectors, manufacturing countries.
- Operations Console card with live pending counts and deep links.
- Sitemap edge function indexes approved brands only.
- BreadcrumbList, Brand, and CollectionPage JSON-LD on public pages.
- Notifications for brand-request lifecycle and provider-brand link approvals.
- Help Center contextual mappings for new brand pages.
- All brand DB access routed through `src/modules/brands/services/brandsService.ts`.

## What was validated

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `brandsGovernance3.test.ts` | ✅ 42/42 |
| `brands-isolation-audit` | ✅ 0 violations |
| `broken-links-audit` | ✅ 0 broken (fixed `/admin/help-center` → `/admin/help`) |
| `robots-sitemap-sync-audit` | ✅ pass |
| `jsonld-parse-audit` | ✅ 75/75 valid |
| `seo-noindex-audit` | ⚠️ pre-existing admin warnings unrelated to brands |
| `sitemap-integrity-audit` | ⚠️ pre-existing `help` type mismatch unrelated to brands |

## How public brand visibility works

- `brands_public` is a security-invoker view that returns only rows where `status = 'approved'`.
- Public pages and the sitemap function read **only** from `brands_public`. They never touch `brand_catalog` directly.
- `business_service_brands` public reads are constrained by RLS to brands that are approved.
- Provider-brand link results on public detail are filtered to `authorization_status = 'verified'` server-side.
- Pending, draft, rejected, or archived brands cannot be enumerated or retrieved through any public path.
- Admin and provider workflows continue to use `brand_catalog` directly via `brandsService` with RLS protection.

## What was deferred (with reasons)

### RFQ brand picker
Requires a new RFQ↔brand relation model (brand arrays per RFQ line, allowed-brand constraints, replacements policy). That schema change has follow-on effects on quote evaluation, supplier matching, and award flow — out of scope for a brand-registry closeout and intentionally not started here.

### SLA cron for brand request aging
The data shape exists (`status_updated_at`, `created_at` on `brand_addition_requests`) and the Operations card surfaces pending volume, but no scheduled escalation job ships in this phase. Reason: SLA thresholds, escalation targets, and notification routing are not yet specified by ops. Adding a cron without those policies would create noisy escalations.

### Provider `/dashboard/brands` linked-brands UI panel
Service method `listMyProviderBrandLinks` exists; the dashboard surface for providers to view/manage their own linked brands is deferred. Reason: scope discipline — current providers can request links from the service picker; the management view is a UX nicety not blocking approvals.

### Help Center article bodies
Page keys are mapped (`public.brands`, `dashboard.brands`, `admin.brand-requests`, etc.) but the long-form article content is empty. Reason: content authoring rather than engineering.

### Extended duplicate detection
Today duplicate hints rely on normalized name match. Phonetic/fuzzy match and cross-language Arabic↔English normalization deferred.

## Readiness score

**9.5 / 10** — Public registry, admin workflow, sitemap, JSON-LD, isolation, and notifications are production-ready. Half-point reserved for deferred SLA cron and provider dashboard panel which are nice-to-haves, not blockers.