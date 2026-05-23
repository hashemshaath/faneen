import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const listMock = vi.fn();
  const fromMock = vi.fn(() => ({ list: listMock }));
  return { listMock, fromMock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: mocks.fromMock } },
}));

import { listPublicImages } from '../listPublicImages';

const { listMock, fromMock } = mocks;

beforeEach(() => {
  fromMock.mockClear();
  listMock.mockReset();
});

describe('listPublicImages', () => {
  it('forwards bucket, path, and options verbatim', async () => {
    listMock.mockResolvedValue({ data: [], error: null });
    await listPublicImages({
      bucket: 'blog-images',
      path: 'user-1',
      options: { limit: 100, sortBy: { column: 'created_at', order: 'desc' } },
    });
    expect(fromMock).toHaveBeenCalledWith('blog-images');
    expect(listMock).toHaveBeenCalledWith('user-1', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });
  });
});