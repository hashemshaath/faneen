import { supabase } from '@/integrations/supabase/client';
import type { HelpArticle, HelpAudience } from './types';
import { normalizeQuery } from './intelligence/textNormalize';

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
  const normalized = normalizeQuery(q);
  const tokens = Array.from(new Set([q, normalized, ...normalized.split(/\s+/).filter((t) => t.length >= 2)])).slice(0, 5);
  const escape = (s: string) => s.replace(/[,()]/g, ' ').trim();
  const orParts: string[] = [];
  for (const t of tokens) {
    const safe = escape(t);
    if (!safe) continue;
    const like = `%${safe}%`;
    orParts.push(
      `title_ar.ilike.${like}`,
      `title_en.ilike.${like}`,
      `summary_ar.ilike.${like}`,
      `summary_en.ilike.${like}`,
      `slug.ilike.${like}`,
    );
  }
  let query = supabase
    .from('help_articles')
    .select('*')
    .eq('status', 'published')
    .or(orParts.join(','))
    .limit(opts.limit ?? 20);
  if (opts.audience) query = query.eq('audience', opts.audience);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as HelpArticle[];
}