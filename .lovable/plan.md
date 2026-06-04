# DATA-ENRICHMENT-GOVERNANCE-1

Build a single governance layer through which every external data source must pass before being written to `businesses`, `providers`, `brands`, `private_sectors`, or `provider_leads`.

## Scope

In: unified module `src/modules/dataEnrichment`, normalization/translation/confidence/conflict engines, source registry, audit trail, admin dashboard `/admin/data-enrichment` (governance tabs), DB tables for sessions/audit/quality, guard tests + CI audit.

Out (deferred, tracked in audit doc): rewriting existing provider registration form, full CSV importer UI, brand bulk importer UI — these get wrappers that route through the engine but keep their current UI.

## Architecture

```text
src/modules/dataEnrichment/
  index.ts                     # public barrel
  types.ts                     # SourceKind, EnrichmentRecord, Confidence, Conflict, QualityScore
  sourceRegistry.ts            # registry of all 11 sources + capabilities
  engines/
    normalizationEngine.ts     # city/district/phone/url/email/CR/VAT/national-addr/social
    translationEngine.ts       # AR<->EN via Lovable AI gateway (edge)
    confidenceEngine.ts        # scoring rules table
    conflictResolver.ts        # diff + resolution strategies
    qualityScoring.ts          # 0-100 profile quality
  services/
    ingestSource.ts            # supabase.functions.invoke('data-enrichment-ingest')
    runEnrichment.ts           # invoke('data-enrichment-run')
    resolveConflict.ts         # invoke('data-enrichment-resolve')
    approveRecord.ts           # invoke('data-enrichment-approve')
    listPending.ts / listAudit.ts / getQuality.ts
  observability.ts             # emit enrichment_* events to operations log
  README.md
```

Engines are **pure functions** (testable, no network). All network goes through edge functions + service wrappers (EF-6 compliant).

## Database (one migration)

- `data_enrichment_sources` — registry mirror (seeded): `key`, `label_ar/en`, `kind`, `trust_weight`, `active`.
- `data_enrichment_records` — one row per ingested payload: `source_key`, `external_ref`, `raw jsonb`, `normalized jsonb`, `translated jsonb`, `confidence jsonb`, `conflicts jsonb`, `quality_score int`, `status` (`imported|normalized|enriched|pending_review|approved|rejected|applied`), `target_entity_type`, `target_entity_id`, `created_by`, timestamps.
- `data_enrichment_audit` — append-only: `record_id`, `field`, `old_value`, `new_value`, `source_key`, `actor_id`, `action`, `reason`, `created_at`.
- `data_enrichment_quality_snapshots` — per business/provider quality score history.
- GRANTs (`authenticated` for SELECT on registry; admins via RLS using `has_admin_access`), RLS enabled, service_role full access. Append-only trigger on audit.

## Edge functions

`supabase/functions/data-enrichment-{ingest,run,resolve,approve,quality}/index.ts`
- All gated by `has_admin_access` for write paths; `ingest` accepts an internal `x-source-token` for system sources (Provider Lead intake, CSV import worker).
- `run` chains: validate → normalize → translate (Lovable AI, deferred if no key) → score → detect conflicts → persist. Emits observability events.
- Reuse existing `_shared/google/gateway.ts` and the AI gateway pattern from `admin-enrichment-enhance`.

## Source Registry (initial 11)

google_places, google_maps, firecrawl_website, website_crawl, national_address, manual_admin, provider_registration, supplier_import, csv_import, brand_import, future_api. Each declares: trust weight (0..1), supported fields, requires_review (bool).

## Admin UI

New route `/admin/data-enrichment-governance` (keep existing `/admin/data-enrichment` for the legacy ADMIN-DATA-ENRICHMENT-MICROSERVICE-1 page — link both):

Tabs:
1. **Sources** — registry table + per-source 24h ingest stats.
2. **Pending Reviews** — list of `pending_review` records, opens detail drawer.
3. **Conflicts** — only records with `conflicts` array non-empty; side-by-side resolver.
4. **Confidence** — distribution chart + low-confidence queue.
5. **Quality** — businesses sorted by quality_score ascending.
6. **History** — applied records timeline.
7. **Audit Trail** — searchable append-only log.

All UI uses inline cards/drawers (no popups — per project constraint).

## Integration wiring

- Existing `admin-enrichment-apply` edge function: add a call to `data-enrichment-run` to persist a parallel governance record before writing the entity. Non-blocking on failure (logs only) so we don't break the existing flow.
- Provider Lead intake: wrap its insert path with `ingestSource({ source: 'provider_registration', ... })`.
- Future Google/Firecrawl ingestion points call `ingestSource` instead of writing directly.

## Tests — `src/tests/dataEnrichmentGovernance1.test.ts`

1. Module barrel exists and exports the documented surface.
2. Source registry contains all 11 sources with valid trust weights.
3. `normalizationEngine` normalizes Riyadh aliases, +966 phone formats, lowercases email, strips URL tracking.
4. `confidenceEngine` returns ≥95 when google+website agree, 70 website only, 60 manual, 50 ai_only.
5. `conflictResolver` produces a Conflict[] when two sources disagree and zero when they match.
6. Edge functions exist (5 files) and gate on `has_admin_access` or `x-source-token`.
7. Admin page exists at `src/pages/admin/AdminDataEnrichmentGovernance.tsx`, registered in `App.tsx`, linked from sidebar.
8. No page/component imports an external API directly — all enrichment calls go through `@/modules/dataEnrichment`.
9. Migration exists and creates the 4 tables with RLS + GRANTs.
10. Observability events emitted: `enrichment_started`, `enrichment_completed`, `enrichment_failed`, `conflict_detected`, `conflict_resolved`, `enrichment_approved`.

CI audit script `scripts/data-enrichment-isolation-audit.mjs` forbids direct calls to enrichment edge functions outside `src/modules/dataEnrichment/**`.

## Deliverable

`docs/data-enrichment-governance-1-audit.md` — final report with PASS/FAIL per test, architecture diagram, sources table, engine descriptions, conflict UX screenshots, integration map, readiness score.

## Out of scope (acknowledged)

- Migrating CSV/Brand import UIs (wrappers only).
- Rebuilding provider registration UX.
- Real-time enrichment workers (cron) — schema ready, scheduler deferred.

Approve to proceed with implementation.
