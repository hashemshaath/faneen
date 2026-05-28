/**
 * BUSINESS-CORE-15 — Source-side audit emitter for quote (lead_request) lifecycle.
 *
 * Best-effort wrapper around `recordBusinessSourceAudit`. Resolves the
 * owning provider business + safe ref_id from `lead_requests`, then emits
 * one of the quote.* actions to populate the Unified Operations Feed.
 *
 * Contract:
 *   - Never throws. Audit failures must not break the parent mutation.
 *   - Never displays UUIDs (only validated `^[A-Z]{2,6}-[A-Z0-9]+$` refs).
 *   - Never includes PII / secrets / payment data. Callers must only pass
 *     status / ref-shaped scalars in `extra`.
 *
 * Quote-request rows themselves are not business-scoped, so quote.created
 * on customer submission is intentionally NOT emitted here — there is no
 * unambiguous owning business at submission time. Lead-side instrumentation
 * (BUSINESS-CORE-16) will cover the provider-fanout lifecycle.
 */
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/modules/identity/services/session/getCurrentUser';
import {
  recordBusinessSourceAudit,
  type BusinessSourceAuditAction,
} from '@/modules/businesses/notes';

const SAFE_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

export interface EmitQuoteAuditOptions {
  /** lead_requests.id — the provider-scoped row that anchors the audit. */
  leadRequestId: string;
  action: Extract<
    BusinessSourceAuditAction,
    'quote.updated' | 'quote.responded'
  >;
  previousStatus?: string | null;
  newStatus?: string | null;
  extra?: Record<string, unknown>;
}

interface LeadRequestSlim {
  id: string;
  business_id: string | null;
  ref_id: string | null;
  legacy_ref_id: string | null;
  status: string | null;
}

async function readLeadRequestSlim(
  leadRequestId: string,
): Promise<LeadRequestSlim | null> {
  try {
    const { data, error } = await supabase
      .from('lead_requests')
      .select('id, business_id, ref_id, legacy_ref_id, status')
      .eq('id', leadRequestId)
      .maybeSingle();
    if (error) return null;
    return (data ?? null) as LeadRequestSlim | null;
  } catch {
    return null;
  }
}

export async function readLeadRequestStatusSafe(
  leadRequestId: string,
): Promise<string | null> {
  const row = await readLeadRequestSlim(leadRequestId);
  return row?.status ?? null;
}

export async function emitQuoteAudit(
  opts: EmitQuoteAuditOptions,
): Promise<void> {
  try {
    if (!opts.leadRequestId) return;
    const row = await readLeadRequestSlim(opts.leadRequestId);
    if (!row?.business_id) return;
    const { data: userRes } = await getCurrentUser();
    const uid = userRes?.user?.id ?? null;
    if (!uid) return;
    const rawRef = (row.ref_id ?? row.legacy_ref_id ?? '').trim().toUpperCase();
    const quoteRefId = SAFE_REF.test(rawRef) ? rawRef : null;
    const metadata: Record<string, unknown> = {
      quote_ref_id: quoteRefId,
      source_type: 'quote',
    };
    if (opts.previousStatus) metadata.previous_status = opts.previousStatus;
    const newStatus = opts.newStatus ?? row.status ?? null;
    if (newStatus) metadata.new_status = newStatus;
    if (opts.extra) {
      for (const [k, v] of Object.entries(opts.extra)) {
        if (v !== undefined && v !== null) metadata[k] = v;
      }
    }
    await recordBusinessSourceAudit({
      business_id: row.business_id,
      actor_id: uid,
      entity_type: 'quote',
      entity_id: row.id,
      action: opts.action,
      metadata,
    });
  } catch {
    /* swallow — audit is observability-only */
  }
}