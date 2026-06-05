/**
 * MARKETPLACE-CONVERSION-OPTIMIZATION-1 — guardrails for the conversion dashboard.
 * File-system + source-text checks. No rendering, no network.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';

const read = (p: string) => readFileSync(resolve(p), 'utf8');
const PAGE = 'src/pages/admin/AdminConversionOptimization.tsx';
const SERVICE = 'src/modules/conversion/services/conversionQueries.ts';
const APP = 'src/App.tsx';

describe('MARKETPLACE-CONVERSION-OPTIMIZATION-1', () => {
  it('dashboard page and read-only service exist', () => {
    for (const p of [PAGE, SERVICE]) expect(existsSync(resolve(p))).toBe(true);
  });

  it('route /admin/conversion-optimization is registered under ProtectedRoute requireAdmin', () => {
    const src = read(APP);
    expect(src).toMatch(
      /path="\/admin\/conversion-optimization"[\s\S]+ProtectedRoute requireAdmin[\s\S]+AdminConversionOptimization/,
    );
  });

  it('page has no direct supabase imports — reads via service wrapper', () => {
    const src = read(PAGE);
    expect(src.includes('@/integrations/supabase/client')).toBe(false);
    expect(src.includes('supabase.from')).toBe(false);
    expect(src).toContain('@/modules/conversion/services/conversionQueries');
  });

  it('no new business modules / mutations / new pipeline tables', () => {
    const blob = read(PAGE) + read(SERVICE);
    expect(blob).not.toMatch(/CREATE\s+TABLE/i);
    expect(blob).not.toMatch(/ALTER\s+TABLE/i);
    expect(blob).not.toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(blob).not.toMatch(/CREATE\s+POLICY/i);
    expect(blob).not.toMatch(/\.insert\(/);
    expect(blob).not.toMatch(/\.update\(/);
    expect(blob).not.toMatch(/\.delete\(/);
    expect(blob).not.toMatch(/\.upsert\(/);
  });

  it('no procurement / contracts logic touched', () => {
    const src = read(PAGE).toLowerCase();
    expect(src).not.toContain('procurement');
    expect(src).not.toContain('contract');
    expect(src).not.toContain('work_order');
  });

  it('no bulk publish, no popup/dialog spam', () => {
    const src = read(PAGE).toLowerCase();
    expect(src).not.toContain('bulk publish');
    expect(src).not.toContain('<dialog');
    expect(src).not.toContain('alertdialog');
  });

  it('help mapping exists for admin.conversion-optimization', () => {
    const slugs = contextualHelpRegistry['admin.conversion-optimization'];
    expect(Array.isArray(slugs)).toBe(true);
    expect((slugs ?? []).length).toBeGreaterThan(0);
  });

  it('conversion funnel + audit docs exist', () => {
    const docs = [
      'docs/marketplace-conversion-audit.md',
      'docs/conversion-funnels.md',
      'docs/trust-signals-audit.md',
      'docs/rfq-conversion-audit.md',
      'docs/seo-conversion-audit.md',
    ];
    for (const d of docs) expect(existsSync(resolve(d))).toBe(true);
  });
});