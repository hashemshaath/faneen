/**
 * CT-4 — Installment plans & payments service wrappers.
 *
 * Scope: callsites tied to the contract-detail / contract-management
 * workflows (ContractDetail.tsx, DashboardContracts.tsx,
 * PaymentScheduleGenerator.tsx). Standalone DashboardInstallments page
 * and overview widgets are intentionally deferred.
 */
import { supabase } from '@/integrations/supabase/client';

export async function listInstallmentPlansForContract(contractId: string) {
  return await supabase
    .from('installment_plans')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });
}

export async function getInstallmentPlanIdForContract(contractId: string) {
  return await supabase
    .from('installment_plans')
    .select('id')
    .eq('contract_id', contractId)
    .maybeSingle();
}

export async function listInstallmentPaymentsByPlanIds(planIds: string[]) {
  return await supabase
    .from('installment_payments')
    .select('*')
    .in('plan_id', planIds)
    .order('installment_number');
}

/**
 * Insert a plan. Callsites differ on which columns they want returned
 * (some need just the id, others the full row), so the caller passes
 * an explicit `select` string.
 */
export async function createInstallmentPlan(
  payload: Record<string, unknown>,
  select = '*',
) {
  return await supabase
    .from('installment_plans')
    .insert(payload as never)
    .select(select)
    .single();
}

export async function createInstallmentPayments(
  payload: Record<string, unknown> | Record<string, unknown>[],
) {
  return await supabase.from('installment_payments').insert(payload as never);
}

export async function updateInstallmentPayment(
  paymentId: string,
  update: Record<string, unknown>,
) {
  return await supabase
    .from('installment_payments')
    .update(update as never)
    .eq('id', paymentId);
}

/**
 * Conditional update guarded by current status (used to confirm a
 * `pending` payment in a single round-trip). Returns the standard
 * `.select('id').maybeSingle()` shape so callsites can detect a no-op
 * when the row was already updated elsewhere.
 */
export async function updateInstallmentPaymentIfStatus(
  paymentId: string,
  update: Record<string, unknown>,
  expectedStatus: string,
) {
  return await supabase
    .from('installment_payments')
    .update(update as never)
    .eq('id', paymentId)
    .eq('status', expectedStatus)
    .select('id')
    .maybeSingle();
}