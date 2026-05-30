/**
 * POST-LAUNCH-OBSERVABILITY-1 — system health snapshot composer.
 *
 * Pure function: takes already-computed section snapshots and returns a
 * single SystemHealthSnapshot used by the Operations Center and the
 * `run_operations_observability_check` RPC summary.
 */
import type {
  HealthStatus,
  SectionKey,
  SectionSnapshot,
  SystemHealthSnapshot,
  ObservabilityAlert,
} from './types';

export interface HealthSnapshotInputs {
  integrity?: SectionSnapshot;
  providers?: SectionSnapshot;
  customers?: SectionSnapshot;
  helpCenter?: SectionSnapshot;
  seo?: SectionSnapshot;
  notifications?: SectionSnapshot;
  operations?: SectionSnapshot;
  alerts?: ObservabilityAlert[];
  /** Override generated timestamp (tests). */
  generatedAt?: string;
}

const empty = (key: SectionKey): SectionSnapshot => ({
  key,
  status: 'healthy',
  score: 100,
  metrics: {},
});

function statusFromScore(score: number): HealthStatus {
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'warning';
  return 'critical';
}

export function computeSystemHealthSnapshot(
  input: HealthSnapshotInputs,
): SystemHealthSnapshot {
  const sections: Record<SectionKey, SectionSnapshot> = {
    data_integrity: input.integrity ?? empty('data_integrity'),
    provider_growth: input.providers ?? empty('provider_growth'),
    customer_experience: input.customers ?? empty('customer_experience'),
    help_center: input.helpCenter ?? empty('help_center'),
    seo: input.seo ?? empty('seo'),
    email_delivery: input.notifications ?? empty('email_delivery'),
    operations: input.operations ?? empty('operations'),
  };

  const values = Object.values(sections);
  // Weighted average: critical sections (integrity, providers, email) count more.
  const weights: Partial<Record<SectionKey, number>> = {
    data_integrity: 2,
    provider_growth: 2,
    email_delivery: 2,
    operations: 1.5,
    customer_experience: 1,
    help_center: 1,
    seo: 1,
  };
  let weighted = 0;
  let totalWeight = 0;
  for (const s of values) {
    const w = weights[s.key] ?? 1;
    weighted += s.score * w;
    totalWeight += w;
  }
  let score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 100;

  // Floor: if any section is critical, snapshot cannot be healthy.
  const anyCritical = values.some((s) => s.status === 'critical');
  if (anyCritical) score = Math.min(score, 65);

  return {
    status: statusFromScore(score),
    score,
    sections,
    alerts: input.alerts ?? [],
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}

export { statusFromScore };