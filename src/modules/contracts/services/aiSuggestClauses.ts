/**
 * Calls the contracts-ai-suggest-clauses edge function (Lovable AI Gateway)
 * to suggest professional contract clauses for a category/industry.
 */
import { supabase } from '@/integrations/supabase/client';

export interface SuggestedClause {
  title: string;
  body: string;
}

export interface SuggestClausesInput {
  category?: string;
  industry?: string;
  language?: 'ar' | 'en';
  extraContext?: string;
}

export interface SuggestClausesResult {
  ok: boolean;
  clauses: SuggestedClause[];
  language?: 'ar' | 'en';
  error?: string;
}

export async function suggestContractClauses(
  input: SuggestClausesInput,
): Promise<SuggestClausesResult> {
  const { data, error } = await supabase.functions.invoke('contracts-ai-suggest-clauses', {
    body: input,
  });
  if (error) {
    return { ok: false, clauses: [], error: error.message };
  }
  const payload = (data ?? {}) as Partial<SuggestClausesResult>;
  return {
    ok: Boolean(payload.ok),
    clauses: Array.isArray(payload.clauses) ? payload.clauses.slice(0, 8) : [],
    language: payload.language,
    error: payload.error,
  };
}