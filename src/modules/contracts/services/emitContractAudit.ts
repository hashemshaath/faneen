/**
 * BUSINESS-CORE-14 — Source-side audit emitter for contract lifecycle.
 *
 * Best-effort wrapper around `recordBusinessSourceAudit`. Resolves the
 * owning business + safe contract_number via the existing RLS-gated
 * `getContractById` wrapper, then emits one of the contract.* actions.
 *
 * Contract:
 *   - Never throws. Audit failures must not break the parent mutation.
 *   - Never displays UUIDs (only validated `^[A-Z]{2,6}-[A-Z0-9]+$` refs).
 *   - Never includes PII / secrets / payment data — the helper itself
 *     sanitizes, but callers are still expected to pass only safe fields.
 */
import { getContractById } from './reads/getContractById';
import { getCurrentUser } from '@/modules/identity/services/session/getCurrentUser';
import {
  recordBusinessSourceAudit,
  type BusinessSourceAuditAction,
} from '@/modules/businesses/notes';

const SAFE_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

export interface EmitContractAuditOptions {
  contractId: string;
  action: Extract<
    BusinessSourceAuditAction,
    | 'contract.created'
    | 'contract.updated'
    | 'contract.status_changed'
    | 'contract.signed'
  >;
  previousStatus?: string | null;
  newStatus?: string | null;
  extra?: Record<string, unknown>;
}

export async function emitContractAudit(
  opts: EmitContractAuditOptions,
): Promise<void> {
  try {
    if (!opts.contractId) return;
    const { data: contract } = await getContractById<{
      id: string;
      business_id: string | null;
      contract_number: string | null;
      status: string | null;
    }>({
      id: opts.contractId,
      select: 'id, business_id, contract_number, status',
    });
    if (!contract?.business_id) return;
    const { data: userRes } = await getCurrentUser();
    const uid = userRes?.user?.id ?? null;
    if (!uid) return;
    const rawRef = (contract.contract_number ?? '').trim().toUpperCase();
    const contractRefId = SAFE_REF.test(rawRef) ? rawRef : null;
    const metadata: Record<string, unknown> = {
      contract_ref_id: contractRefId,
      source_type: 'contract',
    };
    if (opts.previousStatus) metadata.previous_status = opts.previousStatus;
    const newStatus = opts.newStatus ?? contract.status ?? null;
    if (newStatus) metadata.new_status = newStatus;
    if (opts.extra) {
      for (const [k, v] of Object.entries(opts.extra)) {
        if (v !== undefined && v !== null) metadata[k] = v;
      }
    }
    await recordBusinessSourceAudit({
      business_id: contract.business_id,
      actor_id: uid,
      entity_type: 'contract',
      entity_id: contract.id,
      action: opts.action,
      metadata,
    });
  } catch {
    /* swallow — audit is observability-only */
  }
}

/**
 * Read just the status of a contract (best-effort). Returns null on any
 * failure so callers can safely use it for previous_status snapshots
 * without risking the parent mutation.
 */
export async function readContractStatusSafe(
  contractId: string,
): Promise<string | null> {
  try {
    const { data } = await getContractById<{ status: string | null }>({
      id: contractId,
      select: 'status',
    });
    return data?.status ?? null;
  } catch {
    return null;
  }
}