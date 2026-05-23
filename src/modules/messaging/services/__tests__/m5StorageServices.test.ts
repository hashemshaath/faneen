import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: (b: string) => fromMock(b) },
  },
}));

import {
  uploadChatAttachment,
  getChatAttachmentPublicUrl,
  CHAT_ATTACHMENTS_BUCKET,
} from '../../index';

beforeEach(() => {
  fromMock.mockClear();
  uploadMock.mockReset();
  getPublicUrlMock.mockReset();
});

describe('M-5 messaging storage helpers', () => {
  it('CHAT_ATTACHMENTS_BUCKET is exactly chat-attachments', () => {
    expect(CHAT_ATTACHMENTS_BUCKET).toBe('chat-attachments');
  });

  it('uploadChatAttachment uses chat-attachments bucket and passes path/file/options through unchanged', async () => {
    uploadMock.mockResolvedValue({ data: { path: 'p' }, error: null });
    const file = new Blob(['x'], { type: 'image/png' }) as unknown as File;
    const opts = { contentType: 'image/png' };
    const res = await uploadChatAttachment('user/1.png', file, opts);
    expect(fromMock).toHaveBeenCalledWith('chat-attachments');
    expect(uploadMock).toHaveBeenCalledWith('user/1.png', file, opts);
    expect(res).toEqual({ data: { path: 'p' }, error: null });
  });

  it('uploadChatAttachment returns raw error result without transformation', async () => {
    const err = { message: 'boom' };
    uploadMock.mockResolvedValue({ data: null, error: err });
    const res = await uploadChatAttachment('p', new Blob() as unknown as File);
    expect(res.error).toBe(err);
  });

  it('getChatAttachmentPublicUrl uses chat-attachments bucket and returns raw publicUrl shape', () => {
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://x/y' } });
    const res = getChatAttachmentPublicUrl('user/1.png');
    expect(fromMock).toHaveBeenCalledWith('chat-attachments');
    expect(getPublicUrlMock).toHaveBeenCalledWith('user/1.png');
    expect(res.data.publicUrl).toBe('https://x/y');
  });
});