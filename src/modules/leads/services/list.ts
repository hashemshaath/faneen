import { supabase } from '@/integrations/supabase/client';

// Read-only list wrappers (R3B). All queries run under the caller's JWT
// and rely on existing RLS policies — no service_role, no RLS bypass.

export interface ProviderLeadRow {
  id: string;
  status: string;
  match_score: number;
  match_reasons: string[];
  created_at: string;
  contact_revealed: boolean;
  quote_request: {
    id: string;
    sector: string;
    city: string;
    district: string | null;
    project_description: string;
    execution_timeline: string;
  } | null;
}

export interface AdminQuoteRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_type: string;
  sector: string;
  city: string;
  status: string;
  created_at: string;
}

export interface MyLeadRow {
  id: string;
  ref_id: string | null;
  business_id: string;
  user_id: string | null;
  subject: string | null;
  status: string;
  contact_preference: string | null;
  budget_range: string | null;
  project_scope: string | null;
  created_at: string;
  updated_at: string | null;
  viewed_at: string | null;
  needs_info_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  conversation_id: string | null;
  quoted_at: string | null;
  quote_amount: number | string | null;
  quote_currency: string | null;
  quote_note: string | null;
  quote_valid_until: string | null;
}

export interface MyQuoteRequestRow {
  id: string;
  sector: string;
  city: string;
  district: string | null;
  project_description: string;
  status: string;
  preferred_contact_method: string;
  created_at: string;
  updated_at: string;
}

const PROVIDER_LEAD_SELECT =
  'id, status, match_score, match_reasons, created_at, contact_revealed, ' +
  'quote_request:quote_requests(id, sector, city, district, project_description, execution_timeline)';

const ADMIN_QUOTE_SELECT =
  'id, customer_name, customer_phone, customer_type, sector, city, status, created_at';

const MY_LEAD_SELECT =
  'id, ref_id, business_id, user_id, subject, status, contact_preference, budget_range, ' +
  'project_scope, created_at, updated_at, viewed_at, needs_info_at, accepted_at, rejected_at, ' +
  'closed_at, cancelled_at, conversation_id, quoted_at, quote_amount, quote_currency, ' +
  'quote_note, quote_valid_until';

const MY_QUOTE_SELECT =
  'id, sector, city, district, project_description, status, preferred_contact_method, created_at, updated_at';

export async function listProviderLeads(limit = 100): Promise<ProviderLeadRow[]> {
  const { data, error } = await supabase
    .from('quote_request_leads')
    .select(PROVIDER_LEAD_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // Nested embed typing: Supabase returns a complex generated shape — cast through
  // unknown to our hand-typed row (matches prior inline behavior).
  return (data ?? []) as unknown as ProviderLeadRow[];
}

export async function listAdminQuoteRequests(limit = 500): Promise<AdminQuoteRow[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select(ADMIN_QUOTE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminQuoteRow[];
}

export async function countQuoteRequestFiles(
  quoteRequestIds: string[],
): Promise<Map<string, number>> {
  if (quoteRequestIds.length === 0) return new Map<string, number>();
  const { data, error } = await supabase
    .from('quote_request_files')
    .select('quote_request_id')
    .in('quote_request_id', quoteRequestIds);
  if (error) throw error;
  const counts = new Map<string, number>();
  (data ?? []).forEach((r: { quote_request_id: string }) => {
    counts.set(r.quote_request_id, (counts.get(r.quote_request_id) ?? 0) + 1);
  });
  return counts;
}

export async function listMyLeadRequests(
  userId: string,
  limit = 200,
): Promise<MyLeadRow[]> {
  const { data, error } = await supabase
    .from('lead_requests')
    .select(MY_LEAD_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // Wide select string exceeds Supabase generic inference — cast via unknown.
  return (data ?? []) as unknown as MyLeadRow[];
}

export async function listMyQuoteRequests(
  userId: string,
  limit = 100,
): Promise<MyQuoteRequestRow[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select(MY_QUOTE_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MyQuoteRequestRow[];
}