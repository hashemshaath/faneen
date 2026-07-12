/**
 * R5.2 — Best-effort in-app notifications after an awarded bid is
 * converted into a contract. Notifies BOTH parties:
 *   - RFQ owner (client)
 *   - Winning provider (submitted_by of awarded bid)
 * Failures are swallowed so the primary conversion flow never breaks.
 */
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/modules/notifications';

export async function notifyContractConvertedBothParties(
  opportunityId: string,
  contractId: string,
): Promise<void> {
  try {
    const { data: qr } = await supabase
      .from('quote_requests')
      .select('user_id, awarded_bid_id')
      .eq('id', opportunityId)
      .maybeSingle();
    if (!qr) return;

    let winnerUserId: string | null = null;
    if (qr.awarded_bid_id) {
      const { data: bid } = await supabase
        .from('opportunity_bids')
        .select('submitted_by')
        .eq('id', qr.awarded_bid_id)
        .maybeSingle();
      winnerUserId = (bid?.submitted_by as string | null) ?? null;
    }

    const tasks: Promise<unknown>[] = [];
    if (qr.user_id) {
      tasks.push(
        createNotification({
          user_id: qr.user_id,
          notification_type: 'opportunity_contract_converted',
          title_ar: 'تم إنشاء عقد مبدئي',
          title_en: 'A draft contract was created',
          body_ar: 'تم تحويل العرض الفائز إلى عقد مبدئي. يمكنك مراجعته الآن.',
          body_en: 'The winning bid was converted to a draft contract.',
          reference_id: contractId,
          reference_type: 'contract',
        }).catch(() => undefined),
      );
    }
    if (winnerUserId && winnerUserId !== qr.user_id) {
      tasks.push(
        createNotification({
          user_id: winnerUserId,
          notification_type: 'opportunity_contract_converted',
          title_ar: 'تم إنشاء عقدك',
          title_en: 'Your contract was created',
          body_ar: 'قام العميل بتحويل عرضك الفائز إلى عقد مبدئي.',
          body_en: 'The client converted your winning bid into a draft contract.',
          reference_id: contractId,
          reference_type: 'contract',
        }).catch(() => undefined),
      );
    }
    await Promise.all(tasks);
  } catch {
    /* best-effort */
  }
}
