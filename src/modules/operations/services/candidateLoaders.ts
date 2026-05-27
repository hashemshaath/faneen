/**
 * BUSINESS-OPERATIONS-2E — SLA candidate snapshot loaders.
 *
 * Pure normalization layer that turns raw domain rows into the
 * `SweepCandidate` shape consumed by `evaluateSlaSweep`.
 *
 * Design constraints
 * ──────────────────
 *   - NO Supabase imports here (purity, audit safety, testability).
 *   - Row sources are injected via a `RowFetchers` map. Production wiring
 *     to real domain wrappers is intentionally deferred — defaults
 *     return empty arrays so the foundation cannot accidentally read or
 *     leak production data in 2E.
 *   - Normalizers must NOT include customer-identifying fields
 *     (name, phone, email) in `metadata`. Only opaque ids + status are
 *     allowed, since the planner only needs domain/condition/entity/age.
 *   - Loaders never mutate input rows.
 *
 * Partial-failure strategy
 * ────────────────────────
 *   `loadSlaSweepCandidates` returns BOTH partial results and a structured
 *   `loaderErrors` list. Callers can choose to ignore partial failures
 *   (for dry-run observability) or fail-closed at the orchestrator level.
 */
import {
  SLA_CONDITIONS,
  type SweepCandidate,
} from './slaSweep';

// ── Raw row shapes (minimal, snake_case mirrors of the source tables) ─────

export interface QuoteRequestRow {
  id: string;
  created_at: string;
  status: string;
  user_id?: string | null;
  target_entity_id?: string | null;
  /** Optional last-touched timestamp used by the contacted_no_quote variant. */
  updated_at?: string | null;
}

export interface BusinessStaffInvitationRow {
  id: string;
  created_at: string;
  status: string;
  business_id: string;
  expires_at?: string | null;
}

export interface ContractRow {
  id: string;
  created_at: string;
  status: string;
  provider_id?: string | null;
  client_id?: string | null;
  provider_accepted_at?: string | null;
  client_accepted_at?: string | null;
}

export interface PaymentIntentRow {
  id: string;
  created_at: string;
  status: string;
  user_id?: string | null;
  business_id?: string | null;
  confirmed_at?: string | null;
}

// ── Per-condition normalizers ─────────────────────────────────────────────

/** Statuses that are NOT eligible for SLA tracking once reached. */
const QUOTE_TERMINAL = new Set(['closed', 'completed', 'cancelled', 'converted']);
const INVITATION_TERMINAL = new Set(['accepted', 'expired', 'revoked', 'cancelled']);
const CONTRACT_SIGNED = new Set(['active', 'completed', 'cancelled', 'expired']);
const PAYMENT_TERMINAL = new Set(['succeeded', 'failed', 'cancelled', 'refunded', 'expired']);

export function normalizeLeadSubmittedNotViewed24h(
  row: QuoteRequestRow,
): SweepCandidate | null {
  const cond = SLA_CONDITIONS['lead.submitted_not_viewed_24h'];
  if (!cond) return null;
  const status = (row.status ?? '').toLowerCase();
  if (QUOTE_TERMINAL.has(status)) return null;
  const resolved = status !== 'submitted' && status !== 'pending' && status !== 'new';
  return {
    conditionCode: cond.code,
    entityId: row.id,
    conditionSince: row.created_at,
    ownerUserId: row.user_id ?? null,
    ownerBusinessId: row.target_entity_id ?? null,
    resolved,
  };
}

export function normalizeLeadContactedNoQuote72h(
  row: QuoteRequestRow,
): SweepCandidate | null {
  const cond = SLA_CONDITIONS['lead.contacted_no_quote_72h'];
  if (!cond) return null;
  const status = (row.status ?? '').toLowerCase();
  if (QUOTE_TERMINAL.has(status)) return null;
  // Only rows that have reached "contacted" but not yet "quoted".
  if (status !== 'contacted' && status !== 'in_progress') return null;
  return {
    conditionCode: cond.code,
    entityId: row.id,
    conditionSince: row.updated_at ?? row.created_at,
    ownerUserId: row.user_id ?? null,
    ownerBusinessId: row.target_entity_id ?? null,
    resolved: false,
  };
}

export function normalizeInvitationPending7d(
  row: BusinessStaffInvitationRow,
): SweepCandidate | null {
  const cond = SLA_CONDITIONS['invitation.pending_7d'];
  if (!cond) return null;
  const status = (row.status ?? '').toLowerCase();
  if (INVITATION_TERMINAL.has(status)) return null;
  return {
    conditionCode: cond.code,
    entityId: row.id,
    conditionSince: row.created_at,
    ownerBusinessId: row.business_id,
    resolved: status !== 'pending' && status !== 'sent',
  };
}

export function normalizeContractPendingSignature7d(
  row: ContractRow,
): SweepCandidate | null {
  const cond = SLA_CONDITIONS['contract.pending_signature_7d'];
  if (!cond) return null;
  const status = (row.status ?? '').toLowerCase();
  if (CONTRACT_SIGNED.has(status)) return null;
  const fullySigned = !!row.provider_accepted_at && !!row.client_accepted_at;
  return {
    conditionCode: cond.code,
    entityId: row.id,
    conditionSince: row.created_at,
    ownerUserId: row.provider_id ?? row.client_id ?? null,
    resolved: fullySigned,
  };
}

export function normalizePaymentIntentPending1h(
  row: PaymentIntentRow,
): SweepCandidate | null {
  const cond = SLA_CONDITIONS['payment.intent_pending_1h'];
  if (!cond) return null;
  const status = (row.status ?? '').toLowerCase();
  if (PAYMENT_TERMINAL.has(status)) return null;
  return {
    conditionCode: cond.code,
    entityId: row.id,
    conditionSince: row.created_at,
    ownerUserId: row.user_id ?? null,
    ownerBusinessId: row.business_id ?? null,
    resolved: status !== 'pending' && status !== 'processing' && status !== 'requires_action',
  };
}

// ── Aggregation ───────────────────────────────────────────────────────────

export type SlaConditionCode = keyof typeof SLA_CONDITIONS;

export interface RowFetchers {
  'lead.submitted_not_viewed_24h'?: (now: Date) => Promise<readonly QuoteRequestRow[]>;
  'lead.contacted_no_quote_72h'?: (now: Date) => Promise<readonly QuoteRequestRow[]>;
  'invitation.pending_7d'?: (now: Date) => Promise<readonly BusinessStaffInvitationRow[]>;
  'contract.pending_signature_7d'?: (now: Date) => Promise<readonly ContractRow[]>;
  'payment.intent_pending_1h'?: (now: Date) => Promise<readonly PaymentIntentRow[]>;
}

export interface LoaderError {
  conditionCode: string;
  message: string;
}

export interface LoadSlaSweepCandidatesInput {
  now: Date;
  /** When omitted, all known conditions are loaded. */
  enabled?: readonly SlaConditionCode[];
  fetchers?: RowFetchers;
}

export interface LoadSlaSweepCandidatesResult {
  candidates: SweepCandidate[];
  loaderErrors: LoaderError[];
  partial: boolean;
}

async function safeLoad<T>(
  code: string,
  fetcher: ((now: Date) => Promise<readonly T[]>) | undefined,
  now: Date,
  normalize: (row: T) => SweepCandidate | null,
  out: SweepCandidate[],
  errors: LoaderError[],
): Promise<void> {
  if (!fetcher) return;
  try {
    const rows = await fetcher(now);
    for (const row of rows) {
      const cand = normalize(row);
      if (cand) out.push(cand);
    }
  } catch (err) {
    errors.push({
      conditionCode: code,
      message: err instanceof Error ? err.message : 'unknown loader error',
    });
  }
}

/**
 * Load + normalize candidate snapshots across the enabled SLA conditions.
 * Returns partial results on per-loader failure (the orchestrator decides
 * whether to fail closed or continue with what is available).
 */
export async function loadSlaSweepCandidates(
  input: LoadSlaSweepCandidatesInput,
): Promise<LoadSlaSweepCandidatesResult> {
  const enabled = new Set<string>(
    input.enabled ?? (Object.keys(SLA_CONDITIONS) as SlaConditionCode[]),
  );
  const fetchers = input.fetchers ?? {};
  const out: SweepCandidate[] = [];
  const errors: LoaderError[] = [];

  await Promise.all([
    enabled.has('lead.submitted_not_viewed_24h')
      ? safeLoad(
          'lead.submitted_not_viewed_24h',
          fetchers['lead.submitted_not_viewed_24h'],
          input.now,
          normalizeLeadSubmittedNotViewed24h,
          out,
          errors,
        )
      : Promise.resolve(),
    enabled.has('lead.contacted_no_quote_72h')
      ? safeLoad(
          'lead.contacted_no_quote_72h',
          fetchers['lead.contacted_no_quote_72h'],
          input.now,
          normalizeLeadContactedNoQuote72h,
          out,
          errors,
        )
      : Promise.resolve(),
    enabled.has('invitation.pending_7d')
      ? safeLoad(
          'invitation.pending_7d',
          fetchers['invitation.pending_7d'],
          input.now,
          normalizeInvitationPending7d,
          out,
          errors,
        )
      : Promise.resolve(),
    enabled.has('contract.pending_signature_7d')
      ? safeLoad(
          'contract.pending_signature_7d',
          fetchers['contract.pending_signature_7d'],
          input.now,
          normalizeContractPendingSignature7d,
          out,
          errors,
        )
      : Promise.resolve(),
    enabled.has('payment.intent_pending_1h')
      ? safeLoad(
          'payment.intent_pending_1h',
          fetchers['payment.intent_pending_1h'],
          input.now,
          normalizePaymentIntentPending1h,
          out,
          errors,
        )
      : Promise.resolve(),
  ]);

  return { candidates: out, loaderErrors: errors, partial: errors.length > 0 };
}