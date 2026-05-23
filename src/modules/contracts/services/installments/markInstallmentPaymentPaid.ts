/**
 * CT-9 — Mark an installment payment as paid. Mirrors the exact
 * payload + filter used by DashboardInstallments.markPaidMutation.
 */
import { supabase } from '@/integrations/supabase/client';

export async function markInstallmentPaymentPaid(paymentId: string) {
  return await supabase
    .from('installment_payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', paymentId);
}