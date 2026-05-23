/**
 * CT-9 — List installment plans (joined with their installment_payments)
 * for a set of contract ids. Mirrors the exact select/filter/order used
 * by DashboardInstallments.
 */
import { supabase } from '@/integrations/supabase/client';

export async function listInstallmentPlansWithPaymentsForContracts(
  contractIds: string[],
) {
  return await supabase
    .from('installment_plans')
    .select('*, installment_payments(*)')
    .in('contract_id', contractIds)
    .order('created_at', { ascending: false });
}