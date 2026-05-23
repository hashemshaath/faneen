/**
 * CT-4 — Contract measurements child-table service wrappers.
 */
import { supabase } from '@/integrations/supabase/client';

export async function listContractMeasurements(contractId: string) {
  return await supabase
    .from('contract_measurements')
    .select('*')
    .eq('contract_id', contractId)
    .order('sort_order');
}

export async function createContractMeasurement(
  payload: Record<string, unknown> | Record<string, unknown>[],
) {
  return await supabase.from('contract_measurements').insert(payload as never);
}

export async function updateContractMeasurement(
  measurementId: string,
  payload: Record<string, unknown>,
) {
  return await supabase
    .from('contract_measurements')
    .update(payload as never)
    .eq('id', measurementId);
}

export async function deleteContractMeasurement(measurementId: string) {
  return await supabase.from('contract_measurements').delete().eq('id', measurementId);
}