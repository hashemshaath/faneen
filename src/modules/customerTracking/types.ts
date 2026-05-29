/**
 * CUSTOMER-EXPERIENCE-1 — Customer-safe project tracking snapshot types.
 * Mirrors the shape returned by `get_customer_project_snapshot` RPC.
 * NEVER add internal fields (supplier pricing, BOQ costs, internal notes,
 * staff PII, raw UUIDs, raw tokens) to this type.
 */
export type CustomerMilestoneKey =
  | 'quotation_sent'
  | 'quotation_approved'
  | 'contract_ready'
  | 'production_started'
  | 'qc'
  | 'ready_for_installation'
  | 'installation'
  | 'completed';

export interface CustomerMilestone {
  key: CustomerMilestoneKey;
  reached: boolean;
}

export interface CustomerProjectSnapshot {
  tracking_ref: string;
  project_ref: string | null;
  project_title: string;
  status: string;
  stage_key: string;
  progress: number;
  due_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
  business: {
    name_ar?: string | null;
    name_en?: string | null;
    logo_url?: string | null;
  };
  quotation: {
    ref_id: string;
    status: string;
    total: number | null;
    valid_until: string | null;
    approved_at: string | null;
  } | null;
  contract: {
    contract_number: string;
    status: string;
    signed_at: string | null;
  } | null;
  installation?: {
    appointment_ref: string;
    date: string;
    time_window: string | null;
    status:
      | 'scheduled'
      | 'confirmed'
      | 'reschedule_requested'
      | 'completed'
      | 'cancelled';
    confirmation_status: 'pending' | 'confirmed' | 'reschedule_requested';
    customer_note: string | null;
  } | null;
  milestones: CustomerMilestone[];
}

export interface CustomerTrackingLinkIssue {
  ref_id: string;
  token: string;
}