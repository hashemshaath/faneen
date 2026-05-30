/**
 * POST-LAUNCH-OBSERVABILITY-1 — read-only diagnostics bridge.
 *
 * Thin re-exports + a normalizer that flattens an integrity report into
 * the `DataIntegrityInputSummary` shape consumed by `computeDataIntegrityMetrics`.
 *
 * No DB calls here.
 */
import type { IntegritySummaryItem } from '@/modules/health/dataIntegrity';
import type { DataIntegrityInputSummary } from './metrics';

export function summarizeIntegrityReport(
  summary: IntegritySummaryItem[],
): DataIntegrityInputSummary {
  let red = 0;
  let amber = 0;
  let total = 0;
  for (const s of summary) {
    total += s.count;
    if (s.tone === 'red') red += s.count;
    else if (s.tone === 'amber') amber += s.count;
  }
  return { totalIssues: total, redCount: red, amberCount: amber };
}

export { runDataIntegrityChecks } from '@/modules/health/dataIntegrity';