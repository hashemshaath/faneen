import { supabase } from '@/integrations/supabase/client';
import type {
  ProcurementInvitationStatus,
  ProcurementRfqInvitationRow,
} from '../types';

const SELECT =
  'id, business_id, rfq_id, supplier_id, status, invited_at, responded_at, invited_by, created_at, updated_at';

export interface InviteSuppliersInput {
  business_id: string;
  rfq_id: string;
  supplier_ids: string[];
  invited_by: string;
}

export async function listInvitationsByRfq(
  rfqId: string,
): Promise<{ data: ProcurementRfqInvitationRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_rfq_invitations')
    .select(SELECT)
    .eq('rfq_id', rfqId)
    .order('invited_at', { ascending: true });
  return { data: (data as ProcurementRfqInvitationRow[] | null) ?? null, error };
}

export async function inviteSuppliersToRfq(
  input: InviteSuppliersInput,
): Promise<{ data: ProcurementRfqInvitationRow[] | null; error: unknown }> {
  const ids = Array.from(new Set((input.supplier_ids ?? []).filter(Boolean)));
  if (ids.length === 0) return { data: [], error: null };
  const rows = ids.map((supplier_id) => ({
    business_id: input.business_id,
    rfq_id: input.rfq_id,
    supplier_id,
    invited_by: input.invited_by,
    status: 'invited' as ProcurementInvitationStatus,
  }));
  const { data, error } = await supabase
    .from('procurement_rfq_invitations')
    .upsert(rows, { onConflict: 'rfq_id,supplier_id', ignoreDuplicates: true })
    .select(SELECT);
  return { data: (data as ProcurementRfqInvitationRow[] | null) ?? null, error };
}

export async function markInvitationResponded(
  id: string,
  status: Extract<ProcurementInvitationStatus, 'responded' | 'declined' | 'viewed' | 'expired'>,
): Promise<{ data: ProcurementRfqInvitationRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_rfq_invitations')
    .update({
      status,
      responded_at: status === 'responded' || status === 'declined' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementRfqInvitationRow | null) ?? null, error };
}