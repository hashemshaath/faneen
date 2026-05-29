import { supabase } from '@/integrations/supabase/client';
import type { HelpArticle, HelpAudience } from './types';

export interface SearchHelpArticlesOptions {
  q: string;
  audience?: HelpAudience;
  limit?: number;
}

/**
 * Search published help articles across AR + EN title/summary/keywords.
 * Uses ilike + GIN keyword index — no external search engine.
 */
export async function searchHelpArticles(opts: SearchHelpArticlesOptions): Promise<HelpArticle[]> {
  const q = (opts.q || '').trim();
  if (!q) return [];
  const like = `%${q}%`;
  let query = supabase
    .from('help_articles')
    .select('*')
    .eq('status', 'published')
    .or(
      [
        `title_ar.ilike.${like}`,
        `title_en.ilike.${like}`,
        `summary_ar.ilike.${like}`,
        `summary_en.ilike.${like}`,
        `slug.ilike.${like}`,
      ].join(','),
    )
    .limit(opts.limit ?? 20);
  if (opts.audience) query = query.eq('audience', opts.audience);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as HelpArticle[];
}