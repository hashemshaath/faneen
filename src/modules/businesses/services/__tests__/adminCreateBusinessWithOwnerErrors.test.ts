import { describe, it, expect } from 'vitest';
import {
  mapAdminCreateBizError,
  isKnownAdminCreateBizErrorCode,
  type AdminCreateBizErrorCode,
} from '../adminCreateBusinessWithOwnerErrors';

const CODES: AdminCreateBizErrorCode[] = [
  'invalid_owner_email',
  'password_too_short',
  'username_taken',
  'owner_email_taken',
  'owner_cannot_be_super_admin',
  'forbidden_admin_only',
  'missing_auth',
  'unauthorized',
  'invalid_body',
  'invalid_username',
  'name_ar_required',
  'owner_not_found',
  'owner_id_or_ref_required',
  'invalid_owner_mode',
  'owner_resolution_failed',
  'business_insert_failed',
  'profile_sync_failed',
  'auth_user_create_failed',
  'auth_create_failed',
  'unknown',
];

describe('mapAdminCreateBizError', () => {
  it('returns a non-empty AR + EN message for every known code', () => {
    for (const code of CODES) {
      const ar = mapAdminCreateBizError(code, 'ar');
      const en = mapAdminCreateBizError(code, 'en');
      expect(ar.length, `AR for ${code}`).toBeGreaterThan(2);
      expect(en.length, `EN for ${code}`).toBeGreaterThan(2);
      expect(ar).not.toEqual(en); // localized, not identical
    }
  });

  it('falls back to the unknown bucket for unrecognized codes', () => {
    const ar = mapAdminCreateBizError('xyz_not_a_real_code', 'ar');
    const en = mapAdminCreateBizError('xyz_not_a_real_code', 'en');
    expect(ar).toBe(mapAdminCreateBizError('unknown', 'ar'));
    expect(en).toBe(mapAdminCreateBizError('unknown', 'en'));
  });

  it('handles null / undefined / empty string safely', () => {
    expect(mapAdminCreateBizError(null, 'ar')).toBe(mapAdminCreateBizError('unknown', 'ar'));
    expect(mapAdminCreateBizError(undefined, 'en')).toBe(mapAdminCreateBizError('unknown', 'en'));
    expect(mapAdminCreateBizError('', 'ar')).toBe(mapAdminCreateBizError('unknown', 'ar'));
  });

  it('never echoes the raw error string back', () => {
    const raw = 'DETAIL: password=secret123 token=abc';
    const out = mapAdminCreateBizError(raw, 'en');
    expect(out).not.toContain('secret123');
    expect(out).not.toContain('token=');
    expect(out).not.toContain(raw);
  });

  it('isKnownAdminCreateBizErrorCode acts as a type guard', () => {
    expect(isKnownAdminCreateBizErrorCode('username_taken')).toBe(true);
    expect(isKnownAdminCreateBizErrorCode('nope')).toBe(false);
    expect(isKnownAdminCreateBizErrorCode(null)).toBe(false);
    expect(isKnownAdminCreateBizErrorCode(undefined)).toBe(false);
  });
});

describe('best-effort audit behavior (documentation contract)', () => {
  // The edge function writes `admin_activity_log` AFTER the business row is
  // committed. If that audit insert fails we DO NOT roll back the business —
  // losing one audit row is preferable to losing a real entity that admins
  // already see in the UI. This test pins that decision in the mapper docs.
  it('mapper source documents the best-effort audit decision', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(
      resolve('src/modules/businesses/services/adminCreateBusinessWithOwnerErrors.ts'),
      'utf8',
    );
    expect(src.toLowerCase()).toContain('best-effort');
    expect(src).toMatch(/admin_activity_log/);
    expect(src.toLowerCase()).toContain('do not roll back');
  });
});
