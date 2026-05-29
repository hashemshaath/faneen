/**
 * CUSTOMER-EXPERIENCE-3 — Project closure / evidence / feedback / NPS / warranty.
 *
 * Customer-facing snapshot blocks NEVER expose UUIDs, attachment IDs,
 * staff identity, internal notes, supplier data, or raw tokens.
 */
export type ClosureStatus =
  | 'pending_customer_confirmation'
  | 'issue_reported'
  | 'customer_confirmed'
  | 'warranty_started'
  | 'closed';

export type WarrantyStatus = 'active' | 'expired' | 'void';

export interface ProjectClosureRow {
  id: string;
  ref_id: string;
  business_id: string;
  work_order_id: string;
  closure_status: ClosureStatus;
  completion_date: string;
  confirmed_at: string | null;
  issue_reported_at: string | null;
  issue_text: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDeliveryEvidenceRow {
  id: string;
  ref_id: string;
  closure_id: string;
  business_id: string;
  attachment_id: string | null;
  public_image_url: string | null;
  caption_ar: string | null;
  caption_en: string | null;
  is_customer_visible: boolean;
  created_at: string;
}

export interface CustomerFeedbackRow {
  id: string;
  ref_id: string;
  business_id: string;
  work_order_id: string;
  closure_id: string;
  rating: number;
  feedback_text: string | null;
  would_recommend: boolean | null;
  created_at: string;
}

export interface CustomerNpsResponseRow {
  id: string;
  business_id: string;
  work_order_id: string;
  closure_id: string | null;
  score: number;
  created_at: string;
}

export interface WorkOrderWarrantyRow {
  id: string;
  ref_id: string;
  business_id: string;
  work_order_id: string;
  closure_id: string | null;
  start_date: string;
  end_date: string;
  warranty_type: string;
  notes: string | null;
  status: WarrantyStatus;
  created_at: string;
  updated_at: string;
}

/** Customer-safe blocks returned by `get_customer_project_snapshot`. */
export interface CustomerClosureBlock {
  ref_id: string;
  status: ClosureStatus;
  completion_date: string;
  confirmed_at: string | null;
  issue_reported_at: string | null;
  issue_text: string | null;
}

export interface CustomerWarrantyBlock {
  ref_id: string;
  start_date: string;
  end_date: string;
  warranty_type: string;
  status: WarrantyStatus;
}

export interface CustomerDeliveryEvidenceItem {
  ref_id: string;
  image_url: string;
  caption_ar: string | null;
  caption_en: string | null;
}

export const ISSUE_TEXT_MAX_LEN = 2000;
export const FEEDBACK_TEXT_MAX_LEN = 2000;
export const CAPTION_MAX_LEN = 500;

export type NpsBucket = 'promoter' | 'passive' | 'detractor';

export function classifyNps(score: number): NpsBucket {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}