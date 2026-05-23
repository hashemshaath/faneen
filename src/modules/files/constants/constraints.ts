import { ALLOWED_PUBLIC_IMAGE_MIMES } from '@/lib/image-validate';

/**
 * Per-bucket public image upload constraints. Mirrors the server-side
 * `storage.buckets` limits. Migrated verbatim from the previous local
 * `BUCKET_CONSTRAINTS` table in `src/components/ui/image-upload.tsx`.
 *
 * Phase 5 note: GIF removed across all public/business image buckets —
 * none of these flows need animation, and dropping GIF reduces
 * XSS-via-tracking-pixel risk and saves bandwidth. SVG remains blocked
 * everywhere except admin-only `brand-assets`.
 */
export const IMAGE_BUCKET_CONSTRAINTS: Record<
  string,
  { maxMB: number; mimes: string[] }
> = {
  'business-assets':  { maxMB: 2, mimes: [...ALLOWED_PUBLIC_IMAGE_MIMES] },
  'portfolio-images': { maxMB: 5, mimes: [...ALLOWED_PUBLIC_IMAGE_MIMES] },
  'project-images':   { maxMB: 5, mimes: [...ALLOWED_PUBLIC_IMAGE_MIMES] },
  'blog-images':      { maxMB: 5, mimes: [...ALLOWED_PUBLIC_IMAGE_MIMES] },
};