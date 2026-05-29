import { supabase } from '@/integrations/supabase/client';
import { normalizeQuery } from './textNormalize';
import type { HelpAudience } from '../types';

export interface LogSearchInput {
  query: string;
  results_count: number;
  selected_article_id?: string | null;
  audience?: HelpAudience | null;
  page_key?: string | null;
  business_id?: string | null;
}

export async function logHelpSearch(input: LogSearchInput): Promise<void> {
  const q = (input.query ?? '').trim();
  if (!q) return;
  // Best-effort; never surface errors to the UI
  try {
    await supabase.from('help_search_logs').insert({
      query: q.slice(0, 500),
      query_normalized: normalizeQuery(q).slice(0, 500),
      results_count: Math.max(0, input.results_count | 0),
      selected_article_id: input.selected_article_id ?? null,
      audience: input.audience ?? null,
      page_key: input.page_key ?? null,
      business_id: input.business_id ?? null,
    });
  } catch {
    /* ignore — analytics only */
  }
}

export interface AdminSearchLogRow {
  id: string;
  ref_id: string | null;
  query: string;
  query_normalized: string;
  results_count: number;
  selected_article_id: string | null;
  audience: HelpAudience | null;
  page_key: string | null;
  created_at: string;
}

export async function adminListSearchLogs(limit = 1000): Promise<AdminSearchLogRow[]> {
  const { data, error } = await supabase
    .from('help_search_logs')
    .select('id, ref_id, query, query_normalized, results_count, selected_article_id, audience, page_key, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminSearchLogRow[];
}