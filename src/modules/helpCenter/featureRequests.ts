import { supabase } from '@/integrations/supabase/client';
import type { HelpFeatureRequest, HelpFeatureStatus } from './types';

export interface SubmitFeatureRequestInput {
  category?: string;
  title: string;
  description?: string;
}

export async function submitFeatureRequest(input: SubmitFeatureRequestInput): Promise<HelpFeatureRequest> {
  const { data, error } = await supabase
    .from('help_feature_requests')
    .insert({
      category: input.category ?? null,
      title: input.title,
      description: input.description ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as HelpFeatureRequest;
}

export async function listMyFeatureRequests(): Promise<HelpFeatureRequest[]> {
  const { data, error } = await supabase
    .from('help_feature_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as HelpFeatureRequest[];
}

export async function adminListAllFeatureRequests(filters: { status?: HelpFeatureStatus } = {}): Promise<HelpFeatureRequest[]> {
  let q = supabase.from('help_feature_requests').select('*').order('created_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HelpFeatureRequest[];
}

export async function adminUpdateFeatureStatus(id: string, status: HelpFeatureStatus): Promise<void> {
  const { error } = await supabase.from('help_feature_requests').update({ status }).eq('id', id);
  if (error) throw error;
}

export const listHelpFeatureRequests = adminListAllFeatureRequests;
export const updateHelpFeatureRequestStatus = adminUpdateFeatureStatus;