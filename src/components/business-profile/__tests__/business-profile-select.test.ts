import { describe, it, expect } from 'vitest';
import {
  BUSINESS_PROFILE_SELECT,
  BUSINESS_PROFILE_JOIN_WHITELIST,
} from '../business-profile.data';

/**
 * Regression guard for the public business profile select string.
 *
 * Background: a previous regression embedded `cities(id, name_ar, name_en, slug)`
 * even though `public.cities` has no `slug` column. PostgREST returned a 400
 * (`column cities_1.slug does not exist`) and every `/:username` profile —
 * across every city, with or without `city_id` — failed to load. These tests
 * make sure the joined-relation column lists stay aligned with the underlying
 * tables so a single typo can't take every profile page offline again.
 */

function extractJoin(select: string, relation: string): string[] | null {
  const re = new RegExp(`${relation}\\(([^)]+)\\)`);
  const m = select.match(re);
  if (!m) return null;
  return m[1].split(',').map((c) => c.trim()).filter(Boolean);
}

describe('BUSINESS_PROFILE_SELECT', () => {
  it('only embeds whitelisted columns for cities', () => {
    const cols = extractJoin(BUSINESS_PROFILE_SELECT, 'cities');
    expect(cols).not.toBeNull();
    const allowed = new Set<string>(BUSINESS_PROFILE_JOIN_WHITELIST.cities);
    for (const c of cols!) {
      expect(allowed.has(c), `cities embed has unknown column "${c}"`).toBe(true);
    }
  });

  it('only embeds whitelisted columns for countries', () => {
    const cols = extractJoin(BUSINESS_PROFILE_SELECT, 'countries');
    expect(cols).not.toBeNull();
    const allowed = new Set<string>(BUSINESS_PROFILE_JOIN_WHITELIST.countries);
    for (const c of cols!) {
      expect(allowed.has(c), `countries embed has unknown column "${c}"`).toBe(true);
    }
  });

  it('never references columns known to be missing on cities', () => {
    // Explicit deny list — these have caused production 400s before.
    const denied = ['slug', 'code', 'country_code'];
    const cols = extractJoin(BUSINESS_PROFILE_SELECT, 'cities') ?? [];
    for (const bad of denied) {
      expect(cols.includes(bad), `cities must not select "${bad}"`).toBe(false);
    }
  });

  it('keeps city_id parent FK so embedded join resolves', () => {
    expect(BUSINESS_PROFILE_SELECT).toMatch(/(^|\W)city_id(\W|$)/);
  });
});
