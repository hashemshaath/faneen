import { describe, it, expect } from 'vitest';
import {
  validateJoinedSelect,
  assertSafeJoinedSelect,
  LOCATION_JOINED_SCHEMA,
} from '../assertSafeJoinedSelect';

describe('validateJoinedSelect', () => {
  it('accepts a fully-whitelisted cities/countries embed', () => {
    const sel = 'id, username, cities(id, name_ar, name_en), countries(name_ar, name_en, code)';
    expect(validateJoinedSelect(sel, LOCATION_JOINED_SCHEMA)).toEqual([]);
  });

  it('flags cities.slug as denied (the original regression)', () => {
    const sel = 'cities(id, name_ar, name_en, slug)';
    const issues = validateJoinedSelect(sel, LOCATION_JOINED_SCHEMA);
    expect(issues).toEqual([{ relation: 'cities', column: 'slug', kind: 'denied' }]);
  });

  it('flags unknown columns even when not on the deny-list', () => {
    const sel = 'cities(id, made_up_field)';
    const issues = validateJoinedSelect(sel, LOCATION_JOINED_SCHEMA);
    expect(issues).toEqual([{ relation: 'cities', column: 'made_up_field', kind: 'unknown' }]);
  });

  it('ignores relations that are not governed by the schema', () => {
    const sel = 'id, profiles(full_name, avatar_url), cities(id)';
    expect(validateJoinedSelect(sel, LOCATION_JOINED_SCHEMA)).toEqual([]);
  });
});

describe('assertSafeJoinedSelect', () => {
  it('throws in dev/test mode when an embed has a denied column', () => {
    expect(() =>
      assertSafeJoinedSelect('cities(id, slug)', LOCATION_JOINED_SCHEMA, 'test'),
    ).toThrow(/cities\.slug/);
  });

  it('returns empty array when the select is safe', () => {
    expect(
      assertSafeJoinedSelect('cities(id, name_ar)', LOCATION_JOINED_SCHEMA, 'test'),
    ).toEqual([]);
  });
});
