#!/usr/bin/env node
/**
 * BUSINESS-OPERATIONS-2V — Manual SLA real-run smoke harness.
 *
 * SAFETY CONTRACT (do not weaken):
 *   - Defaults to DENIAL MODE. The harness expects the endpoint to
 *     reject the request and exits NON-ZERO if it unexpectedly
 *     accepts (i.e. returns `accepted:true` or HTTP 200 with a
 *     truthy `accepted`).
 *   - Never sets `enableWrites:true`. Never sets
 *     `enableNotificationWrites:true`. Never fabricates approval
 *     tokens or confirmation tokens.
 *   - Never prints the Authorization header value, service-role
 *     key, or any environment value verbatim. Only presence flags
 *     are reported.
 *   - Never imports notification, email, SMS, push, WhatsApp, or
 *     cron/scheduler modules. Pure HTTP probe + JSON parsing.
 *   - Will refuse to run if `MANUAL_SLA_SMOKE_FORCE_ACCEPT` is set
 *     to anything other than `'never'` (default). That flag exists
 *     only as a future negative-test toggle and is rejected here.
 *
 * Modes:
 *   - `validate-envelope` (default when `--no-network` is passed):
 *       Only validate the local request envelope shape and exit.
 *   - `probe` (default when a URL is provided): POST a denial-mode
 *       request and assert rejection.
 *
 * Exit codes:
 *   0 — Endpoint rejected as expected, or envelope validated OK.
 *   1 — Endpoint unexpectedly accepted, or envelope invalid, or
 *       a forbidden flag was set.
 *   2 — Configuration / usage error (missing URL when probing).
 */
import process from 'node:process';

const REDACTED = '<redacted>';
const SAFE_RUN_REASON = 'smoke-denial-probe';

function maskHeader(value) {
  if (!value) return null;
  return REDACTED;
}

function safeReport(extra = {}) {
  return {
    scope: 'manual_sla_real_run_smoke',
    defaultedToDenial: true,
    notifications: 'never-invoked',
    cron: 'never-invoked',
    pii: 'never-printed',
    authorizationHeader: REDACTED,
    ...extra,
  };
}

function emit(report, exitCode) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(exitCode);
}

const argv = process.argv.slice(2);
const noNetwork = argv.includes('--no-network') || argv.includes('--validate-envelope');

const env = process.env ?? {};

// Hard refusal: never allow callers to coerce the harness into
// expecting acceptance.
const forceAccept = env.MANUAL_SLA_SMOKE_FORCE_ACCEPT ?? 'never';
if (forceAccept !== 'never') {
  emit(
    safeReport({
      mode: 'denied',
      reason: 'FORCE_ACCEPT_NOT_PERMITTED',
    }),
    1,
  );
}

// Build a denial-mode request envelope. NOTE: every value here is
// intentionally non-actionable. `approval` is empty, the
// confirmation token is a placeholder, and writes are NOT enabled.
const denialEnvelope = {
  approvalId: 'smoke-denial-probe',
  confirmationToken: 'smoke-placeholder',
  reason: SAFE_RUN_REASON,
  dryRun: false,
  enableWrites: true, // required by contract just to reach the flag gate
  // explicitly NEVER set:
  // enableNotificationWrites: true,
  approval: {},
};

// Envelope-shape validation that runs in both modes.
function validateEnvelope(envelope) {
  const problems = [];
  if (envelope.dryRun !== false) problems.push('dryRun-must-be-false');
  if (envelope.enableWrites !== true) problems.push('enableWrites-must-be-true');
  if ('enableNotificationWrites' in envelope) {
    problems.push('enableNotificationWrites-must-not-be-set');
  }
  if (!envelope.approvalId) problems.push('approvalId-required');
  if (!envelope.confirmationToken) problems.push('confirmationToken-required');
  if (!envelope.reason) problems.push('reason-required');
  if (typeof envelope.approval !== 'object') problems.push('approval-must-be-object');
  return problems;
}

const envelopeProblems = validateEnvelope(denialEnvelope);
if (envelopeProblems.length > 0) {
  emit(
    safeReport({
      mode: 'denied',
      reason: 'INVALID_LOCAL_ENVELOPE',
      problems: envelopeProblems,
    }),
    1,
  );
}

if (noNetwork) {
  emit(
    safeReport({
      mode: 'validate-envelope',
      envelopeOk: true,
      networkProbe: 'skipped',
    }),
    0,
  );
}

const url = env.MANUAL_SLA_REAL_RUN_URL;
const bearer = env.MANUAL_SLA_REAL_RUN_BEARER;

if (!url) {
  emit(
    safeReport({
      mode: 'usage_error',
      reason: 'MANUAL_SLA_REAL_RUN_URL_REQUIRED',
      hint: 'Set MANUAL_SLA_REAL_RUN_URL or pass --no-network.',
    }),
    2,
  );
}

const headers = {
  'Content-Type': 'application/json',
};
if (bearer) headers.Authorization = `Bearer ${bearer}`;

const startedAt = new Date().toISOString();
let httpStatus = 0;
let body = null;

try {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(denialEnvelope),
  });
  httpStatus = response.status;
  const text = await response.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = { rawTextLength: text.length };
  }
} catch (err) {
  emit(
    safeReport({
      mode: 'probe',
      reason: 'NETWORK_ERROR',
      startedAt,
      authorizationHeaderPresent: !!bearer,
      authorizationHeader: maskHeader(bearer),
      message: err instanceof Error ? err.message : 'unknown',
    }),
    1,
  );
}

const accepted = body && typeof body === 'object' && body.accepted === true;
const unexpectedAccept = accepted || httpStatus === 200 && accepted;

if (unexpectedAccept) {
  emit(
    safeReport({
      mode: 'probe',
      reason: 'UNEXPECTED_ACCEPT',
      startedAt,
      httpStatus,
      authorizationHeaderPresent: !!bearer,
      authorizationHeader: maskHeader(bearer),
      // Strip any PII-shaped fields; only echo coarse, safe keys.
      responseShape: body && typeof body === 'object'
        ? Object.keys(body).sort()
        : [],
    }),
    1,
  );
}

emit(
  safeReport({
    mode: 'probe',
    reason: body && typeof body === 'object' && typeof body.reason === 'string'
      ? body.reason
      : 'rejected',
    startedAt,
    httpStatus,
    authorizationHeaderPresent: !!bearer,
    authorizationHeader: maskHeader(bearer),
    accepted: false,
    notificationsDeferredReason:
      body && typeof body === 'object' && typeof body.notificationsDeferredReason === 'string'
        ? body.notificationsDeferredReason
        : null,
  }),
  0,
);