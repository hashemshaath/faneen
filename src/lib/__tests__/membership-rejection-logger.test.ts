import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyRejectionReason,
  logUpgradeRejection,
} from '../membership-rejection-logger';

/**
 * Integration tests — simulate the two main DB-side rejections raised when a
 * user tries to insert into `membership_upgrade_requests` with a stale or
 * spoofed business pairing, and verify `log_upgrade_rejection` receives the
 * exact payload the audit table expects.
 */

// Real Postgres trigger / RLS messages (kept in sync with the DB).
const REF_ID_MISMATCH_MSG =
  'new row for relation "membership_upgrade_requests" violates check: business_ref_id BIZ-1000099 does not match business BIZ-1000123';
const BUSINESS_USER_MISMATCH_MSG =
  'business 11111111-1111-1111-1111-111111111111 does not belong to user 22222222-2222-2222-2222-222222222222';
const NOT_FOUND_MSG = 'Business not found';
const MISSING_REF_MSG = 'business_ref_id is required';
const UNRELATED_MSG = 'duplicate key value violates unique constraint';

describe('classifyRejectionReason', () => {
  it('detects ref_id_mismatch from trigger message', () => {
    expect(classifyRejectionReason(REF_ID_MISMATCH_MSG)).toBe('ref_id_mismatch');
  });

  it('detects business_user_mismatch from RLS message', () => {
    expect(classifyRejectionReason(BUSINESS_USER_MISMATCH_MSG)).toBe(
      'business_user_mismatch',
    );
  });

  it('detects business_not_found and missing_ref_id', () => {
    expect(classifyRejectionReason(NOT_FOUND_MSG)).toBe('business_not_found');
    expect(classifyRejectionReason(MISSING_REF_MSG)).toBe('missing_ref_id');
  });

  it('returns null for unrelated errors and empty input', () => {
    expect(classifyRejectionReason(UNRELATED_MSG)).toBeNull();
    expect(classifyRejectionReason('')).toBeNull();
    expect(classifyRejectionReason(null)).toBeNull();
    expect(classifyRejectionReason(undefined)).toBeNull();
  });
});

describe('logUpgradeRejection — RPC payload', () => {
  let rpc: ReturnType<typeof vi.fn>;
  let client: { rpc: typeof rpc };

  beforeEach(() => {
    rpc = vi.fn().mockResolvedValue({ data: 'aud-1111-2222-3333', error: null });
    client = { rpc };
  });

  it('logs ref_id_mismatch with the attempted ref_id and tier', async () => {
    const res = await logUpgradeRejection(client, {
      errorMessage: REF_ID_MISMATCH_MSG,
      attemptedBusinessId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      attemptedBusinessRefId: 'BIZ-1000099',
      requestedTier: 'premium',
      billingCycle: 'yearly',
      userAgent: 'vitest/jsdom',
    });

    expect(res).toEqual({ reason: 'ref_id_mismatch', logged: true, auditId: 'aud-1111-2222-3333' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('log_upgrade_rejection', {
      _attempted_business_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      _attempted_business_ref_id: 'BIZ-1000099',
      _requested_tier: 'premium',
      _billing_cycle: 'yearly',
      _reason_code: 'ref_id_mismatch',
      _error_message: REF_ID_MISMATCH_MSG,
      _user_agent: 'vitest/jsdom',
    });
  });

  it('logs business_user_mismatch when the business belongs to another user', async () => {
    const res = await logUpgradeRejection(client, {
      errorMessage: BUSINESS_USER_MISMATCH_MSG,
      attemptedBusinessId: '11111111-1111-1111-1111-111111111111',
      attemptedBusinessRefId: 'BIZ-1000200',
      requestedTier: 'enterprise',
      billingCycle: 'monthly',
      userAgent: 'vitest/jsdom',
    });

    expect(res).toEqual({ reason: 'business_user_mismatch', logged: true, auditId: 'aud-1111-2222-3333' });
    expect(rpc).toHaveBeenCalledWith(
      'log_upgrade_rejection',
      expect.objectContaining({
        _attempted_business_id: '11111111-1111-1111-1111-111111111111',
        _attempted_business_ref_id: 'BIZ-1000200',
        _reason_code: 'business_user_mismatch',
        _requested_tier: 'enterprise',
        _billing_cycle: 'monthly',
        _error_message: BUSINESS_USER_MISMATCH_MSG,
      }),
    );
  });

  it('truncates very long error messages to 500 characters', async () => {
    const long = `business_ref_id BIZ-X does not match business BIZ-Y${' .'.repeat(800)}`;
    await logUpgradeRejection(client, {
      errorMessage: long,
      attemptedBusinessId: null,
      attemptedBusinessRefId: null,
      requestedTier: 'basic',
      billingCycle: 'monthly',
      userAgent: null,
    });
    const args = rpc.mock.calls[0][1] as { _error_message: string };
    expect(args._error_message.length).toBe(500);
    expect(args._error_message.startsWith('business_ref_id BIZ-X')).toBe(true);
  });

  it('does not call RPC for unrelated errors', async () => {
    const res = await logUpgradeRejection(client, {
      errorMessage: UNRELATED_MSG,
      attemptedBusinessId: 'b',
      attemptedBusinessRefId: 'BIZ-1',
      requestedTier: 'basic',
      billingCycle: 'monthly',
      userAgent: null,
    });
    expect(res).toEqual({ reason: null, logged: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns logged=false when the RPC call itself errors', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const res = await logUpgradeRejection(client, {
      errorMessage: REF_ID_MISMATCH_MSG,
      attemptedBusinessId: 'a',
      attemptedBusinessRefId: 'BIZ-1',
      requestedTier: 'premium',
      billingCycle: 'yearly',
      userAgent: null,
    });
    expect(res.reason).toBe('ref_id_mismatch');
    expect(res.logged).toBe(false);
    expect(res.error).toEqual({ message: 'boom' });
  });

  it('never throws if the client rejects; surfaces error in result', async () => {
    rpc.mockRejectedValueOnce(new Error('network down'));
    const res = await logUpgradeRejection(client, {
      errorMessage: BUSINESS_USER_MISMATCH_MSG,
      attemptedBusinessId: 'a',
      attemptedBusinessRefId: 'BIZ-1',
      requestedTier: 'premium',
      billingCycle: 'yearly',
      userAgent: null,
    });
    expect(res.reason).toBe('business_user_mismatch');
    expect(res.logged).toBe(false);
    expect((res.error as Error).message).toBe('network down');
  });
});