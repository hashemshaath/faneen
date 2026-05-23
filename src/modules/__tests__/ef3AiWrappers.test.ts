import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: invokeMock },
  },
}));

function read(p: string): string {
  return readFileSync(resolve(process.cwd(), p), 'utf8');
}

describe('EF-3 AI/content edge function wrappers', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { result: 'ok' }, error: null });
  });

  it('invokeBlogAiTools invokes blog-ai-tools with body', async () => {
    const { invokeBlogAiTools } = await import('@/modules/ai/services/blogAiTools');
    const payload = { action: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'ar' };
    const res = await invokeBlogAiTools(payload);
    expect(invokeMock).toHaveBeenCalledWith('blog-ai-tools', { body: payload });
    expect(res).toEqual({ data: { result: 'ok' }, error: null });
  });

  it('invokeBlogAiTools bubbles thrown errors', async () => {
    const { invokeBlogAiTools } = await import('@/modules/ai/services/blogAiTools');
    invokeMock.mockRejectedValueOnce(new Error('boom'));
    await expect(invokeBlogAiTools({ action: 'x' })).rejects.toThrow('boom');
  });

  it('invokeAiCenter invokes ai-center with body', async () => {
    const { invokeAiCenter } = await import('@/modules/ai/services/aiCenter');
    const payload = { prompt: 'hello', model: 'google/gemini-2.5-flash' };
    const res = await invokeAiCenter(payload);
    expect(invokeMock).toHaveBeenCalledWith('ai-center', { body: payload });
    expect(res).toEqual({ data: { result: 'ok' }, error: null });
  });

  it('invokeAiCenter passes through { data, error }', async () => {
    const { invokeAiCenter } = await import('@/modules/ai/services/aiCenter');
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: '429 rate' } });
    const res = await invokeAiCenter({ prompt: 'x' });
    expect(res.error).toEqual({ message: '429 rate' });
  });
});

describe('EF-3 callsite migration', () => {
  const directBlog = "supabase.functions.invoke('blog-ai-tools'";
  const directBlogDq = 'supabase.functions.invoke("blog-ai-tools"';
  const directAi = "supabase.functions.invoke('ai-center'";
  const directAiDq = 'supabase.functions.invoke("ai-center"';

  it('src/lib/blog-ai-utils.ts uses invokeBlogAiTools wrapper', () => {
    const src = read('src/lib/blog-ai-utils.ts');
    expect(src).not.toContain(directBlog);
    expect(src).not.toContain(directBlogDq);
    expect(src).toContain('invokeBlogAiTools(');
    expect(src).toContain("from '@/modules/ai'");
  });

  it('FieldAiActions uses invokeBlogAiTools wrapper', () => {
    const src = read('src/components/blog/FieldAiActions.tsx');
    expect(src).not.toContain(directBlog);
    expect(src).toContain('invokeBlogAiTools(');
  });

  it('BilingualField uses invokeBlogAiTools wrapper with same body fields', () => {
    const src = read('src/components/dashboard/business-edit/BilingualField.tsx');
    expect(src).not.toContain(directBlog);
    expect(src).toContain('invokeBlogAiTools({');
    expect(src).toContain("action: 'translate'");
    expect(src).toContain('translationInstructions: settings?.translation_instructions || undefined');
  });

  it('AdminProviderLanding uses invokeBlogAiTools wrapper', () => {
    const src = read('src/pages/admin/AdminProviderLanding.tsx');
    expect(src).not.toContain(directBlog);
    expect(src).toContain('invokeBlogAiTools({');
    expect(src).toContain("action: 'generate'");
    expect(src).toContain("model: 'google/gemini-2.5-flash'");
  });

  it('AdminBusinesses uses invokeBlogAiTools wrapper', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).not.toContain(directBlog);
    expect(src).toContain('invokeBlogAiTools({');
    expect(src).toContain("action: 'translate'");
  });

  it('DashboardAiCenter uses invokeAiCenter wrapper', () => {
    const src = read('src/pages/dashboard/DashboardAiCenter.tsx');
    expect(src).not.toContain(directAi);
    expect(src).not.toContain(directAiDq);
    expect(src).toContain('invokeAiCenter(');
  });

  it('does not migrate EF-4/5 deferred edge functions', () => {
    const adminContact = read('src/pages/admin/AdminContactMessages.tsx');
    expect(adminContact).toContain("functions.invoke('weekly-sla-report'");
    expect(adminContact).toContain("functions.invoke('triage-contact-message'");
    const sitemap = read('src/components/admin/SitemapSubmissionsCard.tsx');
    expect(sitemap).toContain("functions.invoke('ping-search-engines'");
    const unsub = read('src/pages/Unsubscribe.tsx');
    expect(unsub).toContain('handle-email-unsubscribe');
  });
});