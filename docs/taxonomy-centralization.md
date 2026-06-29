# Taxonomy Centralization — Closeout Documentation

Status: **CLOSED** as of Phase 5A (Global Closeout Audit Complete).
This document is the canonical reference for the unified taxonomy
system across Quote Requests, Work Orders, Contracts, Templates, Work
Types, SEO, and Analytics.

---

## 1. Canonical Primary Slugs

The 13 approved canonical primary slugs (frozen by
`src/modules/taxonomy/canonical-primaries.ts` and guarded by
`src/tests/taxonomyCentralizationPhase1.test.ts`):

```txt
aluminum-works
glass-securit-works
steel-metal-works
stainless-steel-works
wood-carpentry
kitchens-works
facades-cladding
contracting-finishing
elevators-maintenance
energy-sustainability
technology-networks
security-control-systems
equipment-rental
```

Any new primary slug MUST be added here and to
`CANONICAL_PRIMARY_SLUGS` together — never one without the other.

---

## 2. Legacy Slugs Policy

Legacy slugs (e.g. `aluminum`, `glass`, `iron-steel`,
`aluminum-glass-facades`, `technology-systems`,
`heavy-equipment-rental`, `stainless-steel-fabrication`,
`fabrication-installation`) are **allowed only in**:

- URL compatibility (`/sectors/:slug` legacy routes).
- Fallback mapping (`LEGACY_SECTOR_TO_TAXONOMY_SLUG`).
- SEO legacy routes (`SECTORS_SEO`, `SECTOR_KEYWORDS`).
- Guards and tests.
- Historical immutable data (e.g. `quote_requests.sector`).

They are **forbidden** as:

- New primary slugs in UI pickers.
- New DB writes / inserts on user-facing tables.
- New taxonomy nodes.

Public loaders and admin pickers filter legacy slugs out by default
(`isLegacyPrimarySlug`, `defaultTaxonomyFilters.showLegacy = false`).

---

## 3. Quote Requests Policy

- `quote_requests.taxonomy_category_id` (nullable FK to
  `taxonomy_categories.id`) is the **central source of truth**.
- `quote_requests.sector` remains temporarily for backward
  compatibility with legacy filters and historical audit records.
- `sector` is **not** dropped now — it preserves immutable history of
  past submissions. A drop is deferred until a sufficient operational
  window has passed (see §7).
- Submit, match, admin operations, CSV export, and analytics paths
  are all taxonomy-aware with FK-first reads and legacy fallback
  (Phases 3B–3I).

---

## 4. Work Orders Policy

- `work_orders.taxonomy_category_id` is a **nullable** FK to
  `taxonomy_categories.id` (Phase 4C).
- `work_orders` has **no** `sector` column, and adding one is
  explicitly forbidden.
- New work orders **inherit** taxonomy from their source via the
  priority chain (Phase 4E/4F/4H):
  1. contract taxonomy
  2. contract template taxonomy
  3. quote taxonomy
  4. project taxonomy
  5. work type taxonomy
  6. legacy sector fallback
  7. `null` / unclassified
- Lead, booking, and manual work orders may remain `null` without
  failure.
- Taxonomy has **no effect** on work order lifecycle, status, stage,
  BOQ review, or measurements.
- Display-only resolution lives in
  `src/modules/taxonomy/resolveWorkOrderTaxonomy.ts` and the operational
  summary UI (Phase 4I).

---

## 5. Contracts Policy

Resolution priority for contract taxonomy:

1. `contract_taxonomy_categories` junction with `is_primary = true`.
2. Single-row junction fallback.
3. Contract template `taxonomySlug` metadata fallback.
4. Service category fallback.

Taxonomy resolution has **no effect** on contract approval,
signatures, PDF generation, or lifecycle transitions.

---

## 6. BOQ / Measurements Policy

- BOQ items carry **no** taxonomy at item level.
- BOQ inherits the work order's taxonomy context for **display only**.
- No changes to calculations, validation, or review flow.
- Item-level taxonomy is deferred until sector-specific BOQ reporting
  is explicitly requested (see §7).

---

## 7. Deferred Items

Only the following items are intentionally deferred:

1. Decision on `building-materials-supply`: promote to canonical or
   formally mark forbidden.
2. Adding explicit taxonomy to lead/booking sources if operational
   need emerges.
3. Dropping `quote_requests.sector` after a sufficient operational
   retention window.
4. Work order filters / CSV export once real operational data exists.

---

## 8. Guardrails

The following are forbidden without a dedicated, scoped phase:

- Introducing new legacy primary slugs.
- Dropping `quote_requests.sector` at this time.
- Adding `work_orders.sector`.
- Making `taxonomy_category_id` NOT NULL on any table.
- Adding BOQ item-level taxonomy outside a dedicated phase.
- Coupling lifecycle / status / stage transitions to taxonomy.

CI guards: `taxonomyCentralizationPhase1.test.ts`,
`legacyTaxonomyClosure.test.ts`, `legacyTaxonomyVisibilityBatch5.test.ts`,
`searchRfqTaxonomyBatch3.test.ts`, and the phase-specific tests
(3B–4I) protect this contract.