/**
 * Wrappers for the unified contract audit-trail RPC and the admin
 * create-on-behalf RPC.
 *
 * - get_contract_full_audit_trail(contract_id) → merged timeline across
 *   amendments, amendment audit, PDF exports, version snapshots and
 *   business audit log entries.
 * - admin_create_contract_on_behalf(...) → creates a draft contract
 *   between two other users; rejects if the admin is a party.
 */
import { supabase } from '@/integrations/supabase/client';

export type ContractAuditSource =
  | 'amendment'
  | 'amendment_audit'
  | 'pdf_export'
  | 'version'
  | 'audit_log';

export interface ContractAuditEvent {
  source: ContractAuditSource;
  at: string;
  event: string;
  payload: Record<string, unknown>;
}

export async function getContractFullAuditTrail(
  contractId: string,
): Promise<ContractAuditEvent[]> {
  const { data, error } = await supabase.rpc('get_contract_full_audit_trail', {
    _contract_id: contractId,
  });
  if (error) throw error;
  return Array.isArray(data) ? (data as unknown as ContractAuditEvent[]) : [];
}

export interface AdminCreateContractOnBehalfInput {
  providerId: string;
  clientId: string;
  titleAr: string;
  titleEn?: string | null;
  totalAmount?: number;
  currencyCode?: string;
  startDate?: string | null;
  endDate?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
}

export async function adminCreateContractOnBehalf(
  input: AdminCreateContractOnBehalfInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_contract_on_behalf', {
    _provider_id: input.providerId,
    _client_id: input.clientId,
    _title_ar: input.titleAr,
    _title_en: input.titleEn ?? null,
    _total_amount: input.totalAmount ?? 0,
    _currency_code: input.currencyCode ?? 'SAR',
    _start_date: input.startDate ?? null,
    _end_date: input.endDate ?? null,
    _description_ar: input.descriptionAr ?? null,
    _description_en: input.descriptionEn ?? null,
  });
  if (error) throw error;
  return data as string;
}