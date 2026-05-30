import { supabase } from '@/integrations/supabase/client';

export interface RfqRequest {
  id: string;
  ref_id: string | null;
  buyer_user_id: string;
  industry: string;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  deadline: string | null;
  status: string;
  created_at: string;
}

export interface RfqQuote {
  id: string;
  rfq_id: string;
  provider_user_id: string;
  business_id: string | null;
  amount: number;
  currency: string;
  delivery_days: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

export async function listOpenRfqs(): Promise<RfqRequest[]> {
  const { data, error } = await supabase
    .from('rfq_requests')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as RfqRequest[];
}

export async function listMyRfqs(userId: string): Promise<RfqRequest[]> {
  const { data, error } = await supabase
    .from('rfq_requests')
    .select('*')
    .eq('buyer_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RfqRequest[];
}

export async function listQuotesForRfq(rfqId: string): Promise<RfqQuote[]> {
  const { data, error } = await supabase
    .from('rfq_quotes')
    .select('*')
    .eq('rfq_id', rfqId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RfqQuote[];
}

export interface CreateRfqInput {
  buyer_user_id: string;
  industry: string;
  title: string;
  description?: string;
  budget_min?: number;
  budget_max?: number;
  currency?: string;
  deadline?: string;
}

export async function createRfq(input: CreateRfqInput): Promise<RfqRequest> {
  const { data, error } = await supabase
    .from('rfq_requests')
    .insert({ ...input, status: 'open', currency: input.currency ?? 'SAR' })
    .select('*')
    .single();
  if (error) throw error;
  return data as RfqRequest;
}

export interface CreateQuoteInput {
  rfq_id: string;
  provider_user_id: string;
  amount: number;
  currency?: string;
  delivery_days?: number;
  message?: string;
}

export async function createQuote(input: CreateQuoteInput): Promise<RfqQuote> {
  const { data, error } = await supabase
    .from('rfq_quotes')
    .insert({ ...input, status: 'pending', currency: input.currency ?? 'SAR' })
    .select('*')
    .single();
  if (error) throw error;
  return data as RfqQuote;
}