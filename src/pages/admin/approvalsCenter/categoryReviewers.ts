import { supabase } from '@/integrations/supabase/client';
import { reviewEntityAccessRequest } from '@/modules/entities/services/access/reviewEntityAccessRequest';
import type { ReviewFn } from '@/pages/admin/approvalsCenter/bulkReview';

/**
 * Per-category review wiring. Maps the unified Approvals Center's
 * `ApprovalCategoryKey` to the actual single-item mutation that performs
 * an approve/reject. Categories without an inline reviewer return null —
 * the UI falls back to deep-linking into the dedicated page.
 *
 * All three inline-actionable mutations write to `admin_activity_log` via
 * existing DB triggers / RPCs, so the unified audit timeline stays accurate
 * regardless of which surface (inline, bulk, or detail page) was used.
 */

export type ReviewableCategory =
  | 'entity_access' | 'provider_review' | 'username';

const reviewProviderApproval: ReviewFn = async ({ requestId, action }) => {
  // RPC: SECURITY DEFINER, audit-logged, role-guarded server-side.
  const { error } = await supabase.rpc('admin_update_business_approval', {
    _business_id: requestId,
    _new_status: action === 'approve' ? 'approved' : 'rejected',
    _notes: null,
  });
  return { ok: !error, error };
};

const reviewUsernameApproval: ReviewFn = async ({ requestId, action }) => {
  const { error } = await supabase.rpc('admin_update_username_status', {
    _business_id: requestId,
    _new_status: action === 'approve' ? 'approved' : 'rejected',
    _notes: null,
  });
  return { ok: !error, error };
};

export function getReviewer(category: string): ReviewFn | null {
  switch (category) {
    case 'entity_access':   return reviewEntityAccessRequest;
    case 'provider_review': return reviewProviderApproval;
    case 'username':        return reviewUsernameApproval;
    default:                return null; // subscriptions/upgrades open detail page
  }
}

export const ACTIONABLE_CATEGORIES: ReadonlySet<string> = new Set<string>([
  'entity_access', 'provider_review', 'username',
]);