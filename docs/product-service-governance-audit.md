# Product & Service Governance — Audit (PSG-1 Part A)

## Current entities

- `business_services` — provider-owned services. Status columns:
  `provider_status` (`active`|`paused`), `admin_status`
  (`allowed`|`suspended`|`rejected`|`pending_review`), `is_active`,
  `is_demo`, `is_featured`, `is_premium_service`,
  `requires_admin_review`. SEO surfaces today consume `name_*`,
  `description_*`, `category_id`.
- `business_service_brands` — many-to-many between services and the
  approved `brand_catalog` (brands governance owns approval).
- `categories` — single hierarchy used by both businesses and
  business_services. Carries `seo_title_*`, `seo_description_*`,
  `slug`, `featured_keywords`.
- `branch_services`, `business_service_areas`,
  `business_service_countries` — service distribution & reach.
- `brand_catalog` — global brand registry (governed in Brands
  Governance phase).
- Products: **no dedicated `products` table today.** Provider
  catalogs surface as services. The product readiness/quality
  engines below are designed to drop in unchanged when a
  `products` table is introduced.

## Ownership

- Provider dashboard owns CRUD on `business_services`,
  `business_service_brands`, `branch_services`.
- Admin owns `admin_status`, `categories`, brand approval, and the
  new Catalog Governance surfaces.
- Public read paths must filter to `provider_status='active' AND
  admin_status='allowed' AND is_active=true AND is_demo=false`
  (mirrors `business_services_public_visibility_idx`).

## Relationships

```
businesses ──┬─< business_services >── categories
             └─< business_branches >── branch_services
business_services >── business_service_brands ─< brand_catalog
business_services >── business_service_countries
```

## Duplication risks

- Multiple `business_services` rows per business with identical
  `lower(name_ar)` / `lower(name_en)` are not constrained.
- Service names that mirror the parent category label add no
  semantic value (e.g. "Aluminum" under category "Aluminum").
- Demo seed services (`is_demo=true`) leaking into public lists.

## Missing governance

- No unified Draft → Review → Approved → Published → Archived
  lifecycle across services (today only `admin_status` exists).
- No readiness or quality score per service/product.
- No admin Operations dashboard scoped to the catalog.
- No observability events for catalog lifecycle transitions.
- No products entity (planned, deferred to a future phase).

## Missing workflows

- Bulk request-revision / request-enrichment per service.
- Reviewer assignment per service row.
- Help Center mappings for the new admin surfaces.

## Decision

PSG-1 ships pure governance: scoring engines, admin dashboard +
queue, observability event vocabulary, help mappings, and tests.
No schema migrations, no new RLS, no bulk publish, no scope creep
into inventory or pricing.