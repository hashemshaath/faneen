import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadMock = vi.fn();
const fromMock = vi.fn((..._args: unknown[]) => ({ upload: uploadMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: (b: string) => fromMock(b) } },
}));

import { uploadQuoteRequestFile } from '../uploadQuoteRequestFile';

const makeFile = (name = 'doc.pdf', type = 'application/pdf') =>
  new File([new Uint8Array([1, 2, 3])], name, { type });

beforeEach(() => {
  uploadMock.mockReset();
  fromMock.mockClear();
});

describe('uploadQuoteRequestFile', () => {
  it('uses the exact bucket name "quote-request-files"', async () => {
    uploadMock.mockResolvedValue({ error: null });
    await uploadQuoteRequestFile({ path: 'q1/abc.pdf', file: makeFile() });
    expect(fromMock).toHaveBeenCalledWith('quote-request-files');
  });

  it('uploads to the exact path with the exact File and exact options', async () => {
    uploadMock.mockResolvedValue({ error: null });
    const file = makeFile('photo.png', 'image/png');
    await uploadQuoteRequestFile({ path: 'q9/123-0-photo.png', file });
    expect(uploadMock).toHaveBeenCalledWith('q9/123-0-photo.png', file, {
      upsert: false,
      contentType: 'image/png',
    });
  });

  it('forwards undefined contentType when file.type is empty', async () => {
    uploadMock.mockResolvedValue({ error: null });
    const file = makeFile('blob', '');
    await uploadQuoteRequestFile({ path: 'q/blob', file });
    expect(uploadMock).toHaveBeenCalledWith('q/blob', file, {
      upsert: false,
      contentType: undefined,
    });
  });

  it('throws on storage upload error', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'denied' } });
    await expect(
      uploadQuoteRequestFile({ path: 'q/x', file: makeFile() }),
    ).rejects.toMatchObject({ message: 'denied' });
  });

  it('returns the path on success', async () => {
    uploadMock.mockResolvedValue({ error: null });
    const res = await uploadQuoteRequestFile({ path: 'q/y', file: makeFile() });
    expect(res).toEqual({ path: 'q/y' });
  });
});