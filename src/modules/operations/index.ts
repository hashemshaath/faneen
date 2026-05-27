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

export {
  persistSlaRunLog,
  buildSafeRunLogSummary,
  createSupabaseSlaRunLogger,
  SLA_RUN_LOG_JOB_NAME,
  SLA_RUN_LOG_FUNCTION_NAME,
  type SafeRunLogSummary,
  type PersistSlaRunLogDeps,
  type PersistSlaRunLogResult,
} from './services/persistSlaRunLog';

export {
  loadSlaSweepCandidates,
  normalizeLeadSubmittedNotViewed24h,
  normalizeLeadContactedNoQuote72h,
  normalizeInvitationPending7d,
  normalizeContractPendingSignature7d,
  normalizePaymentIntentPending1h,
  type RowFetchers,
  type LoaderError,
  type LoadSlaSweepCandidatesInput,
  type LoadSlaSweepCandidatesResult,
  type QuoteRequestRow,
  type BusinessStaffInvitationRow,
  type ContractRow,
  type PaymentIntentRow,
  type SlaConditionCode,
} from './services/candidateLoaders';

export {
  PRODUCTION_ROW_FETCHERS,
  loadExistingAlertSnapshots,
} from './services/productionFetchers';

export {
  previewSlaSweepForAdmin,
  DEFAULT_PREVIEW_SAMPLE_LIMIT,
  type PreviewSlaSweepInput,
  type PreviewSlaSweepResult,
  type SafeActionSample,
} from './services/previewSlaSweepForAdmin';

export {
  createSupabaseAlertWriter,
  isStrictPromotion,
  type AlertWriter,
  type AlertWriteOutcome,
  type AlertWriteResult,
  type CreateOperationalAlertInput,
  type EscalateOperationalAlertInput,
  type ResolveOperationalAlertInput,
} from './services/alertWriters';

export {
  applySlaSweepPlan,
  APPLY_GATE_REQUIRES_NON_DRY_RUN,
  APPLY_GATE_REQUIRES_ENABLE_WRITES,
  type ApplySlaSweepPlanInput,
  type ApplySlaSweepPlanResult,
  type ApplySlaSweepPlanTotals,
  type SweepActionContent,
  type SweepActionContentBuilder,
} from './services/applySlaSweepPlan';

export {
  NON_DRY_RUN_REQUIRES_WRITER,
  NON_DRY_RUN_REQUIRES_ENABLE_WRITES,
} from './services/dispatchSlaSweep';

export {
  buildNotificationKey,
  defaultNotificationContent,
  createInAppNotificationDispatcher,
  type NotificationDispatcher,
  type NotificationDispatchOutcome,
  type NotificationDispatchResult,
  type NotificationRecipient,
  type InAppNotificationContent,
  type InAppNotificationSink,
  type NotificationContentBuilder,
} from './services/notificationDispatcher';

export {
  dispatchPlannedNotifications,
  NOTIFICATION_GATE_REQUIRES_NON_DRY_RUN,
  NOTIFICATION_GATE_REQUIRES_ENABLE_NOTIFICATION_WRITES,
  NOTIFICATION_GATE_REQUIRES_DISPATCHER,
  NOTIFICATION_GATE_REQUIRES_RESOLVER,
  type DispatchPlannedNotificationsInput,
  type DispatchPlannedNotificationsResult,
  type DispatchPlannedNotificationsTotals,
  type NotificationRecipientResolver,
} from './services/dispatchPlannedNotifications';

export {
  resolveSlaNotificationRecipients,
  createSafeSlaRecipientResolver,
  type AlertOwnershipSnapshot,
  type AlertOwnershipLookup,
  type BusinessOwnerLookup,
  type CreateRecipientResolverDeps,
  type RecipientResolverResult,
  type RecipientSourceReason,
  type ResolvedRecipient,
  type SafeNotificationRecipientResolver,
} from './services/notificationRecipients';

export {
  buildSafeSlaNotificationContent,
  createSafeSlaContentBuilder,
  safeSlaContentBuilder,
  type SafeSlaContentBuilderOptions,
  type SupportedLocale,
} from './services/notificationContent';