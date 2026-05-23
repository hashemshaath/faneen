import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const uploadMock = vi.fn();
  const signedMock = vi.fn();
  const removeMock = vi.fn();
  const fromMock = vi.fn(() => ({
    upload: uploadMock,
    createSignedUrl: signedMock,
    remove: removeMock,
  }));
  return { uploadMock, signedMock, removeMock, fromMock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: mocks.fromMock } },
}));

import { uploadPrivateDocument } from '../uploadPrivateDocument';
import { createPrivateSignedUrl } from '../createPrivateSignedUrl';
import { removePrivateDocument } from '../removePrivateDocument';
import {
  uploadCrDocument,
  createCrDocumentSignedUrl,
  CR_DOCUMENT_SIGNED_URL_TTL_SECONDS,
} from '../../../domain/crDocuments';
import { uploadBrandAsset } from '../../../domain/branding';

const { uploadMock, signedMock, removeMock, fromMock } = mocks;

// Additional mocks for branding (uses getPublicUrl)
const brandingMocks = vi.hoisted(() => {
  const getPublicUrlMock = vi.fn();
  return { getPublicUrlMock };
});

beforeEach(() => {
  fromMock.mockClear();
  uploadMock.mockReset();
  signedMock.mockReset();
  removeMock.mockReset();
  brandingMocks.getPublicUrlMock.mockReset();
  // Augment from() to also expose getPublicUrl for branding tests.
  fromMock.mockImplementation(() => ({
    upload: uploadMock,
    createSignedUrl: signedMock,
    remove: removeMock,
    getPublicUrl: brandingMocks.getPublicUrlMock,
  }));
});

describe('F-4 private storage services', () => {
  it('uploadPrivateDocument forwards bucket/path/file/options verbatim', async () => {
    uploadMock.mockResolvedValue({ data: { path: 'p' }, error: null });
    const file = new Blob(['x']);
    await uploadPrivateDocument({
      bucket: 'business-documents',
      path: 'cr/biz/1.pdf',
      file,
      options: { upsert: false, contentType: 'application/pdf' },
    });
    expect(fromMock).toHaveBeenCalledWith('business-documents');
    expect(uploadMock).toHaveBeenCalledWith('cr/biz/1.pdf', file, {
      upsert: false,
      contentType: 'application/pdf',
    });
  });

  it('createPrivateSignedUrl forwards path + TTL verbatim', async () => {
    signedMock.mockResolvedValue({ data: { signedUrl: 'https://x' }, error: null });
    await createPrivateSignedUrl({ bucket: 'business-documents', path: 'p', expiresIn: 123 });
    expect(fromMock).toHaveBeenCalledWith('business-documents');
    expect(signedMock).toHaveBeenCalledWith('p', 123);
  });

  it('removePrivateDocument forwards paths array verbatim', async () => {
    removeMock.mockResolvedValue({ data: [], error: null });
    await removePrivateDocument({ bucket: 'business-documents', paths: ['a', 'b'] });
    expect(removeMock).toHaveBeenCalledWith(['a', 'b']);
  });

  it('CR_DOCUMENT_SIGNED_URL_TTL_SECONDS equals 1 year', () => {
    expect(CR_DOCUMENT_SIGNED_URL_TTL_SECONDS).toBe(60 * 60 * 24 * 365);
  });
});

describe('F-4 uploadCrDocument', () => {
  it('uses business-documents bucket and `cr/${businessId}/${ts}-${uuid}.${ext}` path', async () => {
    uploadMock.mockResolvedValue({ data: { path: 'p' }, error: null });
    const file = new File(['x'], 'mydoc.PDF', { type: 'application/pdf' });
    const { path, error } = await uploadCrDocument({ businessId: 'biz-1', file });
    expect(error).toBeNull();
    expect(fromMock).toHaveBeenCalledWith('business-documents');
    expect(path).toMatch(/^cr\/biz-1\/\d+-[0-9a-f-]{36}\.PDF$/);
    const [calledPath, calledFile, calledOptions] = uploadMock.mock.calls[0];
    expect(calledPath).toBe(path);
    expect(calledFile).toBe(file);
    expect(calledOptions).toEqual({ upsert: false, contentType: 'application/pdf' });
  });

  it('falls back to `bin` extension when no dot in filename', async () => {
    uploadMock.mockResolvedValue({ data: null, error: null });
    const file = new File(['x'], 'noext', { type: '' });
    const { path } = await uploadCrDocument({ businessId: 'b', file });
    expect(path).toMatch(/\.bin$/);
    // contentType is undefined when file.type is empty
    expect(uploadMock.mock.calls[0][2]).toEqual({ upsert: false, contentType: undefined });
  });
});

describe('F-4 createCrDocumentSignedUrl', () => {
  it('uses business-documents bucket and 1-year TTL', async () => {
    signedMock.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    await createCrDocumentSignedUrl('cr/biz/x.pdf');
    expect(fromMock).toHaveBeenCalledWith('business-documents');
    expect(signedMock).toHaveBeenCalledWith('cr/biz/x.pdf', 60 * 60 * 24 * 365);
  });
});

describe('F-4 uploadBrandAsset', () => {
  it('uses brand-assets bucket, `${slot}-${ts}.${ext}` path, and exact options', async () => {
    uploadMock.mockResolvedValue({ data: { path: 'p' }, error: null });
    brandingMocks.getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://pub' } });
    const file = new File(['x'], 'logo.PNG', { type: 'image/png' });
    const { publicUrl, path, error } = await uploadBrandAsset({ slot: 'brand_logo_full_light', file });
    expect(error).toBeNull();
    expect(fromMock).toHaveBeenCalledWith('brand-assets');
    expect(path).toMatch(/^brand_logo_full_light-\d+\.PNG$/);
    const [calledPath, calledFile, calledOptions] = uploadMock.mock.calls[0];
    expect(calledPath).toBe(path);
    expect(calledFile).toBe(file);
    expect(calledOptions).toEqual({ upsert: true, contentType: 'image/png', cacheControl: '3600' });
    expect(publicUrl).toBe('https://pub');
  });

  it('returns error and empty publicUrl when upload fails', async () => {
    const upErr = new Error('boom');
    uploadMock.mockResolvedValue({ data: null, error: upErr });
    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    const res = await uploadBrandAsset({ slot: 'slot', file });
    expect(res.error).toBe(upErr);
    expect(res.publicUrl).toBe('');
    expect(brandingMocks.getPublicUrlMock).not.toHaveBeenCalled();
  });

  it('matches legacy split-pop fallback to `png` only on empty', async () => {
    uploadMock.mockResolvedValue({ data: null, error: null });
    brandingMocks.getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'u' } });
    // Legacy behavior: split('.').pop() on 'logo' returns 'logo' (not 'png').
    // The 'png' fallback only fires when pop() returns '' (impossible for a non-empty name).
    const file = new File(['x'], 'logo', { type: 'image/png' });
    const { path } = await uploadBrandAsset({ slot: 'm', file });
    expect(path).toMatch(/^m-\d+\.logo$/);
  });
});