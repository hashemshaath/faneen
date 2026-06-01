# Performance Audit — PERFORMANCE-ACCESSIBILITY-FINAL-1

Scope: route bundles, lazy loading, Suspense, heavy imports, image strategy,
fonts, repeated work, oversized components. Audit only — no business changes.

## Method

- Inspected `src/App.tsx` route registration.
- Searched for heavy direct imports (`recharts`, `leaflet`, `jspdf`, `marked`)
  in `src/pages` and `src/components`.
- Reviewed image strategy via `scripts/image-alt-audit.mjs` and
  `src/components/ui/lazy-image.tsx`.
- Cross-referenced `src/__tests__/cwv-optimizations.test.ts`.

## Findings

| # | Area | Severity | Finding | Status |
|---|------|----------|---------|--------|
| 1 | Routes | n/a | All 100+ pages in `App.tsx` are registered via `lazyRetry`. No eager page imports. | PASS |
| 2 | Suspense | n/a | Top-level `<Suspense fallback={<PageLoader />}>` wraps `<Routes>`; aux widgets get their own `<Suspense fallback={null}>`. | PASS |
| 3 | Charts | n/a | `recharts` is not imported eagerly anywhere in pages/shared components; isolated in `vendor-charts`. Dashboard overview splits per-role views via lazyRetry. | PASS |
| 4 | Maps | n/a | `SearchMap` (leaflet) lazy-loaded inside `SearchResults`. Enforced by CWV test. | PASS |
| 5 | PDF | n/a | `jspdf` / `jspdf-autotable` isolated in `vendor-pdf`; only consumed inside contract export modules behind user gestures. | PASS |
| 6 | Markdown | n/a | `marked` + `highlight.js` isolated in `vendor-markdown`; consumed only by lazy blog/help renderers. | PASS |
| 7 | Icons | low | `lucide-react` tree-shaken via named imports; vendor chunk preserves long-term cache. | PASS |
| 8 | Hero image | n/a | `HomeV2` preloads slide 1 (LCP) and lazy-loads slides 2+. Enforced by CWV test. | PASS |
| 9 | Below-the-fold | n/a | `content-visibility: auto` via `.cv-auto` utility. | PASS |
| 10 | RUM | n/a | `startWebVitals()` ships LCP/CLS/INP/FCP/TTFB via `sendBeacon`. | PASS |
| 11 | Manual chunks | n/a | `vite.config.ts` splits react/query/supabase/radix/markdown/leaflet/dnd/dompurify/recharts/jspdf/date-fns/icons. `chunkSizeWarningLimit: 500`. | PASS |
| 12 | LazyImage | n/a | IntersectionObserver-based, blur-up placeholder, respects fetchpriority/eager. | PASS |
| 13 | Per-role overview | n/a | `DashboardOverview` Suspense-splits Admin/Provider/User views. | PASS |

## Classification summary

Critical 0, High 0, Medium 0, Low 0, Deferred 0.

## Outcome

Performance posture is launch-ready. No business-logic changes required.
Invariants pinned by `src/__tests__/cwv-optimizations.test.ts` and the new
`src/tests/performanceAccessibilityFinal1.test.ts`.
