import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LIMIT_FIELDS,
  CONFIRMED_LIMIT_FIELDS,
  parseLimits,
  getPlanLimitDisplayValue,
} from '@/lib/membership-limits';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('PLAN-FEATURE-MATRIX-1 — limits source of truth', () => {
  it('every LIMIT_FIELDS entry declares a confirmed flag', () => {
    for (const f of LIMIT_FIELDS) {
      expect(typeof f.confirmed, `field "${f.key}" must declare confirmed`).toBe('boolean');
    }
  });

  it('CONFIRMED_LIMIT_FIELDS is a strict subset of LIMIT_FIELDS', () => {
    const all = new Set(LIMIT_FIELDS.map((f) => f.key));
    for (const f of CONFIRMED_LIMIT_FIELDS) {
      expect(all.has(f.key)).toBe(true);
      expect(f.confirmed).toBe(true);
    }
    expect(CONFIRMED_LIMIT_FIELDS.length).toBeGreaterThan(0);
    expect(CONFIRMED_LIMIT_FIELDS.length).toBeLessThan(LIMIT_FIELDS.length);
  });

  it('api_access is registered as a confirmed boolean (matches Enterprise seed)', () => {
    const f = LIMIT_FIELDS.find((x) => x.key === 'api_access');
    expect(f).toBeDefined();
    expect(f!.type).toBe('boolean');
    expect(f!.confirmed).toBe(true);
  });

  it('known deferred keys remain marked confirmed=false', () => {
    const deferred = [
      'max_featured_ads',
      'search_priority',
      'max_blog_posts',
      'max_contracts',
      'max_staff',
      'max_bookings_daily',
    ];
    for (const key of deferred) {
      const f = LIMIT_FIELDS.find((x) => x.key === key);
      expect(f, `field "${key}" must exist`).toBeDefined();
      expect(f!.confirmed, `field "${key}" must be deferred`).toBe(false);
    }
  });

  it('parseLimits preserves real numeric values and falls back to defaults', () => {
    const limits = parseLimits({ max_projects: 10, analytics_enabled: true });
    expect(limits.max_projects).toBe(10);
    expect(limits.analytics_enabled).toBe(true);
    // Unspecified keys still return defaults
    expect(limits.max_branches).toBe(1);
    expect(limits.api_access).toBe(false);
  });

  it('numeric max_* keys with value 0 render as unlimited (∞)', () => {
    const f = LIMIT_FIELDS.find((x) => x.key === 'max_services')!;
    expect(getPlanLimitDisplayValue(f, 0)).toEqual({ kind: 'num', text: '∞' });
    expect(getPlanLimitDisplayValue(f, 15)).toEqual({ kind: 'num', text: '15' });
  });

  it('PlanFeatureMatrix filters unconfirmed fields by default (source check)', () => {
    const src = read('src/components/membership/PlanFeatureMatrix.tsx');
    expect(src).toMatch(/includeUnconfirmed/);
    expect(src).toMatch(/f\.confirmed/);
  });

  it('PlanCard only surfaces confirmed keys in TOP_KEYS', () => {
    const src = read('src/components/membership/PlanCard.tsx');
    const m = src.match(/const TOP_KEYS = \[([\s\S]*?)\]/);
    expect(m, 'TOP_KEYS not found').toBeTruthy();
    const block = m![1];
    const confirmedKeys = new Set(CONFIRMED_LIMIT_FIELDS.map((f) => f.key));
    const used = Array.from(block.matchAll(/'([^']+)'/g)).map((x) => x[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const k of used) {
      expect(confirmedKeys.has(k), `PlanCard TOP_KEYS includes unconfirmed key "${k}"`).toBe(true);
    }
  });

  it('Membership page still uses MembershipPlanModuleMatrix (governance preserved)', () => {
    const src = read('src/pages/Membership.tsx');
    expect(src).toMatch(/MembershipPlanModuleMatrix/);
    expect(src).toMatch(/useMembershipVisibility|membershipPathOrNull/);
  });

  it('Membership page does not invent pricing copy', () => {
    const src = read('src/pages/Membership.tsx');
    // Pricing must come from plan rows, not hardcoded marketing numbers
    expect(src).not.toMatch(/SAR\s*\d+\s*\/?\s*mo/i);
    expect(src).not.toMatch(/ر\.س\s*\d+\s*شهر/);
  });
});