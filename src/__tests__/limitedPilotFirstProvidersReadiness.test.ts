/**
 * LIMITED PILOT — first 5 providers readiness guard.
 *
 * Static guard against the provider-slots doc. Ensures the pilot
 * provider list stays a real-provider-only slot table — no demo, no
 * public phone numbers, and no backend changes introduced.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DOC = path.resolve(__dirname, '../..', 'docs/limited-pilot-first-5-providers.md');
const read = () => fs.readFileSync(DOC, 'utf8');

describe('LIMITED PILOT — first 5 providers readiness', () => {
  it('providers doc exists and is non-empty', () => {
    expect(fs.existsSync(DOC)).toBe(true);
    expect(read().length).toBeGreaterThan(400);
  });

  it('contains exactly 5 provider slots/rows numbered 1..5', () => {
    const src = read();
    for (const n of [1, 2, 3, 4, 5]) {
      expect(new RegExp(`\\|\\s*${n}\\s*\\|`).test(src), `slot ${n}`).toBe(true);
    }
    // No 6th slot.
    expect(/\|\s*6\s*\|/.test(src)).toBe(false);
  });

  it('covers the five required sectors', () => {
    const src = read();
    for (const sector of [
      'ألمنيوم وزجاج',
      'حديد وستانلس',
      'خشب ومطابخ',
      'واجهات',
      'درابزين',
    ]) {
      expect(src.includes(sector), `missing sector ${sector}`).toBe(true);
    }
  });

  it('contains no public phone numbers', () => {
    const src = read();
    // KSA mobile patterns + generic international form.
    expect(/\b05\d{8}\b/.test(src)).toBe(false);
    expect(/\+966\s?5\d{8}\b/.test(src)).toBe(false);
    expect(/\b9665\d{8}\b/.test(src)).toBe(false);
  });

  it('states publishing remains gated by public visibility rules', () => {
    expect(read()).toMatch(/is_published\s+AND\s+approved/);
  });

  it('states demo / inactive providers do not enter pilot', () => {
    const src = read();
    expect(src).toMatch(/demo/i);
    expect(src).toMatch(/inactive/i);
    expect(src).toMatch(/do not[^A-Za-z]+enter the pilot/i);
  });

  it('introduces no DB / RLS / RPC / migration / edge changes', () => {
    const src = read();
    for (const forbidden of [
      'CREATE TABLE',
      'ALTER TABLE',
      'CREATE POLICY',
      'service_role',
      'supabase/migrations',
      'supabase/functions/_shared',
    ]) {
      expect(src.includes(forbidden), forbidden).toBe(false);
    }
  });
});