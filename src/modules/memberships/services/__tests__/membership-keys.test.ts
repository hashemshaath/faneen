import { describe, it, expect, vi, beforeEach } from 'vitest';

type Op =
  | { kind: 'from'; table: string }
  | { kind: 'select'; arg: unknown }
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'order'; col: string; opts: unknown }
  | { kind: 'limit'; n: number };

let ops: Op[] = [];
let terminalResult: { data: unknown; error: unknown } = { data: null, error: null };

function makeBuilder() {
  const b: Record<string, unknown> = {};
  const chain = (fn: (...a: unknown[]) => Op) => (...args: unknown[]) => {
    ops.push(fn(...args));
    return b;
  };
  b.select = chain((arg) => ({ kind: 'select', arg }));
  b.eq = chain((col, val) => ({ kind: 'eq', col: String(col), val }));
  b.order = chain((col, opts) => ({ kind: 'order', col: String(col), opts }));
  b.limit = chain((n) => ({ kind: 'limit', n: Number(n) }));
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(terminalResult).then(resolve);
  return b;
}

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      ops.push({ kind: 'from', table });
      return makeBuilder();
    },
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  },
}));

import {
  listMembershipInviteKeys,
  listMembershipInviteRedemptions,
} from '../inviteKeys/reads';
import {
  generateInviteKey,
  revokeInviteKey,
} from '../inviteKeys/mutations';
import {
  listMembershipAccessKeys,
  listAccessKeyUsageLog,
} from '../accessKeys/reads';
import {
  createAccessKey,
  revokeAccessKey,
} from '../accessKeys/mutations';

beforeEach(() => {
  ops = [];
  terminalResult = { data: null, error: null };
  rpcMock.mockReset();
});

describe('inviteKeys/reads', () => {
  it('listMembershipInviteKeys preserves table/select/filter/order', async () => {
    terminalResult = { data: [{ id: 'k1' }], error: null };
    const res = await listMembershipInviteKeys({ businessId: 'b1' });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_invite_keys' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: 'id, code, role, max_uses, used_count, expires_at, status, created_at',
    });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'business_id', val: 'b1' });
    expect(ops[3]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(res).toEqual({ data: [{ id: 'k1' }], error: null });
  });

  it('listMembershipInviteRedemptions filters via FK nested column and limits', async () => {
    terminalResult = { data: [], error: null };
    await listMembershipInviteRedemptions({ businessId: 'b1' });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_invite_redemptions' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: 'id, invite_key_id, redeemed_by_user_id, business_staff_id, created_at, membership_invite_keys!inner(code, role, business_id)',
    });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'membership_invite_keys.business_id', val: 'b1' });
    expect(ops[3]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(ops[4]).toEqual({ kind: 'limit', n: 500 });
  });
});

describe('accessKeys/reads', () => {
  it('listMembershipAccessKeys preserves table/select/filter/order', async () => {
    terminalResult = { data: [{ id: 'ak1' }], error: null };
    await listMembershipAccessKeys({ businessId: 'b9' });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_access_keys' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: 'id, name, key_prefix, scopes, tier_at_creation, expires_at, revoked_at, last_used_at, created_at',
    });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'business_id', val: 'b9' });
    expect(ops[3]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
  });

  it('listAccessKeyUsageLog preserves table/select/filter/order/limit', async () => {
    terminalResult = { data: [], error: null };
    await listAccessKeyUsageLog({ businessId: 'b9' });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_access_key_usage_log' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: 'id, access_key_id, endpoint, method, status_code, ip, user_agent, created_at, membership_access_keys(name, key_prefix)',
    });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'business_id', val: 'b9' });
    expect(ops[3]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(ops[4]).toEqual({ kind: 'limit', n: 500 });
  });
});

describe('inviteKeys/mutations', () => {
  it('generateInviteKey calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({ data: { id: 'k1', code: 'XYZ' }, error: null });
    const args = {
      _business_id: 'b1',
      _role: 'viewer' as const,
      _max_uses: 3,
      _valid_days: null,
      _notes: null,
    };
    const res = await generateInviteKey(args);
    expect(rpcMock).toHaveBeenCalledWith('generate_invite_key', args);
    expect(res).toEqual({ data: { id: 'k1', code: 'XYZ' }, error: null });
  });

  it('revokeInviteKey calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await revokeInviteKey({ _key_id: 'k1', _reason: 'manual_revoke' });
    expect(rpcMock).toHaveBeenCalledWith('revoke_invite_key', { _key_id: 'k1', _reason: 'manual_revoke' });
  });
});

describe('accessKeys/mutations', () => {
  it('createAccessKey calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({ data: { id: 'a1', raw_key: 'sk_…' }, error: null });
    const args = { _name: 'ERP', _scopes: ['read'], _business_id: 'b1' };
    const res = await createAccessKey(args);
    expect(rpcMock).toHaveBeenCalledWith('create_access_key', args);
    expect(res).toEqual({ data: { id: 'a1', raw_key: 'sk_…' }, error: null });
  });

  it('revokeAccessKey calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await revokeAccessKey({ _key_id: 'a1', _reason: 'manual_revoke' });
    expect(rpcMock).toHaveBeenCalledWith('revoke_access_key', { _key_id: 'a1', _reason: 'manual_revoke' });
  });

  it('RPC wrappers pass through { error } without throwing', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const res = await revokeAccessKey({ _key_id: 'x', _reason: 'r' });
    expect(res.error).toEqual({ message: 'boom' });
  });

  it('RPC wrappers bubble thrown supabase errors', async () => {
    rpcMock.mockRejectedValueOnce(new Error('network'));
    await expect(revokeAccessKey({ _key_id: 'x', _reason: 'r' })).rejects.toThrow('network');
  });
});