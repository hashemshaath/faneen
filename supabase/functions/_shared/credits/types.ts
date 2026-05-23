// EDGE-2: Shared server-side credits module — type contracts.
// Deno-compatible: no imports from app code or npm.

export interface CreditRpcResult<T = Record<string, unknown>> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface DebitProviderLeadCreditInput {
  businessId: string;
  cost: number;
  reason: string;
  quoteRequestLeadId?: string | null;
  createdBy?: string | null;
  idempotencyKey?: string | null;
}

export interface GrantMonthlyProviderCreditsInput {
  subscriptionId: string;
  amount: number;
  periodStart: string; // ISO timestamptz
  periodEnd: string;   // ISO timestamptz
  planCode?: string | null;
}

export interface InsertCreditLedgerTransactionInput {
  business_id: string;
  provider_user_id?: string | null;
  quote_request_lead_id?: string | null;
  type: 'grant' | 'consume' | 'refund' | 'adjustment';
  amount: number;
  balance_after: number;
  reason: string;
  created_by?: string | null;
  metadata?: Record<string, unknown>;
  idempotency_key?: string | null;
}

export interface AdminAdjustProviderCreditsServerInput {
  p_subscription_id: string;
  p_action: 'grant' | 'refund' | 'adjustment';
  p_amount: number;
  p_reason: string;
  p_note: string | null;
  p_quote_request_lead_id: string | null;
}

export interface ProviderCreditBalance {
  id: string;
  business_id: string;
  provider_user_id: string | null;
  lead_credits_balance: number;
}

// Minimal Supabase client surface used by the shared helpers.
// Kept structural so tests can pass a plain mock.
export interface SupabaseAdminLike {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}