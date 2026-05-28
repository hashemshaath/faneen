/**
 * BUSINESS-CORE-16 — Source-side audit emitter for lead (lead_requests)
 * lifecycle events that populate the Unified Operations Feed.
 *
 * Best-effort wrapper around `recordBusinessSourceAudit`. Two flavours:
 *   - `emitLeadCreated(...)` — used immediately after a successful
 *     `lead_requests` insert; takes the business_id + ref_id directly,
 *     so no extra read is needed.
 *   - `emitLeadStatusChanged(...)` — resolves business_id + ref_id from
 *     `lead_requests` for a status transition.
 *
 * Contract (matches BC-13/14/15 helpers):
 *   - Never throws. Audit failures must not break the parent mutation.
 *   - Never displays UUIDs (only validated `^[A-Z]{2,6}-[A-Z0-9]+$` refs).
 *   - Never includes PII / secrets / payment / token / message fields.
 */
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/modules/identity/services/session/getCurrentUser';
import { recordBusinessSourceAudit } from '@/modules/businesses/notes';

const SAFE_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

function pickSafeRef(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    const raw = (c ?? '').trim().toUpperCase();
    if (SAFE_REF.test(raw)) return raw;
  }
  return null;
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

export interface EmitLeadCreatedOptions {
  leadRequestId: string;
  businessId: string;
  refId?: string | null;
  status?: string | null;
}

export async function emitLeadCreated(
  opts: EmitLeadCreatedOptions,
): Promise<void> {
  try {
    if (!opts.leadRequestId || !opts.businessId) return;
    const { data: userRes } = await getCurrentUser();
    const uid = userRes?.user?.id ?? null;
    if (!uid) return;
    const metadata: Record<string, unknown> = {
      lead_ref_id: pickSafeRef(opts.refId),
      source_type: 'lead',
    };
    if (opts.status) metadata.new_status = opts.status;
    await recordBusinessSourceAudit({
      business_id: opts.businessId,
      actor_id: uid,
      entity_type: 'lead',
      entity_id: opts.leadRequestId,
      action: 'lead.created',
      metadata,
    });
  } catch {
    /* swallow — audit is observability-only */
  }
}

export interface EmitLeadStatusChangedOptions {
  leadRequestId: string;
  previousStatus?: string | null;
  newStatus?: string | null;
}

export async function emitLeadStatusChanged(
  opts: EmitLeadStatusChangedOptions,
): Promise<void> {
  try {
    if (!opts.leadRequestId) return;
    const row = await readLeadRequestSlim(opts.leadRequestId);
    if (!row?.business_id) return;
    const { data: userRes } = await getCurrentUser();
    const uid = userRes?.user?.id ?? null;
    if (!uid) return;
    const metadata: Record<string, unknown> = {
      lead_ref_id: pickSafeRef(row.ref_id, row.legacy_ref_id),
      source_type: 'lead',
    };
    if (opts.previousStatus) metadata.previous_status = opts.previousStatus;
    const newStatus = opts.newStatus ?? row.status ?? null;
    if (newStatus) metadata.new_status = newStatus;
    await recordBusinessSourceAudit({
      business_id: row.business_id,
      actor_id: uid,
      entity_type: 'lead',
      entity_id: row.id,
      action: 'lead.status_changed',
      metadata,
    });
  } catch {
    /* swallow — audit is observability-only */
  }
}