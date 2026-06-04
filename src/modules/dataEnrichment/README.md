# Data Enrichment Governance (DATA-ENRICHMENT-GOVERNANCE-1)

Unified governance layer for every external data source feeding Qitaat.

## Pipeline

source -> ingest -> normalize -> translate -> confidence -> conflict -> review -> approve -> apply

## Public API

All call-sites import from `@/modules/dataEnrichment`. Direct calls to the
`data-enrichment-*` edge functions are forbidden and enforced by
`scripts/data-enrichment-isolation-audit.mjs`.

## Engines

- `normalizationEngine` — city aliases, +966 phones, lowercased emails,
  tracking-stripped URLs, CR/VAT digits.
- `translationEngine` — pairs AR<->EN; actual generation is server-side
  via the Lovable AI gateway inside `data-enrichment-run`.
- `confidenceEngine` — google+website agreement -> 95+, national_address
  -> 95, manual -> 60, AI-only -> 50, disagreement capped at 75.
- `conflictResolver` — emits `Conflict[]` whenever two or more sources
  disagree on the same normalized value.
- `qualityScoring` — weighted 0..100 quality with breakdown.

## Sources

11 sources registered in `sourceRegistry.ts` and mirrored in
`public.data_enrichment_sources`. New sources MUST be added to both.

## Tables

`data_enrichment_sources`, `data_enrichment_records`,
`data_enrichment_audit` (append-only), `data_enrichment_quality_snapshots`.
Admin-gated via `has_admin_access`.