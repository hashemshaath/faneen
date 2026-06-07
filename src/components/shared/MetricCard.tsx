/**
 * Shared MetricCard — Salla-like KPI tile for dashboard pages.
 * Same visual as `AdminKpiCard` (top-right trend chip, rounded-2xl
 * icon tile, tabular numeric value). Renamed to `MetricCard` so it
 * doesn't clash with the older compact `KpiCard` strip primitive.
 */
export { AdminKpiCard as MetricCard, default } from '@/components/admin/AdminKpiCard';
export type { AdminKpiTone as MetricCardTone } from '@/components/admin/AdminKpiCard';