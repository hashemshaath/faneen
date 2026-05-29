import { supabase } from '@/integrations/supabase/client';
import { normalizeQuery } from './textNormalize';
import type { HelpAudience } from '../types';

export type HelpContentGapStatus =
  | 'new'
  | 'reviewing'
  | 'article_planned'
  | 'article_created'
  | 'ignored';

export interface HelpContentGapRow {
  id: string;
  ref_id: string | null;
  query_normalized: string;
  last_query: string;
  audience: HelpAudience | null;
  page_key: string | null;
  frequency: number;
  zero_result_count: number;
  suggested_title_ar: string | null;
  suggested_title_en: string | null;
  status: HelpContentGapStatus;
  created_article_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitContentGapInput {
  query: string;
  audience?: HelpAudience | null;
  page_key?: string | null;
  suggested_title_ar?: string | null;
  suggested_title_en?: string | null;
}

/**
 * Submit a content gap based on a low-confidence question.
 * Server-side RPC handles dedupe and frequency increment, scoped to authenticated users only.
 * Never sends private data — only the question and contextual page/audience keys.
 */
export async function submitHelpContentGap(input: SubmitContentGapInput): Promise<string | null> {
  const q = (input.query ?? '').trim();
  if (!q) return null;
  const norm = normalizeQuery(q).slice(0, 500);
  const { data, error } = await supabase.rpc('submit_help_content_gap', {
    _query: q.slice(0, 500),
    _query_normalized: norm,
    _audience: input.audience ?? null,
    _page_key: input.page_key ?? null,
    _suggested_title_ar: input.suggested_title_ar ?? null,
    _suggested_title_en: input.suggested_title_en ?? null,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function adminListContentGaps(limit = 200): Promise<HelpContentGapRow[]> {
  const { data, error } = await supabase
    .from('help_content_gaps')
    .select('id, ref_id, query_normalized, last_query, audience, page_key, frequency, zero_result_count, suggested_title_ar, suggested_title_en, status, created_article_id, created_at, updated_at')
    .order('frequency', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as HelpContentGapRow[];
}

export async function updateContentGapStatus(id: string, status: HelpContentGapStatus): Promise<void> {
  const { error } = await supabase.from('help_content_gaps').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Create a draft (unpublished) help article seeded from a content gap. No auto-publish. */
export async function createDraftArticleFromGap(gap: HelpContentGapRow): Promise<{ id: string; slug: string }> {
  const slugBase = (gap.suggested_title_en || gap.last_query || 'help-gap')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'help-gap';
  const slug = `${slugBase}-${gap.ref_id ?? gap.id.slice(0, 6)}`.toLowerCase();

  const titleEn = gap.suggested_title_en || `Guide: ${gap.last_query}`.slice(0, 140);
  const titleAr = gap.suggested_title_ar || `دليل: ${gap.last_query}`.slice(0, 140);

  const keywords = Array.from(
    new Set(
      (gap.query_normalized || '')
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1),
    ),
  ).slice(0, 8);

  const { data, error } = await supabase
    .from('help_articles')
    .insert({
      slug,
      audience: gap.audience ?? 'general',
      status: 'draft',
      title_ar: titleAr,
      title_en: titleEn,
      summary_ar: null,
      summary_en: null,
      content_ar: null,
      content_en: null,
      keywords,
      created_from_gap_id: gap.id,
    })
    .select('id, slug')
    .single();
  if (error) throw error;

  await updateContentGapStatus(gap.id, 'article_created');
  await supabase.from('help_content_gaps').update({ created_article_id: data!.id }).eq('id', gap.id);

  return { id: data!.id as string, slug: data!.slug as string };
}
