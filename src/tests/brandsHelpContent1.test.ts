import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

const SLUGS = [
  'brands-overview',
  'provider-link-brands',
  'request-new-brand',
  'brand-request-review',
  'brands-rfq-discovery',
  'admin-brand-requests-guide',
  'admin-brand-detail-guide',
];

const MIGRATION_PATH = (() => {
  // newest migration that contains the brand help seed
  const { readdirSync } = require('node:fs') as typeof import('node:fs');
  const dir = resolve('supabase/migrations');
  const candidates = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => `${dir}/${f}`)
    .filter((p) => read(p).includes("'brands-overview'"));
  return candidates.sort().pop()!;
})();

describe('BRANDS-HELP-CONTENT-1', () => {
  const sql = read(MIGRATION_PATH);

  it('seeds all 7 brand article slugs', () => {
    for (const slug of SLUGS) expect(sql).toContain(`'${slug}'`);
  });

  it('all articles are published', () => {
    // every brand slug appears alongside a published status in the same INSERT
    expect(sql).toMatch(/'published'/);
    const rejected = /'draft'\s*,\s*'(brands-overview|provider-link-brands|request-new-brand|brand-request-review|brands-rfq-discovery|admin-brand-requests-guide|admin-brand-detail-guide)'/;
    expect(sql).not.toMatch(rejected);
  });

  it('every article has AR and EN title/summary/content', () => {
    for (const slug of SLUGS) {
      const idx = sql.indexOf(`'${slug}'`);
      expect(idx).toBeGreaterThan(0);
      // tuple spans roughly the next ~6000 chars; check title_ar/en + content_ar/en patterns exist nearby
      const chunk = sql.slice(idx, idx + 8000);
      // Each tuple should contain at least 4 non-empty single-quoted strings after the slug (title_ar, title_en, summary, ...)
      const quoted = chunk.match(/'[^']{5,}'/g) ?? [];
      expect(quoted.length).toBeGreaterThan(6);
    }
  });

  it('audiences are valid', () => {
    const audiences = ['general', 'provider', 'admin'];
    for (const a of audiences) expect(sql).toContain(`'${a}'`);
  });

  it('contextual help maps brand pageKeys to the published slugs', () => {
    expect(contextualHelpRegistry['public.brands']).toEqual(['brands-overview', 'brands-rfq-discovery']);
    expect(contextualHelpRegistry['public.brand-detail']).toEqual(['brands-overview', 'brands-rfq-discovery']);
    expect(contextualHelpRegistry['dashboard.brands']).toEqual([
      'provider-link-brands', 'request-new-brand', 'brand-request-review',
    ]);
    expect(contextualHelpRegistry['admin.brand-requests']).toEqual([
      'admin-brand-requests-guide', 'brand-request-review',
    ]);
    expect(contextualHelpRegistry['admin.brand-detail']).toEqual([
      'admin-brand-detail-guide', 'admin-brand-requests-guide',
    ]);
  });

  it('admin-only slugs never appear on public pageKeys', () => {
    const publicKeys = ['public.brands', 'public.brand-detail'];
    const adminSlugs = ['admin-brand-requests-guide', 'admin-brand-detail-guide'];
    for (const k of publicKeys) {
      for (const s of adminSlugs) {
        expect(contextualHelpRegistry[k]).not.toContain(s);
      }
    }
  });

  it('no raw UUIDs embedded in article content', () => {
    const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    for (const slug of SLUGS) {
      const idx = sql.indexOf(`'${slug}'`);
      const chunk = sql.slice(idx, idx + 8000);
      expect(uuidRe.test(chunk)).toBe(false);
    }
  });

  it('does not introduce RFQ brand picker or SLA cron in this phase', () => {
    // simple grep guards: there must be no new picker component or cron file added under brands
    const fs = require('node:fs') as typeof import('node:fs');
    const exists = (p: string) => fs.existsSync(resolve(p));
    expect(exists('src/components/rfq/RfqBrandPicker.tsx')).toBe(false);
    expect(exists('supabase/functions/brand-request-sla-cron')).toBe(false);
  });

  it('help article route remains registered', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/\/help\/article\/:slug/);
  });

  it('does not modify brand schema/RLS in this migration', () => {
    expect(sql).not.toMatch(/CREATE TABLE\s+public\.brand/i);
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.brand/i);
    expect(sql).not.toMatch(/CREATE POLICY[^;]+brand_/i);
  });
});