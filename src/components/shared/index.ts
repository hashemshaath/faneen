/**
 * Shared presentation primitives used across Admin and User/Provider
 * dashboards. All entries here are visually unified (v3 — Soft & Modern,
 * Salla-like). Import from `@/components/shared` to guarantee consistency.
 */
export { PageHeader } from './PageHeader';
export { MetricCard, type MetricCardTone } from './MetricCard';
export { FiltersBar, type FilterPill } from './FiltersBar';
export { StatusBadge, type StatusTone } from './StatusBadge';
/**
 * EmptyState is an alias for the canonical DashboardEmptyState primitive,
 * surfaced from `@/components/shared` so callers have a single import path
 * alongside PageHeader/MetricCard/FiltersBar/StatusBadge.
 */
export {
  DashboardEmptyState as EmptyState,
  type DashboardEmptyStateProps as EmptyStateProps,
} from '@/components/dashboard/DashboardEmptyState';
export { ErrorRetryCard, type ErrorRetryCardProps } from './ErrorRetryCard';