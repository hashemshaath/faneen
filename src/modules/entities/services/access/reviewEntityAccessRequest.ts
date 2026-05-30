import { supabase } from '@/integrations/supabase/client';
import { insertBusinessStaff } from '@/modules/businesses/services/insertBusinessStaff';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 2
 * Admin / business-owner review action for an entity access request.
 *
 * - `approve`: marks the request approved, and (when both `target_business_id`
 *   and `requester_user_id` are present) creates a `business_staff` row with
 *   role='viewer'. The unique `(business_id, user_id)` constraint makes the
 *   staff insert idempotent against retries.
 * - `reject`: marks the request rejected with `reviewed_by`/`reviewed_at`.
 *
 * RLS still applies: only the targeted business owner or an admin can update
 * the row. The page-level guard ensures only admins reach this code path.
 */
export interface ReviewEntityAccessRequestOptions {
  requestId: string;
  reviewerUserId: string;
  action: 'approve' | 'reject';
}

export async function reviewEntityAccessRequest(
  options: ReviewEntityAccessRequestOptions,
): Promise<{ ok: boolean; error: unknown }> {
  const { requestId, reviewerUserId, action } = options;

  // Load minimal request context first (RLS will filter)
  const { data: req, error: loadErr } = await supabase
    .from('entity_access_requests')
    .select('id, ref_id, status, target_business_id, requester_user_id, target_business:target_business_id(name_ar, name_en)')
    .eq('id', requestId)
    .maybeSingle();
  if (loadErr || !req) return { ok: false, error: loadErr ?? new Error('request_not_found') };
  if (req.status !== 'pending') return { ok: false, error: new Error('request_not_pending') };

  if (action === 'approve' && req.target_business_id && req.requester_user_id) {
    // Idempotent: unique (business_id, user_id) ignores duplicate inserts.
    const { error: staffErr } = await insertBusinessStaff({
      payload: {
        business_id: req.target_business_id,
        user_id: req.requester_user_id,
        role: 'viewer',
        invited_by: reviewerUserId,
        is_active: true,
      },
    });
    if (staffErr) {
      const msg = (staffErr as { message?: string } | null)?.message ?? '';
      if (!/duplicate/i.test(msg)) return { ok: false, error: staffErr };
    }
  }

  const { error: updErr } = await supabase
    .from('entity_access_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: reviewerUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  // Notify the requester in-app. RLS allows admins to insert notifications;
  // a failure here must not roll back the review action — log silently and
  // continue. The requester can always re-discover state from their dashboard.
  if (!updErr && req.requester_user_id) {
    const tb = (req as unknown as {
      target_business: { name_ar: string | null; name_en: string | null } | null;
    }).target_business;
    const entityAr = tb?.name_ar ?? tb?.name_en ?? 'المنشأة';
    const entityEn = tb?.name_en ?? tb?.name_ar ?? 'the entity';
    const isApprove = action === 'approve';
    try {
      await supabase.from('notifications').insert({
        user_id: req.requester_user_id,
        notification_type: isApprove ? 'access_request_approved' : 'access_request_rejected',
        reference_type: 'entity_access_request',
        title_ar: isApprove
          ? `تمت الموافقة على طلب الانضمام إلى ${entityAr}`
          : `تم رفض طلب الانضمام إلى ${entityAr}`,
        title_en: isApprove
          ? `Your request to join ${entityEn} was approved`
          : `Your request to join ${entityEn} was rejected`,
        body_ar: isApprove
          ? `يمكنك الآن الوصول إلى ${entityAr} من لوحة التحكم. رقم الطلب: ${req.ref_id}`
          : `لم تتم الموافقة على طلب الانضمام إلى ${entityAr}. رقم الطلب: ${req.ref_id}`,
        body_en: isApprove
          ? `You now have access to ${entityEn} from your dashboard. Request: ${req.ref_id}`
          : `Your request to join ${entityEn} was not approved. Request: ${req.ref_id}`,
        action_url: isApprove ? '/dashboard' : '/dashboard/notifications',
      });
    } catch {
      // best-effort notification — ignore
    }
  }

  return { ok: !updErr, error: updErr };
}