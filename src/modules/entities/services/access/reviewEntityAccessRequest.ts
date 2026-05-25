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
    .select('id, status, target_business_id, requester_user_id')
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

  return { ok: !updErr, error: updErr };
}