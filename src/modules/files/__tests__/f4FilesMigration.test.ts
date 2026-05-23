import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('F-4 storage migration (business-documents + brand-assets)', () => {
  it('CrDocumentScanner.tsx no longer calls supabase.storage directly', () => {
    const src = read('src/components/admin/CrDocumentScanner.tsx');
    expect(src).not.toMatch(/supabase\.storage/);
    expect(src).not.toMatch(/storage\.from\(/);
    expect(src).not.toMatch(/'business-documents'/);
    expect(src).toContain('uploadCrDocument');
    expect(src).toContain('createCrDocumentSignedUrl');
    expect(src).toContain("from '@/modules/files'");
  });

  it('AdminBranding.tsx no longer calls supabase.storage directly', () => {
    const src = read('src/pages/admin/AdminBranding.tsx');
    expect(src).not.toMatch(/supabase\.storage/);
    expect(src).not.toMatch(/'brand-assets'/);
    expect(src).toContain('uploadBrandAsset');
    expect(src).toContain("from '@/modules/files'");
  });

  it('preserves CR path format `cr/${businessId}/${ts}-${uuid}.${ext}` and 1y TTL', () => {
    const src = read('src/modules/files/domain/crDocuments.ts');
    expect(src).toContain('cr/${businessId}/${Date.now()}-${crypto.randomUUID()}.${ext}');
    expect(src).toContain('60 * 60 * 24 * 365');
    expect(src).toContain('upsert: false');
    expect(src).toContain('contentType: file.type || undefined');
  });

  it('preserves brand-assets path format `${slot}-${ts}.${ext}` and options', () => {
    const src = read('src/modules/files/domain/branding.ts');
    expect(src).toContain('${slot}-${Date.now()}.${ext}');
    expect(src).toContain('upsert: true');
    expect(src).toContain("cacheControl: '3600'");
    expect(src).toContain('contentType: file.type');
  });

  it('exposes new bucket constants', () => {
    const src = read('src/modules/files/constants/buckets.ts');
    expect(src).toContain("BUSINESS_DOCUMENTS_BUCKET = 'business-documents'");
    expect(src).toContain("BRAND_ASSETS_BUCKET = 'brand-assets'");
  });

  it('previous-phase targets remain clean', () => {
    expect(read('src/components/ui/image-upload.tsx')).not.toMatch(/supabase\.storage/);
    expect(read('src/components/dashboard/DashboardLayout.tsx')).not.toMatch(/supabase\.storage/);
    expect(read('src/pages/dashboard/DashboardShowcase.tsx')).not.toMatch(/supabase\.storage/);
    expect(read('src/components/blog/RichMarkdownEditor.tsx')).not.toMatch(/supabase\.storage/);
  });
});