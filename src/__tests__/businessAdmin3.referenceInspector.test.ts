import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isOfficialAdminRef,
  ADMIN_REF_OFFICIAL,
} from '@/modules/admin';

const PAGE = readFileSync(
  resolve(__dirname, '../pages/admin/AdminReferenceInspector.tsx'),
  'utf8',
);
const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const RESOLVER = readFileSync(
  resolve(
    __dirname,
    '../modules/admin/services/operations/getAdminReferenceSummary.ts',
  ),
  'utf8',
);
const ADMIN_INDEX = readFileSync(
  resolve(__dirname, '../modules/admin/index.ts'),
  'utf8',
);

describe('BUSINESS-ADMIN-3 — route wiring', () => {
  it('registers /admin/ref/:refId under requireAdmin before catch-all', () => {
    const i = APP.indexOf('<Route path="/admin/ref/:refId"');
    const catchAll = APP.indexOf('<Route path="*"');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(catchAll);
    expect(APP).toMatch(
      /<Route path="\/admin\/ref\/:refId" element=\{<ProtectedRoute requireAdmin>/,
    );
    expect(APP).toMatch(/AdminReferenceInspector/);
  });
});

describe('BUSINESS-ADMIN-3 — page security & hygiene', () => {
  it('uses useNoIndex', () => {
    expect(PAGE).toMatch(/from ['"]@\/hooks\/useNoIndex['"]/);
    expect(PAGE).toMatch(/useNoIndex\(\)/);
  });

  it('imports resolver + helpers from @/modules/admin only', () => {
    expect(PAGE).toMatch(/getAdminReferenceSummary/);
    expect(PAGE).toMatch(/isOfficialAdminRef/);
    expect(PAGE).toMatch(/from ['"]@\/modules\/admin['"]/);
  });

  it('does not call supabase.from directly', () => {
    expect(PAGE).not.toMatch(/supabase\.from\(/);
    expect(PAGE).not.toMatch(/from\(['"]work_orders['"]\)/);
    expect(PAGE).not.toMatch(/from\(['"]business_audit_log['"]\)/);
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
    ]) expect(PAGE).not.toMatch(bad);
  });

  it('never renders provider_intent_id, tokens, or synthetic phone emails', () => {
    expect(PAGE).not.toMatch(/provider_intent_id/);
    expect(PAGE).not.toMatch(/access_token/);
    expect(PAGE).not.toMatch(/client_secret/);
    expect(PAGE).not.toMatch(/@phone\./);
  });

  it('reuses UnifiedOperationsFeed and AdminOperationalNotesPanel', () => {
    expect(PAGE).toMatch(/UnifiedOperationsFeed/);
    expect(PAGE).toMatch(/AdminOperationalNotesPanel/);
    expect(PAGE).toMatch(/scopedRefId=\{refId\}/);
  });

  it('uses /admin/ref/{ref} deep-links and validates official refs', () => {
    expect(PAGE).toMatch(/\/admin\/ref\/\$\{/);
    expect(PAGE).toMatch(/ADMIN_REF_OFFICIAL\.test\(/);
  });
});

describe('BUSINESS-ADMIN-3 — resolver safety', () => {
  it('exports through @/modules/admin barrel', () => {
    expect(ADMIN_INDEX).toMatch(/getAdminReferenceSummary/);
    expect(ADMIN_INDEX).toMatch(/isOfficialAdminRef/);
    expect(ADMIN_INDEX).toMatch(/ADMIN_REF_OFFICIAL/);
  });

  it('composes existing admin-safe wrappers + lookup RPC only', () => {
    expect(RESOLVER).toMatch(/lookupByReference/);
    expect(RESOLVER).toMatch(/listAdminWorkOrders/);
    expect(RESOLVER).toMatch(/listAdminOperationalActivity/);
    expect(RESOLVER).not.toMatch(/supabase\.from\(/);
    expect(RESOLVER).not.toMatch(/supabase\.rpc\(/);
  });

  it('rejects UUIDs and non-official refs', () => {
    expect(isOfficialAdminRef('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    expect(isOfficialAdminRef('not a ref')).toBe(false);
    expect(isOfficialAdminRef('')).toBe(false);
  });

  it('accepts all supported official prefixes', () => {
    for (const r of [
      'WO-1000001', 'TASK-1', 'CNT-100', 'QTE-9',
      'LED-2', 'BKG-3', 'ENT-1000001',
      'PAY-1', 'PVS-1', 'STF-1',
    ]) {
      expect(isOfficialAdminRef(r)).toBe(true);
      expect(ADMIN_REF_OFFICIAL.test(r)).toBe(true);
    }
  });

  it('normalizes input to uppercase before matching', () => {
    expect(isOfficialAdminRef('wo-1000001')).toBe(true);
    expect(isOfficialAdminRef('  cnt-9  ')).toBe(true);
  });

  it('returns a not-found bundle (no throw) for invalid refs', async () => {
    const { getAdminReferenceSummary } = await import(
      '../modules/admin/services/operations/getAdminReferenceSummary'
    );
    const res = await getAdminReferenceSummary({
      refId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(res.error).toBeNull();
    expect(res.data?.found).toBe(false);
    expect(res.data?.summary).toBeNull();
    expect(res.data?.related_refs).toEqual([]);
    expect(res.data?.events).toEqual([]);
  });
});

describe('BUSINESS-ADMIN-3 — UI labels & states', () => {
  it('shows bilingual title + read-only notice', () => {
    expect(PAGE).toContain('Admin Reference Inspector');
    expect(PAGE).toContain('مستكشف المراجع');
    expect(PAGE).toMatch(/Read-only/);
    expect(PAGE).toMatch(/قراءة فقط/);
  });

  it('renders invalid-ref, not-found, error and loading states', () => {
    expect(PAGE).toMatch(/invalidTitle/);
    expect(PAGE).toMatch(/notFoundTitle/);
    expect(PAGE).toMatch(/loadErr/);
    expect(PAGE).toMatch(/Loader2/);
  });

  it('labels all 10 supported prefixes', () => {
    for (const p of ['WO', 'TASK', 'CNT', 'QTE', 'LED', 'BKG', 'ENT', 'PAY', 'PVS', 'STF']) {
      expect(PAGE).toContain(`${p}:`);
    }
  });
});