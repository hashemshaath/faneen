import type { Database } from '@/integrations/supabase/types';

type ContractRow = Database['public']['Tables']['contracts']['Row'];
type MilestoneRow = Database['public']['Tables']['contract_milestones']['Row'];
type PaymentRow = Database['public']['Tables']['installment_payments']['Row'];

/**
 * Compute a 0-100 contract health score from completeness + milestone/payment progress.
 * Logic mirrors the original in DashboardContracts (Phase 2C extraction — unchanged).
 */
export function getContractHealth(
  contract: ContractRow,
  milestones: MilestoneRow[],
  payments: PaymentRow[],
): number {
  let score = 0;
  let max = 0;
  max += 10; if (contract.start_date && contract.end_date) score += 10;
  max += 10; if (contract.terms_ar) score += 10;
  max += 10; if (contract.supervisor_name && contract.supervisor_phone) score += 10;
  max += 20;
  if (contract.client_accepted_at) score += 10;
  if (contract.provider_accepted_at) score += 10;
  max += 30;
  if (milestones.length > 0) {
    const completed = milestones.filter((m) => m.status === 'completed').length;
    score += Math.round((completed / milestones.length) * 30);
  }
  max += 20;
  if (payments.length > 0) {
    const paid = payments.filter((p) => p.status === 'paid').length;
    score += Math.round((paid / payments.length) * 20);
  }
  return Math.round((score / max) * 100);
}

export function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}