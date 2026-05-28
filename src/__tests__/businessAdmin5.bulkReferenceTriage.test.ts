import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseAdminBulkRefs,
  ADMIN_BULK_REF_MAX,
  isOfficialAdminRef,
} from '@/modules/admin';

const PAGE = readFileSync(
  resolve(__dirname, '../pages/admin/AdminBulkReferenceTriage.tsx'),
  'utf8',
);
const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const TRIAGE_SVC = readFileSync(
  resolve(
    __dirname,
    '../modules/admin/services/operations/getAdminBulkReferenceTriage.ts',
  ),
  'utf8',
);
const PARSER_SVC = readFileSync(
  resolve(
    __dirname,
    '../modules/admin/services/operations/parseAdminBulkRefs.ts',
  ),
  'utf8',
);
const ADMIN_INDEX = readFileSync(
  resolve(__dirname, '../modules/admin/index.ts'),
  'utf8',
);

describe('BUSINESS-ADMIN-5 — route wiring', () => {
  it('registers /admin/ref/triage under requireAdmin before /admin/ref/:refId and catch-all', () => {
    const triage = APP.indexOf('<Route path="/admin/ref/triage"');
    const detail = APP.indexOf('<Route path="/admin/ref/:refId"');
    const catchAll = APP.indexOf('<Route path="*"');
    expect(triage).toBeGreaterThan(0);
    expect(detail).toBeGreaterThan(0);
    expect(catchAll).toBeGreaterThan(0);
    expect(triage).toBeLessThan(detail);
    expect(triage).toBeLessThan(catchAll);
    expect(APP).toMatch(
      /<Route path="\/admin\/ref\/triage" element=\{<ProtectedRoute requireAdmin>/,
    );
    expect(APP).toMatch(/AdminBulkReferenceTriage/);
  });
});

describe('BUSINESS-ADMIN-5 — page security & hygiene', () => {
  it('uses useNoIndex', () => {
    expect(PAGE).toMatch(/from ['"]@\/hooks\/useNoIndex['"]/);
    expect(PAGE).toMatch(/useNoIndex\(\)/);
  });

  it('imports services only from @/modules/admin barrel', () => {
    expect(PAGE).toMatch(/from ['"]@\/modules\/admin['"]/);
    expect(PAGE).toMatch(/getAdminBulkReferenceTriage/);
    expect(PAGE).toMatch(/createAdminOperationalNote/);
  });

  it('does not call supabase.from directly', () => {
    expect(PAGE).not.toMatch(/supabase\.from\(/);
    expect(PAGE).not.toMatch(/supabase\.rpc\(/);
  });

  it('does not import realtime/cron/notifications/timers', () => {
    expect(PAGE).not.toMatch(/supabase\.channel\(/);
    expect(PAGE).not.toMatch(/postgres_changes/);
    expect(PAGE).not.toMatch(/setInterval\(/);
    expect(PAGE).not.toMatch(/setTimeout\(/);
    expect(PAGE).not.toMatch(/@\/modules\/notifications/);
  });

  it('does not touch auth/payment/membership modules', () => {
    expect(PAGE).not.toMatch(/@\/modules\/auth/);
    expect(PAGE).not.toMatch(/@\/modules\/payments/);
    expect(PAGE).not.toMatch(/@\/modules\/memberships/);
  });

  it('exposes no destructive/force-update/reopen/delete controls', () => {
    for (const bad of [
      /onClick=\{[^}]*delete/i,
      /onClick=\{[^}]*reopen/i,
      /onClick=\{[^}]*force/i,
      /onClick=\{[^}]*approve/i,
      /resolveAdminOperationalNote/,
    ]) expect(PAGE).not.toMatch(bad);
  });

  it('never renders provider_intent_id, tokens, or synthetic phone emails', () => {
    expect(PAGE).not.toMatch(/provider_intent_id/);
    expect(PAGE).not.toMatch(/access_token/);
    expect(PAGE).not.toMatch(/client_secret/);
    expect(PAGE).not.toMatch(/@phone\./);
  });

  it('uses /admin/ref/{ref} deep-links for inspection', () => {
    expect(PAGE).toMatch(/\/admin\/ref\/\$\{row\.ref_id\}/);
  });

  it('reuses createAdminOperationalNote wrapper (no direct insert)', () => {
    expect(PAGE).toMatch(/createAdminOperationalNote\(/);
    expect(PAGE).not.toMatch(/\.insert\(/);
  });

  it('shows bilingual title', () => {
    expect(PAGE).toContain('Bulk Reference Triage');
    expect(PAGE).toContain('فحص المراجع المتعدد');
  });
});

describe('BUSINESS-ADMIN-5 — parser', () => {
  it('normalizes uppercase + trims', () => {
    const r = parseAdminBulkRefs(' wo-1 ,  cnt-9 \n bkg-3 ');
    expect(r.valid).toEqual(['WO-1', 'CNT-9', 'BKG-3']);
    expect(r.invalid).toEqual([]);
  });

  it('dedupes preserving first-seen order', () => {
    const r = parseAdminBulkRefs('WO-1\nwo-1\nCNT-2\nwo-1');
    expect(r.valid).toEqual(['WO-1', 'CNT-2']);
    expect(r.duplicates).toBe(2);
  });

  it('rejects UUIDs', () => {
    const r = parseAdminBulkRefs(
      'WO-1\n550e8400-e29b-41d4-a716-446655440000\nCNT-2',
    );
    expect(r.valid).toEqual(['WO-1', 'CNT-2']);
    expect(r.invalid).toContain('550E8400-E29B-41D4-A716-446655440000');
    expect(isOfficialAdminRef('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('rejects malformed refs', () => {
    const r = parseAdminBulkRefs('garbage\nWO-1\n123\nlol-?');
    expect(r.valid).toEqual(['WO-1']);
    expect(r.invalid.length).toBeGreaterThan(0);
  });

  it('enforces a max of ' + ADMIN_BULK_REF_MAX, () => {
    const lines: string[] = [];
    for (let i = 1; i <= ADMIN_BULK_REF_MAX + 25; i += 1) lines.push(`WO-${i}`);
    const r = parseAdminBulkRefs(lines.join('\n'));
    expect(r.valid.length).toBe(ADMIN_BULK_REF_MAX);
    expect(r.truncated).toBe(25);
    expect(r.hitMax).toBe(true);
  });

  it('supports comma/space/semicolon separators', () => {
    const r = parseAdminBulkRefs('WO-1, CNT-2; BKG-3 LED-4\tQTE-5');
    expect(r.valid).toEqual(['WO-1', 'CNT-2', 'BKG-3', 'LED-4', 'QTE-5']);
  });

  it('empty input is benign', () => {
    const r = parseAdminBulkRefs('   \n  ');
    expect(r.valid).toEqual([]);
    expect(r.invalid).toEqual([]);
  });
});

describe('BUSINESS-ADMIN-5 — service composition', () => {
  it('only composes admin-safe wrappers (no direct supabase access)', () => {
    expect(TRIAGE_SVC).toMatch(/getAdminReferenceSummary/);
    expect(TRIAGE_SVC).toMatch(/listAdminOperationalNotes/);
    expect(TRIAGE_SVC).not.toMatch(/supabase\.from\(/);
    expect(TRIAGE_SVC).not.toMatch(/supabase\.rpc\(/);
    expect(TRIAGE_SVC).not.toMatch(/\.insert\(/);
    expect(TRIAGE_SVC).not.toMatch(/\.delete\(/);
    expect(TRIAGE_SVC).not.toMatch(/\.update\(/);
  });

  it('parser has no I/O', () => {
    expect(PARSER_SVC).not.toMatch(/supabase/);
    expect(PARSER_SVC).not.toMatch(/fetch\(/);
  });

  it('exports through @/modules/admin barrel', () => {
    expect(ADMIN_INDEX).toMatch(/getAdminBulkReferenceTriage/);
    expect(ADMIN_INDEX).toMatch(/parseAdminBulkRefs/);
    expect(ADMIN_INDEX).toMatch(/ADMIN_BULK_REF_MAX/);
  });
});

describe('BUSINESS-ADMIN-5 — aggregator end-to-end (no DB)', () => {
  it('returns rows for valid refs, surfaces invalid + dedupe counts', async () => {
    const { getAdminBulkReferenceTriage } = await import(
      '../modules/admin/services/operations/getAdminBulkReferenceTriage'
    );
    const res = await getAdminBulkReferenceTriage({
      rawInput:
        'WO-1000001\nwo-1000001\nCNT-100\n550e8400-e29b-41d4-a716-446655440000\nnot-a-ref',
    });
    expect(res.error).toBeNull();
    expect(res.data).not.toBeNull();
    const data = res.data!;
    expect(data.duplicates).toBe(1);
    expect(data.invalid.length).toBeGreaterThanOrEqual(2);
    expect(data.rows.length).toBe(2);
    const refs = data.rows.map((r) => r.ref_id).sort();
    expect(refs).toEqual(['CNT-100', 'WO-1000001']);
    for (const row of data.rows) {
      expect(['found', 'not_found', 'unsupported', 'error']).toContain(row.status);
      expect(typeof row.openNotes).toBe('number');
    }
  });
});