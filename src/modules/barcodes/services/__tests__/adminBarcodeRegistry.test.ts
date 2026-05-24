import { describe, expect, it, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import {
  listBarcodeRegistryRecords,
  getBarcodeRegistrySummary,
  getBarcodeRegistryRecordById,
  freezeBarcodeAdmin,
  archiveBarcodeAdmin,
  restoreBarcodeAdmin,
  transferBarcodeAdmin,
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

describe('adminBarcodeRegistry lifecycle wrappers', () => {
  it('freezeBarcodeAdmin calls admin_freeze_barcode with id + reason and returns raw envelope', async () => {
    const envelope = { data: { ok: true, new_status: 'frozen' }, error: null };
    rpcMock.mockResolvedValue(envelope);
    const out = await freezeBarcodeAdmin('bc-1', 'manual review');
    expect(rpcMock).toHaveBeenCalledWith('admin_freeze_barcode', {
      _barcode_id: 'bc-1',
      _reason: 'manual review',
    });
    expect(out).toBe(envelope);
  });

  it('freezeBarcodeAdmin defaults reason to null when omitted', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
    await freezeBarcodeAdmin('bc-1');
    expect(rpcMock).toHaveBeenCalledWith('admin_freeze_barcode', {
      _barcode_id: 'bc-1',
      _reason: null,
    });
  });

  it('archiveBarcodeAdmin calls admin_archive_barcode and passes errors through unthrown', async () => {
    const envelope = { data: null, error: { message: 'forbidden' } };
    rpcMock.mockResolvedValue(envelope);
    const out = await archiveBarcodeAdmin('bc-2', null);
    expect(rpcMock).toHaveBeenCalledWith('admin_archive_barcode', {
      _barcode_id: 'bc-2',
      _reason: null,
    });
    expect(out).toBe(envelope);
  });

  it('restoreBarcodeAdmin calls admin_restore_barcode with id + reason', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, new_status: 'active' }, error: null });
    await restoreBarcodeAdmin('bc-3', 'admin restore');
    expect(rpcMock).toHaveBeenCalledWith('admin_restore_barcode', {
      _barcode_id: 'bc-3',
      _reason: 'admin restore',
    });
  });

  it('lifecycle wrappers never throw on RPC error (raw envelope contract)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(freezeBarcodeAdmin('x')).resolves.toMatchObject({ error: { message: 'boom' } });
    await expect(archiveBarcodeAdmin('x')).resolves.toMatchObject({ error: { message: 'boom' } });
    await expect(restoreBarcodeAdmin('x')).resolves.toMatchObject({ error: { message: 'boom' } });
  });
});

describe('adminBarcodeRegistry transfer wrapper', () => {
  it('transferBarcodeAdmin calls admin_transfer_barcode with exact params and returns raw envelope', async () => {
    const envelope = { data: { ok: true, new_status: 'transferred' }, error: null };
    rpcMock.mockResolvedValue(envelope);
    const out = await transferBarcodeAdmin('bc-1', 'user-9', 'ownership change');
    expect(rpcMock).toHaveBeenCalledWith('admin_transfer_barcode', {
      _barcode_id: 'bc-1',
      _transfer_to_user_id: 'user-9',
      _reason: 'ownership change',
    });
    expect(out).toBe(envelope);
  });

  it('transferBarcodeAdmin defaults reason to null when omitted', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
    await transferBarcodeAdmin('bc-1', 'user-9');
    expect(rpcMock).toHaveBeenCalledWith('admin_transfer_barcode', {
      _barcode_id: 'bc-1',
      _transfer_to_user_id: 'user-9',
      _reason: null,
    });
  });

  it('transferBarcodeAdmin passes RPC errors through unthrown', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
    await expect(transferBarcodeAdmin('x', 'y')).resolves.toMatchObject({
      error: { message: 'forbidden' },
    });
  });
});