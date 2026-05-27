/**
 * Module: operations (BUSINESS-OPERATIONS-2B)
 *
 * Foundation only — read wrappers and constants. No mutations,
 * notifications, emails, cron, or admin UI in this phase.
 */
export {
  OPERATIONAL_ALERT_SEVERITIES,
  OPERATIONAL_ALERT_STATUSES,
  OPERATIONAL_ALERT_DOMAINS,
  isOperationalAlertSeverity,
  isOperationalAlertStatus,
  isOperationalAlertDomain,
  type OperationalAlertSeverity,
  type OperationalAlertStatus,
  type OperationalAlertDomain,
} from './constants/alerts';

export {
  listOperationalAlerts,
  type ListOperationalAlertsArgs,
} from './services/listOperationalAlerts';
export {
  getOperationalAlertById,
  type GetOperationalAlertByIdArgs,
} from './services/getOperationalAlertById';

export {
  evaluateSlaSweep,
  buildIdempotencyKey,
  isKnownSlaCondition,
  SLA_CONDITIONS,
  type SlaCondition,
  type SweepCandidate,
  type ExistingAlert,
  type SweepInput,
  type SweepAction,
  type SweepActionKind,
  type SweepPlan,
} from './services/slaSweep';

export {
  planNotifications,
  type PlannedNotification,
  type PlannedNotificationChannel,
  type NotificationPlan,
} from './services/planNotifications';

export {
  dispatchSlaSweep,
  NON_DRY_RUN_NOT_ENABLED,
  type DispatchSlaSweepInput,
  type DispatchSlaSweepResult,
  type SlaRunLogger,
  type SlaRunLogRecord,
} from './services/dispatchSlaSweep';