# Pilot Launch Backlog

_Live log — append findings as the pilot runs._
_Phase: PILOT-LAUNCH-OPERATIONS-1_

## How to use

1. Add one row per finding the moment it is observed.
2. Classify: `bug | copy | help | perf | ux | data | infra`.
3. Severity: `S1 blocker | S2 high | S3 medium | S4 low`.
4. Status: `open | in-progress | fixed | wontfix | deferred`.
5. Link the source: observability snapshot id, help issue ref, log line, or screenshot path.

## Backlog

| Date | Source | Class | Severity | Page / area | Finding | Proposed fix | Status |
|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | — | — | — | — | — | — | open |

## Weekly review template

Copy this block every Monday.

### Week of YYYY-MM-DD

**Funnel deltas**
- Provider signups: …
- Approved providers: …
- RFQs submitted: …
- Quotes sent: …
- Contracts signed: …
- Work orders completed: …
- Customer portal visits: …

**Health**
- Avg observability score: …
- Email DLQ rate: …
- Top 3 errors: …

**Top findings this week**
1. …
2. …
3. …

**Decisions**
- …

**Promoted to next sprint**
- …

## Known deferred (from earlier phases)

| Item | Source phase | Why deferred |
|---|---|---|
| `/compare` entry-point CTA in search results | PAGE-PURPOSE-… | Backlog — not pilot-blocking |
| Rename "Operations" sidebar label → "Daily Ops" | PAGE-PURPOSE-… | Wait for pilot feedback |
| Help articles for `production-board`, `procurement-detail`, `business-profile`, `staff` | PAGE-POLISH-1 | Author during pilot |
| Help pageKeys for leads / my-requests / bookings / reviews | PAGE-PURPOSE-… | Add once articles exist |
| `/sector/:slug` deprecation | PAGE-PURPOSE-… | Needs SEO redirect proof |
| `/dashboard/operations` vs `operations-center` merge consideration | PAGE-PURPOSE-… | Distinct purpose; revisit post-pilot |

## BUSINESS-HARDENING-1 follow-through (wire during pilot week 1)

| Ticket | Part | Description |
|---|---|---|
| HARDENING-1-A | A | Fan-out admin notification on `customer.nps_submitted` (owner + active managers, no PII). |
| HARDENING-1-B | B | Register `work-order-assigned` AR/EN email template + dispatcher wiring. |
| HARDENING-1-C | C | Insert `skipped_no_recipients` notification_events row when quote expires without recipients. |
| HARDENING-1-D | D | Closure → idempotent `nps_request_pending` portal prompt (key: `contract_id`+`nps_request`). |
| HARDENING-1-E | E | Warranty resolved → `nps_followup_pending` portal prompt, 90-day suppression. |
| HARDENING-1-F | F | BOQ screen next-best-action card + procurement empty-state copy. |
| HARDENING-1-G | G | Verify `executeAwardHandoff` single-comment idempotency under re-award. |
| HARDENING-1-H | H | Add `skipped_no_recipients` metric to Operations Center system-health card. |

## Inline TODO inventory — PHASE C1 documentation cleanup (2026-06)

Inventory of inline `TODO(...)` markers that were left in the codebase as
forward-looking placeholders. Documented here so they survive any future
comment cleanup; the inline comments themselves are kept in place because
several act as regression hints next to the code they describe.

| ID | File | Title | Reason kept inline | Proposed phase | Blocker? | Decision |
|---|---|---|---|---|---|---|
| TODO-C1-01 | `src/App.tsx` (~L142) | Delete retired admin-taxonomy CRUD pages once `/admin/taxonomy` adoption is 100% verified | Hint next to `AdminLegacyTaxonomyReplaced` lazy import — flags the deprecation route still in use | Phase C2 (safe dead-source cleanup) | No | defer |
| TODO-C1-02 | `src/App.tsx` (~L265) | Delete `AdminTaxonomyHub` source file once verified | Same family as TODO-C1-01 | Phase C2 | No | defer |
| TODO-C1-03 | `src/components/auth/AdminRoute.tsx` | Migrate every `/admin/*` route to `<AdminRoute>` page-by-page | Documents the per-page migration constraint (double `DashboardLayout` risk) | Phase C3 (wrapper consolidation) | No | defer |
| TODO-C1-04 | `src/modules/shared/constants/country.ts` | Replace hardcoded SA UUID/currency/locale literals at callsites with these constants | Tracks a refactor that must be done lazily as each module is touched | R1B+ refactor | No | keep |
| TODO-C1-05 | `src/pages/admin/AdminTaxonomyCenter.tsx` | Migrate admin routes to shared `<AdminRoute>` wrapper | Duplicate of TODO-C1-03 — kept as in-page reminder | Phase C3 | No | defer |
| TODO-C1-06 | `src/modules/taxonomy/components/TaxonomyTreeView.tsx` | Enable drag-and-drop taxonomy reordering once a stable DnD utility is approved | Documents a product/UX decision | Needs product decision | No | needs product decision |
| TODO-C1-07 | `src/components/home/v2/data/categoryRows.ts` | Replace placeholder taxonomy slugs with real ones | Tracks data backfill that must follow taxonomy stabilization | Phase C4 (DB deprecation) | No | defer |
| TODO-C1-08 | `src/modules/files/index.ts` | Generalize image pipeline beyond Showcase (projects, business logos, services, products, articles) | Tracks Files Phase 2 generalization roadmap | Files Phase 2.1+ | No | defer |
| TODO-C1-09 | `src/modules/files/services/image-pipeline.ts` (Phase 2.1) | Generalize Showcase pipeline | Same family as TODO-C1-08 | Files Phase 2.1 | No | defer |
| TODO-C1-10 | `src/modules/files/services/image-pipeline.ts` (Phase 2.2) | Backfill `image_assets` for existing showcase rows | Tracks backfill dependency for the generalization | Files Phase 2.2 | No | defer |
| TODO-C1-11 | `src/modules/files/domain/projects.ts` (Phase 2.2) | Backfill existing `projects.cover_image_url` into `image_assets` | Same family | Files Phase 2.2 | No | defer |
| TODO-C1-12 | `src/modules/files/domain/projects.ts` (Phase 2.3) | Generalize pipeline to business logos / services / products | Same family | Files Phase 2.3+ | No | defer |
| TODO-C1-13 | `src/modules/files/domain/businesses.ts` (Phase 2.3) | Backfill existing `businesses.logo_url` | Same family | Files Phase 2.3 | No | defer |
| TODO-C1-14 | `src/modules/files/domain/businesses.ts` (Phase 2.3+) | Generalize pipeline to services / products | Same family | Files Phase 2.3+ | No | defer |
| TODO-C1-15 | `src/modules/files/domain/catalog.ts` (Phase 2.4) | Backfill existing `business_services.image_url` | Same family | Files Phase 2.4 | No | defer |
| TODO-C1-16 | `src/modules/files/domain/catalog.ts` (Phase 2.4+) | Generalize pipeline to articles | Same family | Files Phase 2.4+ | No | defer |

None of the above are release blockers; all are tracked here so the inline
`TODO(...)` markers can be re-found via grep and matched to a backlog entry.