/**
 * CT-9 — List overdue installment payments (status=pending, due before
 * `today`). Mirrors the exact select/filters/limit used by the
 * OverdueAlerts dashboard overview widget.
 */
import { supabase } from '@/integrations/supabase/client';

export async function listOverdueInstallmentPayments(
  today: string,
  limit = 10,
) {
  return await supabase
    .from('installment_payments')
    .select('id, plan_id')
    .eq('status', 'pending')
    .lt('due_date', today)
    .limit(limit);
}