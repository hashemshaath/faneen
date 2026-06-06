/**
 * Integration test for `uploadPublicImage` auto-compression behavior.
 *
 * Asserts that:
 *   - JPEG/PNG inputs are converted to WebP and the upload path's extension
 *     is rewritten to `.webp`.
 *   - SVG/GIF/already-WebP inputs are uploaded untouched.
 *   - Non-image File inputs (PDF) are uploaded untouched.
 *   - `skipCompression: true` bypasses compression entirely.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type UploadCall = { path: string; file: Blob | File; options?: { contentType?: string } };
const uploadCalls: UploadCall[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn(async (path: string, file: Blob | File, options?: { contentType?: string }) => {
          uploadCalls.push({ path, file, options });
          return { data: { path }, error: null };
        }),
      }),
    },
  },
}));

// Stub the canvas-based compressor so tests stay deterministic and don't
// require a DOM. The real implementation re-encodes JPG/PNG → WebP.
vi.mock('@/lib/image-compress', () => ({
  compressImage: vi.fn(async (file: File) => {
    if (!file.type.startsWith('image/')) return file;
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
    if (file.type === 'image/webp') return file;
    const base = file.name.replace(/\.[^.]+$/, '');
    return new File([new Uint8Array(8)], `${base}.webp`, { type: 'image/webp' });
  }),
}));

import { uploadPublicImage } from '@/modules/files/services/public/uploadPublicImage';

function makeFile(name: string, type: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('uploadPublicImage — auto WebP compression', () => {
  beforeEach(() => {
    uploadCalls.length = 0;
  });

  it('converts JPEG to WebP and rewrites the upload path extension', async () => {
    await uploadPublicImage({
      bucket: 'business-assets',
      path: 'biz/logo.jpg',
      file: makeFile('logo.jpg', 'image/jpeg'),
      options: { contentType: 'image/jpeg', upsert: true },
    });
    expect(uploadCalls).toHaveLength(1);
    expect(uploadCalls[0].path).toBe('biz/logo.webp');
    expect((uploadCalls[0].file as File).type).toBe('image/webp');
    expect(uploadCalls[0].options?.contentType).toBe('image/webp');
  });

  it('converts PNG to WebP', async () => {
    await uploadPublicImage({
      bucket: 'business-assets',
      path: 'biz/logo.png',
      file: makeFile('logo.png', 'image/png'),
    });
    expect(uploadCalls[0].path).toBe('biz/logo.webp');
    expect((uploadCalls[0].file as File).type).toBe('image/webp');
  });

  it('passes already-WebP files through untouched', async () => {
    const f = makeFile('logo.webp', 'image/webp');
    await uploadPublicImage({ bucket: 'b', path: 'biz/logo.webp', file: f });
    expect(uploadCalls[0].path).toBe('biz/logo.webp');
    expect(uploadCalls[0].file).toBe(f);
  });

  it('passes SVG files through untouched (vector — no raster compression)', async () => {
    const f = makeFile('icon.svg', 'image/svg+xml');
    await uploadPublicImage({ bucket: 'b', path: 'icons/icon.svg', file: f });
    expect(uploadCalls[0].path).toBe('icons/icon.svg');
    expect(uploadCalls[0].file).toBe(f);
  });

  it('passes GIF files through untouched (animation preserved)', async () => {
    const f = makeFile('anim.gif', 'image/gif');
    await uploadPublicImage({ bucket: 'b', path: 'anim.gif', file: f });
    expect(uploadCalls[0].path).toBe('anim.gif');
    expect(uploadCalls[0].file).toBe(f);
  });

  it('passes non-image files (PDF) through untouched', async () => {
    const f = makeFile('doc.pdf', 'application/pdf');
    await uploadPublicImage({ bucket: 'b', path: 'doc.pdf', file: f });
    expect(uploadCalls[0].path).toBe('doc.pdf');
    expect(uploadCalls[0].file).toBe(f);
  });

  it('bypasses compression when skipCompression: true', async () => {
    const f = makeFile('logo.jpg', 'image/jpeg');
    await uploadPublicImage({
      bucket: 'b',
      path: 'biz/logo.jpg',
      file: f,
      skipCompression: true,
    });
    expect(uploadCalls[0].path).toBe('biz/logo.jpg');
    expect(uploadCalls[0].file).toBe(f);
  });
});