/**
 * OPPORTUNITIES PHASE 8 — analytics types.
 * Read-only aggregations across opportunity lifecycle stages.
 */

export interface OpportunityKpis {
  total: number;
  newCount: number;
  underReview: number;
  assigned: number;
  withBids: number;
  awarded: number;
  withContract: number;
  cancelled: number;
}

export interface OpportunityFunnel {
  submitted: number;
  matched: number;
  assigned: number;
  bids: number;
  awarded: number;
  contracts: number;
}

export type OpportunityOpsFlag =
  | 'needs_matching'
  | 'awaiting_bids'
  | 'awaiting_award'
  | 'awaiting_contract'
  | 'operationally_complete'
  | 'cancelled';

export interface OpportunityOpsRow {
  id: string;
  ref_id: string | null;
  customer_name: string | null;
  city: string | null;
  district: string | null;
  sector: string | null;
  status: string;
  award_status: string | null;
  awarded_bid_id: string | null;
  created_at: string;
  updated_at: string;
  assigned_count: number;
  bid_count: number;
  contract_id: string | null;
  contract_status: string | null;
  flag: OpportunityOpsFlag;
}
