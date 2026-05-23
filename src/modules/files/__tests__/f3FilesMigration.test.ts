import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('F-3 storage migration (showcase + blog)', () => {
  it('DashboardShowcase.tsx no longer calls supabase.storage directly', () => {
    const src = read('src/pages/dashboard/DashboardShowcase.tsx');
    expect(src).not.toMatch(/supabase\.storage/);
    expect(src).toContain('uploadShowcaseImage');
    expect(src).toContain("from \"@/modules/files\"");
  });

  it('RichMarkdownEditor.tsx no longer calls supabase.storage directly', () => {
    const src = read('src/components/blog/RichMarkdownEditor.tsx');
    expect(src).not.toMatch(/supabase\.storage/);
    expect(src).toContain('uploadBlogContentImage');
    expect(src).toContain('getBlogContentImageUrl');
    expect(src).toContain('listBlogImages');
    expect(src).toContain("from '@/modules/files'");
  });

  it('preserves showcase path format `${userId}/${ts}.${ext}` and options', () => {
    const src = read('src/modules/files/domain/showcase.ts');
    expect(src).toContain('${userId}/${Date.now()}.${ext}');
    expect(src).toContain("cacheControl: '3600'");
    expect(src).toContain('upsert: false');
  });

  it('preserves blog list options { limit: 100, sortBy created_at desc }', () => {
    const src = read('src/modules/files/domain/blogMedia.ts');
    expect(src).toContain('limit: 100');
    expect(src).toContain("column: 'created_at'");
    expect(src).toContain("order: 'desc'");
  });

  it('out-of-scope storage callsites remain direct (deferred to F-4)', () => {
    expect(read('src/pages/admin/AdminBranding.tsx')).toMatch(/supabase\.storage\.from\('brand-assets'\)/);
    expect(read('src/components/admin/CrDocumentScanner.tsx')).toMatch(/supabase\.storage/);
  });

  it('F-2 ImageUpload + DashboardLayout remain clean', () => {
    expect(read('src/components/ui/image-upload.tsx')).not.toMatch(/supabase\.storage/);
    expect(read('src/components/dashboard/DashboardLayout.tsx')).not.toMatch(/supabase\.storage/);
  });
});