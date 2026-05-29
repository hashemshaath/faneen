/**
 * BUSINESS-WORKFLOW-PROCUREMENT-1 — Procurement domain types.
 */
export type ProcurementRequestStatus =
  | 'draft'
  | 'requested'
  | 'rfq_sent'
  | 'quoted'
  | 'awarded'
  | 'cancelled';

export type ProcurementRfqStatus = 'draft' | 'sent' | 'closed' | 'cancelled';
export type ProcurementSupplierStatus = 'active' | 'inactive';
export type ProcurementSupplierQuoteStatus =
  | 'draft'
  | 'submitted'
  | 'shortlisted'
  | 'selected'
  | 'awarded'
  | 'rejected';

export type ProcurementInvitationStatus =
  | 'invited'
  | 'viewed'
  | 'responded'
  | 'declined'
  | 'expired';

export interface ProcurementRequestRow {
  id: string;
  business_id: string;
  work_order_id: string | null;
  title: string;
  description: string | null;
  status: ProcurementRequestStatus;
  needed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProcurementRfqRow {
  id: string;
  business_id: string;
  procurement_request_id: string;
  rfq_number: string | null;
  status: ProcurementRfqStatus;
  due_at: string | null;
  expires_at: string | null;
  sent_at: string | null;
  closed_at: string | null;
  awarded_quote_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProcurementSupplierRow {
  id: string;
  business_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  status: ProcurementSupplierStatus;
  created_at: string;
  updated_at: string;
}

export interface ProcurementSupplierQuoteRow {
  id: string;
  business_id: string;
  rfq_id: string;
  supplier_id: string;
  status: ProcurementSupplierQuoteStatus;
  total_amount: number | null;
  currency: string;
  lead_time_days: number | null;
  notes: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcurementRfqInvitationRow {
  id: string;
  business_id: string;
  rfq_id: string;
  supplier_id: string;
  status: ProcurementInvitationStatus;
  invited_at: string;
  responded_at: string | null;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

/** Allowed forward transitions for procurement request status. */
export const PROCUREMENT_REQUEST_TRANSITIONS: Record<
  ProcurementRequestStatus,
  ProcurementRequestStatus[]
> = {
  draft: ['requested', 'cancelled'],
  requested: ['rfq_sent', 'cancelled'],
  rfq_sent: ['quoted', 'cancelled'],
  quoted: ['awarded', 'cancelled'],
  awarded: [],
  cancelled: [],
};

export function isValidProcurementRequestTransition(
  from: ProcurementRequestStatus,
  to: ProcurementRequestStatus,
): boolean {
  return PROCUREMENT_REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Supplier contact fields exposed to UI — keep minimal to avoid PII sprawl. */
export const PROCUREMENT_SUPPLIER_PUBLIC_FIELDS = [
  'id',
  'business_id',
  'name',
  'contact_name',
  'phone',
  'email',
  'status',
  'created_at',
  'updated_at',
] as const;