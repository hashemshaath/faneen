/**
 * BUSINESS-OPERATIONS-2N — Real-run readiness guards (DISABLED by default).
 *
 * Central safety gate that prepares the architecture for future manual
 * real-run execution WITHOUT enabling it. All flags default to hard-OFF.
 *
 * SAFETY CONTRACT (do not weaken):
 *   - In any browser / window context: real-run is ALWAYS disabled.
 *   - Missing or malformed env vars => fail-closed (allowed: false).
 *   - Missing required confirmation token => fail-closed.
 *   - No Supabase imports. No I/O. No mutations.
 *   - Pure module: safe to import from anywhere, including the dashboard.
 */

export const OPERATIONS_REAL_RUN_FLAG = 'OPERATIONS_REAL_RUN_ENABLED' as const;
export const OPERATIONS_NOTIFICATION_WRITES_FLAG =
  'OPERATIONS_NOTIFICATION_WRITES_ENABLED' as const;
export const OPERATIONS_CRON_FLAG = 'OPERATIONS_CRON_ENABLED' as const;

export const OPERATIONS_GUARD_REASONS = {
  browserContext: 'real-run is disabled in browser context',
  missingEnv: 'required feature flag env var is missing',
  malformedEnv: 'required feature flag env var is malformed',
  flagDisabled: 'required feature flag is disabled',
  missingConfirmation: 'required explicit confirmation token is missing',
} as const;

export type OperationsGuardReason =
  (typeof OPERATIONS_GUARD_REASONS)[keyof typeof OPERATIONS_GUARD_REASONS];

export type OperationsFlagName =
  | typeof OPERATIONS_REAL_RUN_FLAG
  | typeof OPERATIONS_NOTIFICATION_WRITES_FLAG
  | typeof OPERATIONS_CRON_FLAG;

export interface OperationsGuardEnv {
  /** Optional env bag for tests / edge runtimes. Defaults to process.env. */
  env?: Record<string, string | undefined>;
  /** Optional explicit context override. Defaults to runtime detection. */
  context?: 'browser' | 'server';
  /** Explicit confirmation token, required for real-run gates. */
  confirmationToken?: string;
}

export interface OperationsGuardResult {
  allowed: false;
  reason: OperationsGuardReason;
  requiredFlags: readonly OperationsFlagName[];
  missingFlags: readonly OperationsFlagName[];
  context: 'browser' | 'server';
}

/** Detects whether the current runtime is a browser/window context. */
export function detectGuardContext(
  override?: 'browser' | 'server',
): 'browser' | 'server' {
  if (override) return override;
  return typeof window !== 'undefined' ? 'browser' : 'server';
}

function readEnv(env: OperationsGuardEnv['env']): Record<string, string | undefined> {
  if (env) return env;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (globalThis as any).process;
    if (p && typeof p === 'object' && p.env) return p.env as Record<string, string | undefined>;
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Strict boolean parsing: accepts ONLY the exact string `'true'`. Anything
 * else (undefined, '1', 'TRUE', 'yes', '', random) is treated as disabled.
 * Malformed values (non-string) are rejected via `malformedEnv`.
 */
function parseStrictFlag(
  raw: unknown,
): { state: 'unset' | 'malformed' | 'disabled' | 'enabled' } {
  if (raw === undefined || raw === null) return { state: 'unset' };
  if (typeof raw !== 'string') return { state: 'malformed' };
  if (raw === 'true') return { state: 'enabled' };
  if (raw === 'false' || raw === '') return { state: 'disabled' };
  // Any other string is treated as malformed to avoid silent accidental enables.
  return { state: 'malformed' };
}

function deny(
  reason: OperationsGuardReason,
  requiredFlags: readonly OperationsFlagName[],
  missingFlags: readonly OperationsFlagName[],
  context: 'browser' | 'server',
): OperationsGuardResult {
  return { allowed: false, reason, requiredFlags, missingFlags, context };
}

/** Real-run dispatch gate. Always denies in this phase. */
export function checkOperationsRealRunAllowed(
  opts: OperationsGuardEnv = {},
): OperationsGuardResult {
  const context = detectGuardContext(opts.context);
  const required: readonly OperationsFlagName[] = [OPERATIONS_REAL_RUN_FLAG];

  if (context === 'browser') {
    return deny(OPERATIONS_GUARD_REASONS.browserContext, required, required, context);
  }
  const env = readEnv(opts.env);
  const parsed = parseStrictFlag(env[OPERATIONS_REAL_RUN_FLAG]);
  if (parsed.state === 'unset') {
    return deny(OPERATIONS_GUARD_REASONS.missingEnv, required, required, context);
  }
  if (parsed.state === 'malformed') {
    return deny(OPERATIONS_GUARD_REASONS.malformedEnv, required, required, context);
  }
  if (parsed.state === 'disabled') {
    return deny(OPERATIONS_GUARD_REASONS.flagDisabled, required, required, context);
  }
  // Even when the flag is enabled, an explicit confirmation token is required.
  if (!opts.confirmationToken || typeof opts.confirmationToken !== 'string') {
    return deny(
      OPERATIONS_GUARD_REASONS.missingConfirmation,
      required,
      [],
      context,
    );
  }
  // Phase 2N keeps the real-run path STRUCTURALLY denied even when flags
  // align — production approval is required. Returning `allowed: false`
  // here preserves the fail-closed contract while exposing the reason.
  return deny(OPERATIONS_GUARD_REASONS.flagDisabled, required, required, context);
}

/** Notification writes gate (independent of real-run). Always denies. */
export function checkOperationsNotificationWritesAllowed(
  opts: OperationsGuardEnv = {},
): OperationsGuardResult {
  const context = detectGuardContext(opts.context);
  const required: readonly OperationsFlagName[] = [OPERATIONS_NOTIFICATION_WRITES_FLAG];
  if (context === 'browser') {
    return deny(OPERATIONS_GUARD_REASONS.browserContext, required, required, context);
  }
  const env = readEnv(opts.env);
  const parsed = parseStrictFlag(env[OPERATIONS_NOTIFICATION_WRITES_FLAG]);
  if (parsed.state === 'unset') {
    return deny(OPERATIONS_GUARD_REASONS.missingEnv, required, required, context);
  }
  if (parsed.state !== 'enabled') {
    return deny(
      parsed.state === 'malformed'
        ? OPERATIONS_GUARD_REASONS.malformedEnv
        : OPERATIONS_GUARD_REASONS.flagDisabled,
      required,
      required,
      context,
    );
  }
  return deny(OPERATIONS_GUARD_REASONS.flagDisabled, required, required, context);
}

/** Cron scheduling gate. Always denies. */
export function checkOperationsCronAllowed(
  opts: OperationsGuardEnv = {},
): OperationsGuardResult {
  const context = detectGuardContext(opts.context);
  const required: readonly OperationsFlagName[] = [OPERATIONS_CRON_FLAG];
  if (context === 'browser') {
    return deny(OPERATIONS_GUARD_REASONS.browserContext, required, required, context);
  }
  const env = readEnv(opts.env);
  const parsed = parseStrictFlag(env[OPERATIONS_CRON_FLAG]);
  if (parsed.state === 'unset') {
    return deny(OPERATIONS_GUARD_REASONS.missingEnv, required, required, context);
  }
  if (parsed.state !== 'enabled') {
    return deny(
      parsed.state === 'malformed'
        ? OPERATIONS_GUARD_REASONS.malformedEnv
        : OPERATIONS_GUARD_REASONS.flagDisabled,
      required,
      required,
      context,
    );
  }
  return deny(OPERATIONS_GUARD_REASONS.flagDisabled, required, required, context);
}

// ─────────────────────────────────────────────────────────────────────────
// Read-only readiness checker (BUSINESS-OPERATIONS-2N)
// ─────────────────────────────────────────────────────────────────────────

export interface OperationsRealRunReadiness {
  context: 'browser' | 'server';
  realRun: {
    allowed: false;
    flag: OperationsFlagName;
    state: 'disabled';
    reason: OperationsGuardReason;
  };
  notificationWrites: {
    allowed: false;
    flag: OperationsFlagName;
    state: 'disabled';
    reason: OperationsGuardReason;
  };
  cron: {
    allowed: false;
    flag: OperationsFlagName;
    state: 'disabled';
    reason: OperationsGuardReason;
  };
  capabilities: {
    alertWriterAvailable: boolean;
    notificationDispatcherAvailable: boolean;
    recipientResolverAvailable: boolean;
    loggerAvailable: boolean;
  };
  uiControls: {
    realRunButton: 'hidden';
    cronButton: 'hidden';
    notificationSendButton: 'hidden';
    alertMutationButton: 'hidden';
    manualPreviewLedger: 'enabled';
    dryRunPreview: 'enabled';
  };
  recommendation: string;
}

export interface GetOperationsRealRunReadinessOptions extends OperationsGuardEnv {
  /** Static availability flags — provided by callers that know which
   * services are wired. Defaults assume the canonical wiring exists. */
  capabilities?: Partial<OperationsRealRunReadiness['capabilities']>;
}

const DEFAULT_CAPABILITIES: OperationsRealRunReadiness['capabilities'] = {
  // These reflect the canonical operations module wiring. They describe
  // *availability*, not *authorization* — the guards above remain the
  // sole source of truth for whether anything is allowed to run.
  alertWriterAvailable: true,
  notificationDispatcherAvailable: true,
  recipientResolverAvailable: true,
  loggerAvailable: true,
};

export function getOperationsRealRunReadiness(
  opts: GetOperationsRealRunReadinessOptions = {},
): OperationsRealRunReadiness {
  const context = detectGuardContext(opts.context);
  const realRun = checkOperationsRealRunAllowed(opts);
  const notif = checkOperationsNotificationWritesAllowed(opts);
  const cron = checkOperationsCronAllowed(opts);
  return {
    context,
    realRun: {
      allowed: false,
      flag: OPERATIONS_REAL_RUN_FLAG,
      state: 'disabled',
      reason: realRun.reason,
    },
    notificationWrites: {
      allowed: false,
      flag: OPERATIONS_NOTIFICATION_WRITES_FLAG,
      state: 'disabled',
      reason: notif.reason,
    },
    cron: {
      allowed: false,
      flag: OPERATIONS_CRON_FLAG,
      state: 'disabled',
      reason: cron.reason,
    },
    capabilities: { ...DEFAULT_CAPABILITIES, ...(opts.capabilities ?? {}) },
    uiControls: {
      realRunButton: 'hidden',
      cronButton: 'hidden',
      notificationSendButton: 'hidden',
      alertMutationButton: 'hidden',
      manualPreviewLedger: 'enabled',
      dryRunPreview: 'enabled',
    },
    recommendation:
      'Continue using dry-run preview until explicit production approval.',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Higher-level guarded wrapper (BUSINESS-OPERATIONS-2N)
// ─────────────────────────────────────────────────────────────────────────

import {
  dispatchSlaSweep,
  type DispatchSlaSweepInput,
  type DispatchSlaSweepResult,
} from './dispatchSlaSweep';

export interface GuardedDispatchSlaSweepInput extends DispatchSlaSweepInput {
  guardEnv?: OperationsGuardEnv;
}

export interface GuardedDispatchSlaSweepResult {
  ok: boolean;
  guard: OperationsGuardResult | null;
  result?: DispatchSlaSweepResult;
}

/**
 * Wraps `dispatchSlaSweep` with the real-run guard. Dry-run requests are
 * ALWAYS permitted — they never depend on the real-run flag. Non-dry-run
 * requests fail-closed unless the guard explicitly allows them (which it
 * never does in phase 2N).
 */
export async function guardedDispatchSlaSweep(
  input: GuardedDispatchSlaSweepInput,
): Promise<GuardedDispatchSlaSweepResult> {
  const dryRun = input.dryRun ?? true;
  if (dryRun) {
    const result = await dispatchSlaSweep({ ...input, dryRun: true });
    return { ok: true, guard: null, result };
  }
  const guard = checkOperationsRealRunAllowed(input.guardEnv ?? {});
  // Phase 2N: guard always denies non-dry-run. Refuse to even invoke
  // dispatchSlaSweep when the feature flag is off.
  return { ok: false, guard };
}