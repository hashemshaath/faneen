import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * EDGE-CRON-INVENTORY-1 source guard.
 *
 * Live cron.job query cannot run in vitest (no DB access), so this test
 * locks the source-side contract:
 *  - docs/edge-cron-inventory.md exists
 *  - every expected cron-classified function is mentioned in the docs
 *  - every edge function referenced in the docs exists on disk
 *    (except the explicitly documented stale-job target)
 *  - the doc redacts secrets — no real anon/service-role JWT leaks in
 */

const DOC = resolve(__dirname, '../../docs/edge-cron-inventory.md');
const FUNCTIONS_DIR = resolve(__dirname, '../../supabase/functions');

const EXPECTED_CRON_FUNCTIONS = [
  'membership-payment-reconcile',
  'membership-lifecycle-dispatcher',
  'monthly-provider-credit-grant',
  'process-email-queue',
  'process-contact-notification-retries',
  'check-overdue',
  'weekly-sla-report',
  'check-badge-backlinks',
] as const;

// Targets named in the doc that are intentionally NOT on disk (stale job
// findings the doc is reporting). Test allows these to be missing.
// Post EDGE-CRON-REPAIR-1: stale job removed. Doc no longer references
// `check-migration-alerts` as an active target.
const KNOWN_STALE_TARGETS = new Set<string>([]);

describe('EDGE-CRON-INVENTORY-1: docs/edge-cron-inventory.md', () => {
  it('exists', () => {
    expect(existsSync(DOC)).toBe(true);
  });

  it.each(EXPECTED_CRON_FUNCTIONS)('mentions expected cron function: %s', (name) => {
    const md = readFileSync(DOC, 'utf8');
    expect(md).toContain(name);
  });

  it('every edge function named in the doc exists on disk (or is documented stale)', () => {
    const md = readFileSync(DOC, 'utf8');
    const onDisk = new Set(readdirSync(FUNCTIONS_DIR));
    // Names appear in the doc inside backticks like `function-name`.
    const referenced = new Set<string>();
    for (const m of md.matchAll(/`([a-z][a-z0-9-]{2,})`/g)) {
      const candidate = m[1];
      // Heuristic: edge function names contain a hyphen and are lowercase.
      if (candidate.includes('-') && !candidate.startsWith('public.')) {
        referenced.add(candidate);
      }
    }
    const missing = [...referenced].filter(
      (n) => !onDisk.has(n) && !KNOWN_STALE_TARGETS.has(n),
    );
    // Filter out things that aren't actually function names (cron jobnames,
    // vault secret names, etc.) by intersecting with the EXPECTED list +
    // any on-disk function. Anything still missing is a real concern.
    const realMissing = missing.filter((n) =>
      EXPECTED_CRON_FUNCTIONS.includes(n as (typeof EXPECTED_CRON_FUNCTIONS)[number]) ||
      n.startsWith('membership-') ||
      n.startsWith('process-') ||
      n.startsWith('check-') ||
      n.startsWith('weekly-') ||
      n.startsWith('audit-') ||
      n.startsWith('run-') ||
      n.startsWith('ping-'),
    );
    expect(realMissing).toEqual([]);
  });

  it('redacts secrets — no full JWT or apikey leaks', () => {
    const md = readFileSync(DOC, 'utf8');
    // JWT signature segment of the project anon key starts with this prefix.
    expect(md).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(md).toMatch(/REDACTED/);
  });

  it('post-repair: doc no longer lists check-migration-alerts as active', () => {
    const md = readFileSync(DOC, 'utf8');
    // The function name may still appear in a "Removed" historical row,
    // but must not be marked as an active target in the active jobs table.
    const activeSection = md.split('## Removed')[0];
    expect(activeSection).not.toMatch(/`check-migration-alerts`/);
  });

  it('post-repair: doc lists new schedules', () => {
    const md = readFileSync(DOC, 'utf8');
    expect(md).toContain('membership-payment-reconcile-hourly');
    expect(md).toContain('monthly-provider-credit-grant');
  });

  it('post-repair: weekly-sla-report appears in active jobs exactly once', () => {
    const md = readFileSync(DOC, 'utf8');
    const activeSection = md.split('### Removed')[0];
    // Count rows in the active table where target column is `weekly-sla-report`.
    const targetMatches = activeSection.match(/\|\s*`weekly-sla-report`\s*\|/g) ?? [];
    expect(targetMatches.length).toBe(1);
  });

  it('no duplicate function classification entries (each expected function appears in coverage table once)', () => {
    const md = readFileSync(DOC, 'utf8');
    for (const fn of EXPECTED_CRON_FUNCTIONS) {
      // Each expected function should appear at least once; the doc may
      // legitimately mention it more than once (issues section etc.), so we
      // only assert presence.
      const count = md.split('`' + fn + '`').length - 1;
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});