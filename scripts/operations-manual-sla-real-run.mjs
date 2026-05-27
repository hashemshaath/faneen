#!/usr/bin/env node
/**
 * BUSINESS-OPERATIONS-2S — Server-only manual SLA real-run script skeleton.
 *
 * DEFAULTS FAIL CLOSED. This script does NOT execute alert writes on its
 * own. It only prints a readiness/denied report describing whether the
 * harness *could* run from this shell, given the current environment.
 *
 * Refuses to do anything beyond reporting unless ALL of the following are
 * true simultaneously (none of which this script will silently default):
 *   - OPERATIONS_REAL_RUN_ENABLED=true
 *   - OPERATIONS_MANUAL_HARNESS_CONFIRM=I-UNDERSTAND-THE-RISK
 *   - OPERATIONS_MANUAL_HARNESS_APPROVAL_JSON=<json approval payload>
 *   - Server/service context confirmed via OPERATIONS_EXEC_CONTEXT=server
 *
 * Even when all four are present, this 2S skeleton STILL refuses to wire
 * a live Supabase alert writer or audit writer. The actual invocation
 * path will be enabled in a later phase. This file exists to:
 *   - document the contract,
 *   - provide a single CLI entry point shape that future phases will
 *     wire dependencies into,
 *   - keep the failure mode loud, structured, and PII-free.
 *
 * Safety guarantees enforced here:
 *   - Never prints secrets / env values verbatim — only presence flags.
 *   - Never prints PII, recipient IDs, raw rows, or notification bodies.
 *   - Never schedules cron, never sends notifications, never mutates
 *     source-domain records.
 *   - Exit code is non-zero on every denial path so CI cannot mistake a
 *     denial for a successful run.
 */
import process from 'node:process';

const FLAG_REAL_RUN = 'OPERATIONS_REAL_RUN_ENABLED';
const FLAG_CONFIRM = 'OPERATIONS_MANUAL_HARNESS_CONFIRM';
const FLAG_APPROVAL = 'OPERATIONS_MANUAL_HARNESS_APPROVAL_JSON';
const FLAG_CONTEXT = 'OPERATIONS_EXEC_CONTEXT';

const CONFIRMATION_REQUIRED = 'I-UNDERSTAND-THE-RISK';

const env = process.env ?? {};

const checks = {
  realRunFlag: env[FLAG_REAL_RUN] === 'true',
  confirmToken: env[FLAG_CONFIRM] === CONFIRMATION_REQUIRED,
  approvalPresent: typeof env[FLAG_APPROVAL] === 'string' && env[FLAG_APPROVAL].length > 0,
  serverContext: env[FLAG_CONTEXT] === 'server',
};

const allGatesOpen = Object.values(checks).every(Boolean);

const report = {
  scope: 'manual_sla_real_run',
  mode: allGatesOpen ? 'gates_open_no_op' : 'denied',
  message: allGatesOpen
    ? 'All gates open, but 2S script skeleton does not wire a live writer. Refusing to execute.'
    : 'One or more required gates are closed. Refusing to execute.',
  checks,
  notifications: 'deferred',
  cron: 'disabled',
  uiExecution: 'disabled',
  sourceDomainMutations: 'forbidden',
  pii: 'never-printed',
};

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(allGatesOpen ? 2 : 1);