import { supabase } from '@/integrations/supabase/client';
import type { LeadStatus } from '../types';

// Read-only lead detail wrappers (R3C). All queries run under the caller's
// JWT and rely on existing RLS policies — no service_role, no RLS bypass.
// Mutations, RPCs, edge invokes, and admin reveal/convert flows remain
// inline at the call sites and are intentionally NOT wrapped here.

export interface ProviderLeadDetailRow {
  id: string;
  status: string;
  match_score: number;
  match_reasons: string[];
  viewed_at: string | null;
  responded_at: string | null;
  created_at: string;
  provider_id: string;
  provider_user_id: string | null;
  contact_revealed: boolean;
  contact_revealed_at: string | null;
  contact_view_count: number;
  quote_request: {
    id: string;
    sector: string;
    city: string;
    district: string | null;
    project_description: string;
    approx_dimensions: string | null;
    quantity: string | null;
    execution_timeline: string;
    service_location_type: string;
    has_budget: boolean;
    budget_amount: number | null;
    budget_note: string | null;
  } | null;
}

export interface MyQuoteRequestDetailRow {
  id: string;
  ref_id: string | null;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_type: string;
  preferred_contact_method: string;
  sector: string;
  city: string;
  district: string | null;
  service_location_type: string;
  project_description: string;
  approx_dimensions: string | null;
  quantity: string | null;
  execution_timeline: string;
  has_budget: boolean;
  budget_amount: number | null;
  budget_note: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteRequestFileRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

// Wide `lead_requests` row used by provider/admin list pages.
export interface ProviderLeadRequestRow {
  id: string;
  ref_id: string | null;
  legacy_ref_id: string | null;
  business_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  budget_range: string | null;
  contact_preference: string | null;
  status: string;
  priority: string;
  source: string | null;
  created_at: string;
  responded_at: string | null;
  quoted_at: string | null;
  quoted_by: string | null;
  quote_amount: number | string | null;
  quote_currency: string | null;
  quote_valid_until: string | null;
  quote_note: string | null;
  converted_contract_id: string | null;
  converted_at: string | null;
  converted_by: string | null;
}

export type AdminLeadRequestRow = ProviderLeadRequestRow;

export type AdminStatusFilter = 'all' | 'legacy' | string;

const PROVIDER_LEAD_DETAIL_SELECT = `
  id, status, match_score, match_reasons, viewed_at, responded_at, created_at,
  contact_revealed, contact_revealed_at, contact_view_count,
  provider_id, provider_user_id,
  quote_request:quote_requests(
    id, sector, city, district, project_description, approx_dimensions, quantity,
    execution_timeline, service_location_type, has_budget, budget_amount, budget_note
  )
`;

const QUOTE_FILE_SELECT =
  'id, file_name, file_path, file_size, file_type, created_at';

export async function getProviderLeadDetail(
  id: string,
): Promise<ProviderLeadDetailRow | null> {
  const { data, error } = await supabase
    .from('quote_request_leads')
    .select(PROVIDER_LEAD_DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  // Nested embed typing: Supabase returns a complex generated shape — cast
  // through unknown to our hand-typed row (matches prior inline behavior).
  return (data ?? null) as unknown as ProviderLeadDetailRow | null;
}

export async function getMyQuoteRequestDetail(
  id: string,
  userId: string,
): Promise<MyQuoteRequestDetailRow | null> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as MyQuoteRequestDetailRow | null;
}

export async function listQuoteRequestFiles(
  quoteRequestId: string,
): Promise<QuoteRequestFileRow[]> {
  const { data, error } = await supabase
    .from('quote_request_files')
    .select(QUOTE_FILE_SELECT)
    .eq('quote_request_id', quoteRequestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuoteRequestFileRow[];
}

export async function listProviderLeadRequests(
  businessIds: string[],
  statusFilter: LeadStatus | 'all',
  limit = 200,
): Promise<ProviderLeadRequestRow[]> {
  if (businessIds.length === 0) return [];
  let q = supabase
    .from('lead_requests')
    .select('*')
    .in('business_id', businessIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (statusFilter !== 'all') q = q.eq('status', statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ProviderLeadRequestRow[];
}

export async function listAdminLeadRequests(
  statusFilter: AdminStatusFilter,
  legacyStatuses: readonly string[] = [],
  limit = 200,
): Promise<AdminLeadRequestRow[]> {
  let q = supabase
    .from('lead_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (statusFilter === 'legacy') {
    q = q.in('status', legacyStatuses as string[]);
  } else if (statusFilter !== 'all') {
    q = q.eq('status', statusFilter);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AdminLeadRequestRow[];
}