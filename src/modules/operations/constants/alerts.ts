/**
 * BUSINESS-OPERATIONS-2B — Canonical constants for operational_alerts.
 * Mirror the CHECK constraints defined in the migration.
 */
export const OPERATIONAL_ALERT_SEVERITIES = [
  'info',
  'warning',
  'overdue',
  'critical',
] as const;
export type OperationalAlertSeverity =
  (typeof OPERATIONAL_ALERT_SEVERITIES)[number];

export const OPERATIONAL_ALERT_STATUSES = [
  'open',
  'acknowledged',
  'resolved',
  'dismissed',
] as const;
export type OperationalAlertStatus =
  (typeof OPERATIONAL_ALERT_STATUSES)[number];

export const OPERATIONAL_ALERT_DOMAINS = [
  'leads',
  'invitations',
  'contracts',
  'verification',
  'memberships',
  'payments',
  'support',
] as const;
export type OperationalAlertDomain =
  (typeof OPERATIONAL_ALERT_DOMAINS)[number];

export function isOperationalAlertSeverity(
  v: unknown,
): v is OperationalAlertSeverity {
  return (
    typeof v === 'string' &&
    (OPERATIONAL_ALERT_SEVERITIES as readonly string[]).includes(v)
  );
}

export function isOperationalAlertStatus(
  v: unknown,
): v is OperationalAlertStatus {
  return (
    typeof v === 'string' &&
    (OPERATIONAL_ALERT_STATUSES as readonly string[]).includes(v)
  );
}

export function isOperationalAlertDomain(
  v: unknown,
): v is OperationalAlertDomain {
  return (
    typeof v === 'string' &&
    (OPERATIONAL_ALERT_DOMAINS as readonly string[]).includes(v)
  );
}