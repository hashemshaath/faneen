/**
 * Calls the contracts-ai-suggest-clauses edge function (Lovable AI Gateway)
 * to suggest professional contract clauses for a category/industry.
 *
 * STATUS (STAB-1J audit): Deferred — wrapper is production-ready but has
 * NO UI caller yet. Intended integration points (any of these is appropriate
 * future product work, not part of stabilization):
 *   - src/pages/admin/AdminContractTemplates.tsx (admin template authoring)
 *   - src/components/admin/contract-templates/EditorPanels.tsx
 *   - src/components/contracts/dashboard/create/* (contract creation flow)
 * Do not delete this wrapper or the edge function without product sign-off:
 * the function is deployed, auth-checked, and tracked by the inventory test.
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