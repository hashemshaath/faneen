import { describe, it, expect } from 'vitest';
import { normalizeSupabaseError, mapRpcError, callRpc, safeRpc } from '../rpc';

describe('normalizeSupabaseError', () => {
  it('returns UNKNOWN for null/undefined', () => {
    expect(normalizeSupabaseError(null).code).toBe('UNKNOWN');
    expect(normalizeSupabaseError(undefined).code).toBe('UNKNOWN');
  });

  it('detects RLS denial', () => {
    expect(normalizeSupabaseError({ code: '42501', message: 'permission denied' }).code).toBe('RLS_DENIED');
  });

  it('detects auth required', () => {
    expect(normalizeSupabaseError({ code: 'PGRST301', message: 'JWT expired' }).code).toBe('AUTH_REQUIRED');
  });

  it('detects not found', () => {
    expect(normalizeSupabaseError({ code: 'PGRST116', message: 'no rows' }).code).toBe('NOT_FOUND');
  });

  it('detects duplicate key', () => {
    expect(normalizeSupabaseError({ code: '23505', message: 'duplicate key value' }).code).toBe('DUPLICATE_KEY');
  });

  it('detects validation failure', () => {
    expect(normalizeSupabaseError({ code: '23514', message: 'check constraint' }).code).toBe('VALIDATION_FAILED');
  });

  it('detects network error', () => {
    expect(normalizeSupabaseError(new TypeError('Failed to fetch')).code).toBe('NETWORK_ERROR');
  });

  it('preserves original detail and cause', () => {
    const orig = { code: '23505', message: 'duplicate key value violates unique constraint "x_pkey"' };
    const n = normalizeSupabaseError(orig);
    expect(n.detail).toContain('duplicate key');
    expect(n.cause).toBe(orig);
  });

  it('mapRpcError mirrors normalizeSupabaseError', () => {
    const e = { code: '42501', message: 'permission denied' };
    expect(mapRpcError(e)).toEqual(normalizeSupabaseError(e));
  });

  it('never leaks raw constraint name into user-facing message', () => {
    const n = normalizeSupabaseError({ code: '23505', message: 'duplicate key value violates unique constraint "users_email_key"' });
    expect(n.message).not.toContain('users_email_key');
  });
});

describe('callRpc / safeRpc', () => {
  it('callRpc resolves data on success', async () => {
    const data = await callRpc(Promise.resolve({ data: 42, error: null }));
    expect(data).toBe(42);
  });

  it('callRpc throws normalized Error on error', async () => {
    await expect(
      callRpc(Promise.resolve({ data: null, error: { code: '42501', message: 'permission denied' } }))
    ).rejects.toMatchObject({ message: expect.stringContaining('permission') });
  });

  it('safeRpc returns ok:true on success', async () => {
    const r = await safeRpc(Promise.resolve({ data: 'x', error: null }));
    expect(r).toEqual({ ok: true, data: 'x' });
  });

  it('safeRpc returns ok:false with normalized error', async () => {
    const r = await safeRpc<string>(Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('NOT_FOUND');
    }
  });

  it('safeRpc catches thrown rejection', async () => {
    const r = await safeRpc<string>(Promise.reject(new TypeError('Failed to fetch')));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('NETWORK_ERROR');
    }
  });
});