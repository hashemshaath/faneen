# PROVIDER-GROWTH-ENGINE-1 — Architecture

Phase: Foundation (Parts A, B, C, D, L).
Status: Foundation **shipped**. Admin UI (E, G, H, I), discovery wiring (F), help/observability surfacing (J, K) tracked as follow-ups.

## 1. Lifecycle

Every provider record (lead, Google Places, manual entry or data-enrichment) belongs to **exactly one** lifecycle stage. Transitions are guarded server-side by `enforce_provider_growth_stage`.

```text
Discovered → Imported → Enriched → Review Pending → Verified → Published → Optimized
```

Side branches: `Rejected`, `Archived` (terminal).

## 2. Hard rules

1. **No direct publish.** Inserts in `published` are blocked; updates may only enter `published` from `verified`.
2. **Verification gate.** Entering `verified` requires `review_pending` first.
3. **Admin-only writes.** RLS limits `provider_growth_pipeline` to `admin`; edge functions use `service_role`.
4. **Source attribution.** Every row stores `source` + `source_ref` (e.g. `google_places:ChIJ…`, `lead:LD-1000123`).
5. **No bulk publishing.** The queue offers bulk assignment / requests only — never bulk publish.

## 3. Modules

| Concern | File |
|---|---|
| Pipeline state | `public.provider_growth_pipeline` + `enforce_provider_growth_stage` trigger |
| Readiness score (B) | `src/modules/providers/providerReadinessScore.ts` |
| Quality score (C) | `src/modules/providers/providerQualityScore.ts` |
| Funnel + profile score | `src/modules/growth/providerGrowth.ts` |
| Observability events (K) | `src/modules/providers/growthEvents.ts` |

## 4. Readiness score (B)

Weighted 0–100. Components: Profile 20 / Contact 10 / Address 10 / Images 10 / Services 15 / Brands 10 / Verification 15 / SEO 10.
Bands: `0–39 poor`, `40–59 needs_work`, `60–79 good`, `80–100 ready`.

## 5. Quality score (C)

0–100, capped penalties: duplicate 25 / missing 25 / invalid 25 / outdated 15 / enrichment 10.
Bands: `poor < 50`, `fair < 70`, `good < 85`, `excellent ≥ 85`.

## 6. Observability events (K, foundation)

`provider_discovered`, `provider_imported`, `provider_enriched`, `provider_review_requested`, `provider_verified`, `provider_published`, `provider_archived`. Wired in later phases.

## 7. Tests

- `src/tests/providerGrowthEngine1.test.ts` — existing helper-math + guardrails (unchanged).
- `src/tests/providerGrowthEngineFoundation1.test.ts` — Foundation checks for A, B, C, D, K.

## 8. Follow-ups

E `/admin/provider-growth` · G queue · H per-provider insights · I KPI dashboard · J help-center entries · K live event emission.