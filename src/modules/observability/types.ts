/**
 * POST-LAUNCH-OBSERVABILITY-1 — shared types.
 *
 * All observability logic is pure. No Supabase imports anywhere in this
 * module. Callers pass already-fetched aggregates from canonical loaders
 * (data integrity, email log, provider growth, help intelligence, …).
 */

export type RunType =
  | 'daily_integrity'
  | 'manual_check'
  | 'email_health'
  | 'seo_check'
  | 'provider_growth'
  | 'customer_usage';

export const RUN_TYPES: ReadonlyArray<RunType> = [
  'daily_integrity',
  'manual_check',
  'email_health',
  'seo_check',
  'provider_growth',
  'customer_usage',
];

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface ObservabilityAlert {
  severity: AlertSeverity;
  code: string;
  /** Bilingual short label rendered by the UI. */
  label_ar: string;
  label_en: string;
  /** Optional numeric value (e.g. percentage). UI may or may not render. */
  value?: number;
}

export type SectionKey =
  | 'data_integrity'
  | 'email_delivery'
  | 'customer_experience'
  | 'provider_growth'
  | 'help_center'
  | 'seo'
  | 'operations';

export interface SectionSnapshot {
  key: SectionKey;
  status: HealthStatus;
  score: number;
  metrics: Record<string, number | string | null>;
}

export interface SystemHealthSnapshot {
  status: HealthStatus;
  score: number;
  sections: Record<SectionKey, SectionSnapshot>;
  alerts: ObservabilityAlert[];
  generatedAt: string;
}

/** Row shape returned by `operations_observability_log` SELECT. */
export interface ObservabilityLogRow {
  id: string;
  ref_id: string | null;
  run_type: RunType;
  status: HealthStatus;
  score: number;
  summary: Record<string, unknown>;
  alerts: ObservabilityAlert[] | unknown[];
  created_at: string;
  created_by: string | null;
}