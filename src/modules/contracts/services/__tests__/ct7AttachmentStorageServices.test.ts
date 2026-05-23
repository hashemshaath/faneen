import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * CT-7 — Service-level unit tests for the contract runtime attachment
 * storage wrappers and the canonical bucket constant.
 */

function makeBucket() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const api = {
    __calls: calls,
    upload: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'upload', args });
      return Promise.resolve({ data: { path: args[0] }, error: null });
    }),
    getPublicUrl: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'getPublicUrl', args });
      return { data: { publicUrl: `https://x/${args[0]}` } };
    }),
    remove: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'remove', args });
      return Promise.resolve({ data: [], error: null });
    }),
    createSignedUrl: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'createSignedUrl', args });
      return Promise.resolve({ data: { signedUrl: `signed:${args[0]}` }, error: null });
    }),
  };
  return api;
}

const bucket = makeBucket();
const storageFrom = vi.fn((..._args: unknown[]) => bucket);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: (...args: unknown[]) => storageFrom(...(args as [unknown])) } },
}));

import {
  CONTRACT_ATTACHMENTS_BUCKET,
  uploadContractAttachmentFile,
  getContractAttachmentPublicUrl,
  removeContractAttachmentFiles,
  createSignedContractAttachmentUrl,
} from '../attachments';

beforeEach(() => {
  storageFrom.mockClear();
  bucket.upload.mockClear();
  bucket.getPublicUrl.mockClear();
  bucket.remove.mockClear();
  bucket.createSignedUrl.mockClear();
  bucket.__calls.length = 0;
});

describe('CT-7 bucket constant', () => {
  it('CONTRACT_ATTACHMENTS_BUCKET = "contract-attachments"', () => {
    expect(CONTRACT_ATTACHMENTS_BUCKET).toBe('contract-attachments');
  });
});

describe('CT-7 storage wrappers', () => {
  const file = new Blob(['x'], { type: 'image/png' }) as File;

  it('uploadContractAttachmentFile: upload(path, file, options) when options provided', async () => {
    const res = await uploadContractAttachmentFile('c1/abc.png', file, {
      contentType: 'image/png',
      upsert: false,
    });
    expect(storageFrom).toHaveBeenCalledWith('contract-attachments');
    expect(bucket.upload).toHaveBeenCalledWith('c1/abc.png', file, {
      contentType: 'image/png',
      upsert: false,
    });
    expect(res).toEqual({ data: { path: 'c1/abc.png' }, error: null });
  });

  it('uploadContractAttachmentFile: upload(path, file) when options omitted', async () => {
    await uploadContractAttachmentFile('c1/no-opts.bin', file);
    expect(bucket.upload).toHaveBeenCalledTimes(1);
    expect(bucket.upload).toHaveBeenCalledWith('c1/no-opts.bin', file);
  });

  it('getContractAttachmentPublicUrl: getPublicUrl(path) raw passthrough', () => {
    const res = getContractAttachmentPublicUrl('c1/p.png');
    expect(storageFrom).toHaveBeenCalledWith('contract-attachments');
    expect(bucket.getPublicUrl).toHaveBeenCalledWith('c1/p.png');
    expect(res.data.publicUrl).toBe('https://x/c1/p.png');
  });

  it('removeContractAttachmentFiles: remove([...paths])', async () => {
    await removeContractAttachmentFiles(['a', 'b']);
    expect(storageFrom).toHaveBeenCalledWith('contract-attachments');
    expect(bucket.remove).toHaveBeenCalledWith(['a', 'b']);
  });

  it('createSignedContractAttachmentUrl: createSignedUrl(path, expires)', async () => {
    const res = await createSignedContractAttachmentUrl('c1/p.png', 60);
    expect(storageFrom).toHaveBeenCalledWith('contract-attachments');
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('c1/p.png', 60);
    expect(res.data?.signedUrl).toBe('signed:c1/p.png');
  });
});