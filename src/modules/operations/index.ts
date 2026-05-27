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
  buildRecipientNotificationKey,
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
  createSafeSlaMultiRecipientResolver,
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

export {
  useAdminOperationsPreview,
  ADMIN_OPERATIONS_PREVIEW_QUERY_KEY,
  useRecentManualSlaPreviewRuns,
  RECENT_MANUAL_PREVIEW_RUNS_QUERY_KEY,
  type UseAdminOperationsPreviewOptions,
  type UseAdminOperationsPreviewResult,
  type UseRecentManualPreviewRunsOptions,
  type UseRecentManualPreviewRunsResult,
} from './hooks/useAdminOperationsPreview';

export {
  logManualSlaPreviewRun,
  buildManualPreviewSummary,
  MANUAL_PREVIEW_RUN_TYPE,
  MANUAL_PREVIEW_JOB_NAME,
  MANUAL_PREVIEW_FUNCTION_NAME,
  type ManualPreviewLedgerSummary,
  type ManualPreviewLedgerTotals,
  type LogManualPreviewInput,
  type LogManualPreviewResult,
  type LogManualPreviewDeps,
} from './services/logManualSlaPreviewRun';

export {
  listManualSlaPreviewRuns,
  MANUAL_PREVIEW_RUNS_CAP,
  type ManualPreviewRunSummary,
  type ListManualPreviewRunsResult,
  type ListManualPreviewRunsDeps,
} from './services/listManualSlaPreviewRuns';

export {
  OPERATIONS_REAL_RUN_FLAG,
  OPERATIONS_NOTIFICATION_WRITES_FLAG,
  OPERATIONS_CRON_FLAG,
  OPERATIONS_GUARD_REASONS,
  detectGuardContext,
  checkOperationsRealRunAllowed,
  checkOperationsNotificationWritesAllowed,
  checkOperationsCronAllowed,
  getOperationsRealRunReadiness,
  guardedDispatchSlaSweep,
  type OperationsGuardReason,
  type OperationsFlagName,
  type OperationsGuardEnv,
  type OperationsGuardResult,
  type OperationsRealRunReadiness,
  type GetOperationsRealRunReadinessOptions,
  type GuardedDispatchSlaSweepInput,
  type GuardedDispatchSlaSweepResult,
} from './services/operationsRunGuards';

export {
  requestManualRealRun,
  evaluateProductionApproval,
  MANUAL_REAL_RUN_SCOPE,
  MANUAL_REAL_RUN_REJECTION_REASONS,
  type OperationsProductionApproval,
  type ManualRealRunRequest,
  type ManualRealRunResult,
  type ManualRealRunRejectionReason,
  type ManualRealRunDeps,
  type OperationsApprovalAuditWriter,
} from './services/manualRealRunRequest';

export {
  logOperationsApprovalAudit,
  buildApprovalAuditSummary,
  OPERATIONS_APPROVAL_AUDIT_JOB_NAME,
  OPERATIONS_APPROVAL_AUDIT_FUNCTION_NAME,
  OPERATIONS_APPROVAL_AUDIT_EVENTS,
  type OperationsApprovalAuditEvent,
  type OperationsApprovalAuditStatus,
  type OperationsApprovalAuditSummary,
  type LogOperationsApprovalAuditInput,
  type LogOperationsApprovalAuditResult,
  type LogOperationsApprovalAuditDeps,
} from './services/logOperationsApprovalAudit';

export {
  listOperationsApprovalAudit,
  OPERATIONS_APPROVAL_AUDIT_CAP,
  type OperationsApprovalAuditEntry,
  type ListOperationsApprovalAuditResult,
  type ListOperationsApprovalAuditDeps,
} from './services/listOperationsApprovalAudit';

export {
  useOperationsApprovalAudit,
  OPERATIONS_APPROVAL_AUDIT_QUERY_KEY,
  type UseOperationsApprovalAuditOptions,
  type UseOperationsApprovalAuditResult,
} from './hooks/useOperationsApprovalAudit';

export {
  handleManualRealRunEndpoint,
  validateManualRealRunEndpointRequest,
  MANUAL_REAL_RUN_ENDPOINT_DISABLED_REASON,
  MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS,
  type ManualRealRunEndpointRequest,
  type ManualRealRunEndpointResponse,
  type ManualRealRunEndpointContext,
  type ManualRealRunEndpointContextRole,
  type ManualRealRunEndpointExecutionContext,
  type ManualRealRunEndpointSource,
  type ManualRealRunEndpointRejectionReason,
  type ManualRealRunEndpointDeps,
  type ManualRealRunEndpointAuditWriter,
} from './services/manualRealRunEndpointContract';

export {
  executeManualSlaRealRun,
  EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS,
  NOTIFICATION_WRITES_DEFERRED_REASON,
  type ExecuteManualSlaRealRunInput,
  type ExecuteManualSlaRealRunResult,
  type ExecuteManualSlaRealRunContext,
  type ExecuteManualSlaRealRunContextRole,
  type ExecuteManualSlaRealRunRejectionReason,
} from './services/executeManualSlaRealRun';