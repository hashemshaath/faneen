import { describe, it, expect } from 'vitest';
import {
  mapTransferPrimaryManagerCode,
  getTransferPrimaryManagerMessageEntries,
} from '../transferPrimaryManagerMessages';

const ALL_CODES = [
  'primary_manager_transferred',
  'already_primary_manager',
  'forbidden',
  'business_not_found',
  'target_not_found',
  'target_inactive',
  'target_role_not_eligible',
  'unique_constraint_conflict',
  'unknown',
] as const;

describe('mapTransferPrimaryManagerCode', () => {
  it('maps every documented code in English and Arabic', () => {
    const entries = getTransferPrimaryManagerMessageEntries();
    for (const code of ALL_CODES) {
      expect(entries[code].en).toBeTruthy();
      expect(entries[code].ar).toBeTruthy();
      expect(mapTransferPrimaryManagerCode(code, 'en')).toBe(entries[code].en);
      expect(mapTransferPrimaryManagerCode(code, 'ar')).toBe(entries[code].ar);
    }
  });

  it('falls back to unknown for unrecognized codes', () => {
    expect(mapTransferPrimaryManagerCode('bogus', 'en')).toBe(
      getTransferPrimaryManagerMessageEntries().unknown.en,
    );
    expect(mapTransferPrimaryManagerCode(null, 'ar')).toBe(
      getTransferPrimaryManagerMessageEntries().unknown.ar,
    );
    expect(mapTransferPrimaryManagerCode(undefined)).toBe(
      getTransferPrimaryManagerMessageEntries().unknown.en,
    );
  });
});
