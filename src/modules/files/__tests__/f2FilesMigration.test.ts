import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALLOWED_PUBLIC_IMAGE_MIMES } from '@/lib/image-validate';
import { IMAGE_BUCKET_CONSTRAINTS } from '@/modules/files';

const ROOT = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('F-2 storage migration', () => {
  it('IMAGE_BUCKET_CONSTRAINTS matches the legacy BUCKET_CONSTRAINTS verbatim', () => {
    expect(IMAGE_BUCKET_CONSTRAINTS['business-assets']).toEqual({
      maxMB: 2,
      mimes: [...ALLOWED_PUBLIC_IMAGE_MIMES],
    });
    expect(IMAGE_BUCKET_CONSTRAINTS['portfolio-images']).toEqual({
      maxMB: 5,
      mimes: [...ALLOWED_PUBLIC_IMAGE_MIMES],
    });
    expect(IMAGE_BUCKET_CONSTRAINTS['project-images']).toEqual({
      maxMB: 5,
      mimes: [...ALLOWED_PUBLIC_IMAGE_MIMES],
    });
    expect(IMAGE_BUCKET_CONSTRAINTS['blog-images']).toEqual({
      maxMB: 5,
      mimes: [...ALLOWED_PUBLIC_IMAGE_MIMES],
    });
  });

  it('image-upload.tsx no longer calls supabase.storage directly', () => {
    const src = read('src/components/ui/image-upload.tsx');
    expect(src).not.toMatch(/supabase\.storage/);
    expect(src).not.toMatch(/storage\.from\(/);
    expect(src).toContain("from '@/modules/files'");
    expect(src).toContain('uploadPublicImage');
    expect(src).toContain('getPublicImageUrl');
    expect(src).toContain('removePublicImage');
    expect(src).toContain('extractPublicStoragePath');
    expect(src).toContain('IMAGE_BUCKET_CONSTRAINTS');
  });

  it('DashboardLayout.tsx no longer calls supabase.storage for avatar', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    expect(src).not.toMatch(/supabase\.storage/);
    expect(src).toContain('uploadAvatar');
    expect(src).toContain("from '@/modules/files'");
  });

  it('preserves the avatar path format `${userId}/avatar.${ext}`', () => {
    const src = read('src/modules/files/domain/avatar.ts');
    expect(src).toContain('${userId}/avatar.${ext}');
    expect(src).toContain('upsert: true');
    expect(src).toContain('contentType: file.type');
  });

  it('out-of-scope storage callsites remain direct (deferred to F-3..F-5)', () => {
    expect(read('src/components/blog/RichMarkdownEditor.tsx')).toMatch(/supabase\.storage\.from\('blog-images'\)/);
    expect(read('src/pages/dashboard/DashboardShowcase.tsx')).toMatch(/supabase\.storage\.from\("showcase"\)/);
    expect(read('src/pages/admin/AdminBranding.tsx')).toMatch(/supabase\.storage\.from\('brand-assets'\)/);
    expect(read('src/components/admin/CrDocumentScanner.tsx')).toMatch(/supabase\.storage/);
  });
});