import { supabase } from '@/integrations/supabase/client';
import type { HelpArticle } from './types';

export async function listPublishedArticles(opts: { categoryId?: string; limit?: number } = {}): Promise<HelpArticle[]> {
  let q = supabase
    .from('help_articles')
    .select('*')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  if (opts.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HelpArticle[];
}

export async function getArticleBySlug(slug: string): Promise<HelpArticle | null> {
  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as HelpArticle | null) ?? null;
}

export async function listPopularArticles(limit = 6): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .eq('status', 'published')
    .order('views_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as HelpArticle[];
}

export async function bumpArticleView(slug: string): Promise<void> {
  await supabase.rpc('bump_help_article_view', { _slug: slug });
}

export async function bumpArticleHelpful(slug: string, helpful: boolean): Promise<void> {
  await supabase.rpc('bump_help_article_helpful', { _slug: slug, _helpful: helpful });
}

export async function adminListAllArticles(): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from('help_articles')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as HelpArticle[];
}

export async function adminUpdateArticleStatus(id: string, status: 'draft' | 'published'): Promise<void> {
  const { error } = await supabase.from('help_articles').update({ status }).eq('id', id);
  if (error) throw error;
}