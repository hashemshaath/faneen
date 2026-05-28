import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE = readFileSync(
  resolve(__dirname, '../pages/admin/AdminOperationsConsole.tsx'),
  'utf8',
);
const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const SIDEBAR = readFileSync(
  resolve(__dirname, '../components/dashboard/DashboardSidebar.tsx'),
  'utf8',
);
const ACT = readFileSync(
  resolve(__dirname, '../modules/admin/services/operations/listAdminOperationalActivity.ts'),
  'utf8',
);
const WO = readFileSync(
  resolve(__dirname, '../modules/workOrders/services/listAdminWorkOrders.ts'),
  'utf8',
);
const ADMIN_INDEX = readFileSync(
  resolve(__dirname, '../modules/admin/index.ts'),
  'utf8',
);

describe('BUSINESS-ADMIN-1 — route + sidebar wiring', () => {
  it('registers /admin/operations/console under requireAdmin before catch-all', () => {
    const i = APP.indexOf('<Route path="/admin/operations/console"');
    const catchAll = APP.indexOf('<Route path="*"');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(catchAll);
    expect(APP).toMatch(/AdminOperationsConsole/);
    expect(APP).toMatch(
      /<Route path="\/admin\/operations\/console" element=\{<ProtectedRoute requireAdmin>/,
    );
  });

  it('does NOT clobber the existing /admin/operations route', () => {
    expect(APP).toMatch(/<Route path="\/admin\/operations" /);
    expect(APP).toMatch(/AdminOperations[^C]/);
  });

  it('sidebar exposes a bilingual "Operations Console" link', () => {
    expect(SIDEBAR).toMatch(/\/admin\/operations\/console/);
    expect(SIDEBAR).toMatch(/Operations Console/);
    expect(SIDEBAR).toMatch(/مركز العمليات/);
  });
});

describe('BUSINESS-ADMIN-1 — page security & hygiene', () => {
  it('uses useNoIndex', () => {
    expect(PAGE).toMatch(/from ['"]@\/hooks\/useNoIndex['"]/);
    expect(PAGE).toMatch(/useNoIndex\(\)/);
  });

  it('reads only through admin wrappers from @/modules/admin', () => {
    expect(PAGE).toMatch(/listAdminOperationalActivity/);
    expect(PAGE).toMatch(/listAdminWorkOrders/);
    expect(PAGE).toMatch(/from ['"]@\/modules\/admin['"]/);
  });

  it('does not call supabase.from / from(table) directly', () => {
    expect(PAGE).not.toMatch(/supabase\.from\(/);
    expect(PAGE).not.toMatch(/from\(['"]business_audit_log['"]\)/);
    expect(PAGE).not.toMatch(/from\(['"]work_orders['"]\)/);
  });

  it('does not import realtime / cron / notifications / timers', () => {
    expect(PAGE).not.toMatch(/supabase\.channel\(/);
    expect(PAGE).not.toMatch(/postgres_changes/);
    expect(PAGE).not.toMatch(/setInterval\(/);
    expect(PAGE).not.toMatch(/setTimeout\(/);
    expect(PAGE).not.toMatch(/@\/modules\/notifications/);
  });

  it('does not touch auth / payment / membership modules', () => {
    expect(PAGE).not.toMatch(/@\/modules\/auth/);
    expect(PAGE).not.toMatch(/@\/modules\/payments/);
    expect(PAGE).not.toMatch(/@\/modules\/memberships/);
  });

  it('exposes no mutation/destructive controls', () => {
    for (const bad of [
      /onClick=\{[^}]*delete/i,
      /onClick=\{[^}]*reopen/i,
      /onClick=\{[^}]*force/i,
      /onClick=\{[^}]*update/i,
      /onClick=\{[^}]*approve/i,
    ]) expect(PAGE).not.toMatch(bad);
    // Only refresh + filter handlers are allowed.
    expect(PAGE).toMatch(/reload/);
  });

  it('never renders provider_intent_id, tokens, or synthetic phone emails', () => {
    expect(PAGE).not.toMatch(/provider_intent_id/);
    expect(PAGE).not.toMatch(/access_token/);
    expect(PAGE).not.toMatch(/client_secret/);
    expect(PAGE).not.toMatch(/@phone\./);
  });

  it('uses /r/{ref} deep-links and validates against official ref shape', () => {
    expect(PAGE).toMatch(/\/r\/\$\{/);
    expect(PAGE).toMatch(/OFFICIAL_REF\.test\(/);
    expect(PAGE).not.toMatch(/href="#"/);
  });

  it('uses UnifiedOperationsFeed for the feed section', () => {
    expect(PAGE).toMatch(/UnifiedOperationsFeed/);
  });
});

describe('BUSINESS-ADMIN-1 — admin wrappers safety', () => {
  it('listAdminOperationalActivity sanitizes metadata and rejects UUID search', () => {
    expect(ACT).toMatch(/sanitizeAuditMetadata/);
    expect(ACT).toMatch(/OFFICIAL_REF/);
    expect(ACT).toMatch(/from\(["']business_audit_log["']\)/);
  });

  it('listAdminWorkOrders rejects pure-UUID searches', () => {
    expect(WO).toMatch(/UUID_SHAPE/);
    expect(WO).toMatch(/from\(["']work_orders["']\)/);
    expect(WO).toMatch(/is\(["']deleted_at["'], null\)/);
  });

  it('admin module barrel re-exports both wrappers + summary', () => {
    expect(ADMIN_INDEX).toMatch(/listAdminOperationalActivity/);
    expect(ADMIN_INDEX).toMatch(/listAdminWorkOrders/);
    expect(ADMIN_INDEX).toMatch(/getAdminOperationsSummary/);
  });
});

describe('BUSINESS-ADMIN-1 — filter bilingual labels & ref prefixes', () => {
  it('source filter shows bilingual labels for every source type', () => {
    for (const en of ['Work Orders', 'Contracts', 'Quotes', 'Leads', 'Bookings']) {
      expect(PAGE).toContain(en);
    }
    for (const ar of ['أوامر العمل', 'العقود', 'عروض الأسعار', 'الطلبات', 'الحجوزات']) {
      expect(PAGE).toContain(ar);
    }
  });

  it('reference-search placeholder advertises every supported official prefix', () => {
    for (const p of ['ENT-', 'CNT-', 'QTE-', 'LED-', 'BKG-', 'WO-', 'TASK-']) {
      expect(PAGE).toContain(p);
    }
  });

  it('KPI strip exposes the five expected cards', () => {
    for (const en of [
      'Open Work Orders', 'Overdue', 'High Priority',
      'Converted to Work Orders', 'Recent activity',
    ]) expect(PAGE).toContain(en);
  });
});

describe('BUSINESS-ADMIN-1 — ref hygiene mirrors page predicate', () => {
  const OFFICIAL_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;
  const UUID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  it('rejects UUID-shaped strings as searchable refs', () => {
    const u = '550e8400-e29b-41d4-a716-446655440000';
    expect(UUID_SHAPE.test(u)).toBe(true);
    expect(OFFICIAL_REF.test(u.toUpperCase())).toBe(false);
  });

  it('accepts official refs of all supported prefixes', () => {
    for (const r of ['WO-1', 'CNT-100', 'QTE-9', 'LED-2', 'BKG-3', 'TASK-7', 'ENT-1000001']) {
      expect(OFFICIAL_REF.test(r)).toBe(true);
    }
  });
});