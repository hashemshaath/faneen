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

  it('Phase 2: showcase uses pipeline-nested paths + 1-year immutable cache', () => {
    const src = read('src/modules/files/domain/showcase.ts');
    // Phase 2 layout: `${userId}/${ts}/${variant.key}.webp` (pipeline variants)
    // with a legacy fallback `${userId}/${ts}.webp` when the pipeline fails.
    expect(src).toContain('${userId}/${ts}');
    expect(src).toContain('${folder}/${variant.key}.webp');
    expect(src).toContain('${userId}/${ts}.webp');
    // Long-lived immutable cache (paths are timestamped per variant).
    expect(src).toContain("cacheControl: '31536000, immutable'");
    expect(src).toContain('upsert: false');
    // Pipeline integration markers.
    expect(src).toContain('processImage');
    expect(src).toContain('image_assets');
  });

  it('preserves blog list options { limit: 100, sortBy created_at desc }', () => {
    const src = read('src/modules/files/domain/blogMedia.ts');
    expect(src).toContain('limit: 100');
    expect(src).toContain("column: 'created_at'");
    expect(src).toContain("order: 'desc'");
  });

  it('out-of-scope storage callsites: F-4 has now migrated them', () => {
    expect(read('src/pages/admin/AdminBranding.tsx')).not.toMatch(/supabase\.storage/);
    expect(read('src/components/admin/CrDocumentScanner.tsx')).not.toMatch(/supabase\.storage/);
  });

  it('F-2 ImageUpload + DashboardLayout remain clean', () => {
    expect(read('src/components/ui/image-upload.tsx')).not.toMatch(/supabase\.storage/);
    expect(read('src/components/dashboard/DashboardLayout.tsx')).not.toMatch(/supabase\.storage/);
  });
});