import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AiAction = 'translate' | 'generate_keywords' | 'generate_meta' | 'seo_analysis' | 'improve_content' | 'generate_excerpt' | 'competitor_analysis';

interface AiRequest {
  action: AiAction;
  text?: string;
  sourceLang?: string;
  targetLang?: string;
  title?: string;
  content?: string;
  keywords?: string[];
}

export async function callBlogAi(params: AiRequest): Promise<string> {
  const { data, error } = await supabase.functions.invoke('blog-ai-tools', {
    body: params,
  });
  if (error) {
    if (error.message?.includes('429')) toast.error('Rate limited, please wait.');
    else if (error.message?.includes('402')) toast.error('Credits exhausted.');
    else toast.error(error.message || 'AI error');
    throw error;
  }
  return data?.result || '';
}

export function parseJsonResponse(raw: string): any {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/** Strip markdown formatting symbols from plain-text fields (titles, excerpts, meta) */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')       // headings ## 
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1') // ***bold italic***
    .replace(/\*\*(.*?)\*\*/g, '$1')     // **bold**
    .replace(/\*(.*?)\*/g, '$1')         // *italic*
    .replace(/__(.*?)__/g, '$1')         // __underline__
    .replace(/~~(.*?)~~/g, '$1')         // ~~strikethrough~~
    .replace(/`([^`]+)`/g, '$1')         // `code`
    .replace(/```[\s\S]*?```/g, '')      // code blocks
    .replace(/^\s*[-*+]\s+/gm, '')       // bullet lists
    .replace(/^\s*\d+\.\s+/gm, '')       // numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) → link
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // images
    .replace(/^>\s+/gm, '')             // blockquotes
    .replace(/---+/g, '')               // horizontal rules
    .replace(/\n{3,}/g, '\n\n')         // excess newlines
    .trim();
}

export function calculateReadingTime(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function calculateLocalSeoScore(form: {
  title_ar: string;
  meta_title_ar: string;
  meta_description_ar: string;
  focus_keyword: string;
  content_ar: string;
  cover_image_url: string;
  tags: string;
  excerpt_ar: string;
  slug: string;
}): number {
  let score = 0;
  const checks = 10;

  // Title length 50-60
  if (form.title_ar.length >= 20 && form.title_ar.length <= 70) score++;
  // Meta title
  if (form.meta_title_ar && form.meta_title_ar.length >= 30 && form.meta_title_ar.length <= 60) score++;
  // Meta description 120-160
  if (form.meta_description_ar && form.meta_description_ar.length >= 100 && form.meta_description_ar.length <= 160) score++;
  // Focus keyword exists
  if (form.focus_keyword) score++;
  // Focus keyword in title
  if (form.focus_keyword && form.title_ar.includes(form.focus_keyword)) score++;
  // Content length > 300 words
  if (form.content_ar && form.content_ar.split(/\s+/).length > 300) score++;
  // Has cover image
  if (form.cover_image_url) score++;
  // Has tags
  if (form.tags && form.tags.split(',').filter(Boolean).length >= 3) score++;
  // Has excerpt
  if (form.excerpt_ar && form.excerpt_ar.length >= 50) score++;
  // Has slug
  if (form.slug && form.slug.length > 5) score++;

  return Math.round((score / checks) * 100);
}
