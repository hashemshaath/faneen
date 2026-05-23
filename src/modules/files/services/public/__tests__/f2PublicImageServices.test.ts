import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const removeMock = vi.fn();
  const uploadMock = vi.fn();
  const getPublicUrlMock = vi.fn();
  const fromMock = vi.fn(() => ({
    upload: uploadMock,
    getPublicUrl: getPublicUrlMock,
    remove: removeMock,
  }));
  return { removeMock, uploadMock, getPublicUrlMock, fromMock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: mocks.fromMock } },
}));

const { removeMock, uploadMock, getPublicUrlMock, fromMock } = mocks;

import { uploadPublicImage } from '../uploadPublicImage';
import { getPublicImageUrl } from '../getPublicImageUrl';
import { removePublicImage } from '../removePublicImage';
import { extractPublicStoragePath } from '../extractPublicStoragePath';

beforeEach(() => {
  fromMock.mockClear();
  uploadMock.mockReset();
  getPublicUrlMock.mockReset();
  removeMock.mockReset();
});

describe('uploadPublicImage', () => {
  it('forwards bucket/path/file/options verbatim', async () => {
    uploadMock.mockResolvedValue({ data: null, error: null });
    const file = new Blob(['x']);
    await uploadPublicImage({
      bucket: 'business-assets',
      path: 'u/avatar.webp',
      file,
      options: { upsert: true, contentType: 'image/webp' },
    });
    expect(fromMock).toHaveBeenCalledWith('business-assets');
    expect(uploadMock).toHaveBeenCalledWith('u/avatar.webp', file, {
      upsert: true,
      contentType: 'image/webp',
    });
  });
});

describe('getPublicImageUrl', () => {
  it('forwards bucket and path', () => {
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://x/y' } });
    const r = getPublicImageUrl({ bucket: 'portfolio-images', path: 'a/b.jpg' });
    expect(fromMock).toHaveBeenCalledWith('portfolio-images');
    expect(getPublicUrlMock).toHaveBeenCalledWith('a/b.jpg');
    expect(r.data.publicUrl).toBe('https://x/y');
  });
});

describe('removePublicImage', () => {
  it('removes a single path as an array', async () => {
    removeMock.mockResolvedValue({ data: null, error: null });
    await removePublicImage({ bucket: 'project-images', path: 'u/img.jpg' });
    expect(fromMock).toHaveBeenCalledWith('project-images');
    expect(removeMock).toHaveBeenCalledWith(['u/img.jpg']);
  });
});

describe('extractPublicStoragePath', () => {
  it('extracts and decodes a valid public URL path', () => {
    const out = extractPublicStoragePath({
      bucket: 'business-assets',
      publicUrl: 'https://x.supabase.co/storage/v1/object/public/business-assets/u%201/avatar.webp',
    });
    expect(out).toBe('u 1/avatar.webp');
  });

  it('returns null for external URLs', () => {
    expect(
      extractPublicStoragePath({ bucket: 'business-assets', publicUrl: 'https://other.example/x.png' }),
    ).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(extractPublicStoragePath({ bucket: 'business-assets', publicUrl: 'not a url' })).toBeNull();
  });
});