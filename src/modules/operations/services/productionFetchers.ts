/**
 * BUSINESS-OPERATIONS-2F — Production read-only fetchers for SLA candidates.
 *
 * This file is the ONLY app-side location that issues real Supabase reads
 * against the source domain tables in service of SLA sweep candidate
 * normalization. It is intentionally narrow:
 *
 *   - SELECT-only. No writes, no upserts, no RPC mutations.
 *   - Only the minimum columns needed by `candidateLoaders` normalizers.
 *   - No PII columns (no names, phones, emails, addresses, notes,
 *     message bodies, attachment paths, payment payloads).
 *   - Domain isolation audits (leads-quotes, contracts, memberships)
 *     allow this file by explicit ALLOWED_FILES entry — keep the
 *     allowlist surface minimal.
 *
 * Existing-alert snapshot loader also lives here so that the operations
 * dispatcher has a single read entry-point.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ExistingAlert } from './slaSweep';
import type {
  RowFetchers,
  QuoteRequestRow,
  BusinessStaffInvitationRow,
  ContractRow,
  PaymentIntentRow,
} from './candidateLoaders';

const HARD_ROW_CAP = 500;

function hoursAgoIso(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 36e5).toISOString();
}

// ── Per-condition production fetchers ─────────────────────────────────────

async function fetchLeadSubmittedNotViewed24h(
  now: Date,
): Promise<readonly QuoteRequestRow[]> {
  const cutoff = hoursAgoIso(now, 24);
  const { data, error } = await supabase
    .from('quote_requests')
    .select('id, created_at, status, user_id, target_entity_id')
    .in('status', ['submitted', 'pending', 'new', 'contacted'])
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(HARD_ROW_CAP);
  if (error) throw new Error(error.message);
  return (data ?? []) as QuoteRequestRow[];
}

async function fetchLeadContactedNoQuote72h(
  now: Date,
): Promise<readonly QuoteRequestRow[]> {
  const cutoff = hoursAgoIso(now, 72);
  const { data, error } = await supabase
    .from('quote_requests')
    .select('id, created_at, updated_at, status, user_id, target_entity_id')
    .in('status', ['contacted', 'in_progress'])
    .lte('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(HARD_ROW_CAP);
  if (error) throw new Error(error.message);
  return (data ?? []) as QuoteRequestRow[];
}

async function fetchInvitationPending7d(
  now: Date,
): Promise<readonly BusinessStaffInvitationRow[]> {
  const cutoff = hoursAgoIso(now, 24 * 7);
  const { data, error } = await supabase
    .from('business_staff_invitations')
    .select('id, created_at, status, business_id, expires_at')
    .in('status', ['pending', 'sent'])
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(HARD_ROW_CAP);
  if (error) throw new Error(error.message);
  return (data ?? []) as BusinessStaffInvitationRow[];
}

async function fetchContractPendingSignature7d(
  now: Date,
): Promise<readonly ContractRow[]> {
  const cutoff = hoursAgoIso(now, 24 * 7);
  const { data, error } = await supabase
    .from('contracts')
    .select(
      'id, created_at, status, provider_id, client_id, provider_accepted_at, client_accepted_at',
    )
    .eq('status', 'pending_approval')
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(HARD_ROW_CAP);
  if (error) throw new Error(error.message);
  return (data ?? []) as ContractRow[];
}

async function fetchPaymentIntentPending1h(
  now: Date,
): Promise<readonly PaymentIntentRow[]> {
  const cutoff = hoursAgoIso(now, 1);
  const { data, error } = await supabase
    .from('membership_payment_intents')
    .select('id, created_at, status, user_id, business_id, confirmed_at')
    .in('status', ['pending', 'processing', 'requires_action'])
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(HARD_ROW_CAP);
  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentIntentRow[];
}

/** All 5 production fetchers ready to inject into `loadSlaSweepCandidates`. */
export const PRODUCTION_ROW_FETCHERS: RowFetchers = {
  'lead.submitted_not_viewed_24h': fetchLeadSubmittedNotViewed24h,
  'lead.contacted_no_quote_72h': fetchLeadContactedNoQuote72h,
  'invitation.pending_7d': fetchInvitationPending7d,
  'contract.pending_signature_7d': fetchContractPendingSignature7d,
  'payment.intent_pending_1h': fetchPaymentIntentPending1h,
};

// ── Existing alert snapshot loader ────────────────────────────────────────

/**
 * Load open/acknowledged alerts as `ExistingAlert` shape for sweep
 * idempotency. RLS limits visibility (admins all, owner user, business
 * members). Reads only operational metadata; no message bodies.
 */
export async function loadExistingAlertSnapshots(): Promise<ExistingAlert[]> {
  const { data, error } = await supabase
    .from('operational_alerts')
    .select(
      'id, condition_code, entity_id, severity, status, triggered_at, idempotency_key',
    )
    .in('status', ['open', 'acknowledged'])
    .order('triggered_at', { ascending: false })
    .limit(HARD_ROW_CAP);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    conditionCode: r.condition_code,
    entityId: r.entity_id,
    severity: r.severity as ExistingAlert['severity'],
    status: r.status as ExistingAlert['status'],
    triggeredAt: r.triggered_at,
    idempotencyKey: r.idempotency_key,
  }));
}