import { describe, expect, it, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import {
  listBarcodeRegistryRecords,
  getBarcodeRegistrySummary,
  getBarcodeRegistryRecordById,
} from '../adminBarcodeRegistry';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('adminBarcodeRegistry service wrappers', () => {
  it('listBarcodeRegistryRecords calls admin_list_barcodes with the exact filter shape', async () => {
    rpcMock.mockResolvedValue({ data: { rows: [], total: 0, limit: 25, offset: 0 }, error: null });
    await listBarcodeRegistryRecords({
      search: 'abc',
      entityType: 'business',
      status: 'active',
      visibility: 'public',
      limit: 25,
      offset: 50,
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('admin_list_barcodes', {
      _search: 'abc',
      _entity_type: 'business',
      _status: 'active',
      _visibility: 'public',
      _limit: 25,
      _offset: 50,
    });
  });

  it('listBarcodeRegistryRecords passes nulls when filters are omitted', async () => {
    rpcMock.mockResolvedValue({ data: { rows: [], total: 0, limit: 10, offset: 0 }, error: null });
    await listBarcodeRegistryRecords({ limit: 10, offset: 0 });
    expect(rpcMock).toHaveBeenCalledWith('admin_list_barcodes', {
      _search: null,
      _entity_type: null,
      _status: null,
      _visibility: null,
      _limit: 10,
      _offset: 0,
    });
  });

  it('listBarcodeRegistryRecords surfaces RPC errors', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'denied' } });
    await expect(
      listBarcodeRegistryRecords({ limit: 10, offset: 0 }),
    ).rejects.toMatchObject({ message: 'denied' });
  });

  it('getBarcodeRegistrySummary calls admin_barcode_registry_summary with no args', async () => {
    rpcMock.mockResolvedValue({ data: { total: 0 }, error: null });
    await getBarcodeRegistrySummary();
    expect(rpcMock).toHaveBeenCalledWith('admin_barcode_registry_summary');
  });

  it('getBarcodeRegistryRecordById calls admin_get_barcode_detail with the barcode id', async () => {
    rpcMock.mockResolvedValue({ data: { barcode: {}, events: [], links: [], counts: {} }, error: null });
    await getBarcodeRegistryRecordById('bc-123');
    expect(rpcMock).toHaveBeenCalledWith('admin_get_barcode_detail', { _barcode_id: 'bc-123' });
  });
});