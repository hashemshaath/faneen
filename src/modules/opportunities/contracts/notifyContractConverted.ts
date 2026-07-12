/**
 * R5.2 — Best-effort in-app notifications after an awarded bid is
 * converted into a contract. Notifies BOTH parties:
 *   - RFQ owner (client) — "تم إنشاء عقد مبدئي من العرض الفائز"
 *   - Winning provider (submitted_by of awarded bid) — "تم إنشاء عقدك"
 * Failures are swallowed so the primary conversion flow never breaks.
 */
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/modules/notifications';

export async function notifyContractConvertedBothParties(
  opportunityId: string,
  contractId: string,
): Promise<void> {
  try {
    const [{ data: qr }, { data: bid }] = await Promise.all([
      supabase
        .from('quote_requests')
        .select('id, user_id, awarded_bid_id, ref_id')
        .eq('id', opportunityId)
        .maybeSingle(),
      supabase
        .from('opportunity_bids')
        .select('id, submitted_by, provider_business_id')
        .eq('id', await (async () => {
          const { data } = await supabase
            .from('quote_requests')
            .select('awarded_bid_id')
            .eq('id', opportunityId)
            .maybeSingle();
          return (data?.awarded_bid_id as string) ?? '';
        })())
        .maybeSingle(),
    ]);

    const tasks: Promise<unknown>[] = [];
    if (qr?.user_id) {
      tasks.push(
        createNotification({
          user_id: qr.user_id,
          notification_type: 'opportunity_contract_converted',
          title_ar: 'تم إنشاء عقد مبدئي',
          title_en: 'A draft contract was created',
          body_ar: 'تم تحويل العرض الفائز إلى عقد مبدئي. يمكنك مراجعته الآن.',
          body_en: 'The winning bid was converted to a draft contract. You can review it now.',
          reference_id: contractId,
          reference_type: 'contract',
        }).catch(() => undefined),
      );
    }
    if (bid?.submitted_by) {
      tasks.push(
        createNotification({
          user_id: bid.submitted_by,
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
