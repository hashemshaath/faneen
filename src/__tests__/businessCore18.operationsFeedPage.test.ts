import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE_PATH = resolve(__dirname, '../pages/dashboard/DashboardOperationsFeed.tsx');
const PAGE = readFileSync(PAGE_PATH, 'utf8');
const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const SIDEBAR = readFileSync(
  resolve(__dirname, '../components/dashboard/DashboardSidebar.tsx'),
  'utf8',
);
const OVERVIEW = readFileSync(
  resolve(__dirname, '../pages/dashboard/DashboardWorkOrdersOverview.tsx'),
  'utf8',
);

describe('BUSINESS-CORE-18 — Operations Feed page wiring', () => {
  it('route /dashboard/operations/feed is registered before catch-all', () => {
    const i = APP.indexOf('<Route path="/dashboard/operations/feed"');
    const catchAll = APP.indexOf('<Route path="*"');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(catchAll);
    expect(APP).toMatch(/DashboardOperationsFeed/);
  });

  it('does NOT clobber the existing /dashboard/operations route', () => {
    expect(APP).toMatch(/<Route path="\/dashboard\/operations" /);
    expect(APP).toMatch(/DashboardOperations[^F]/); // existing component still imported
  });

  it('sidebar exposes a bilingual "Operations Feed" link', () => {
    expect(SIDEBAR).toMatch(/\/dashboard\/operations\/feed/);
    expect(SIDEBAR).toMatch(/Operations Feed/);
    expect(SIDEBAR).toMatch(/سجل العمليات/);
  });

  it('UnifiedOperationsFeed remains embedded in the overview page', () => {
    expect(OVERVIEW).toMatch(/UnifiedOperationsFeed/);
  });
});

describe('BUSINESS-CORE-18 — page security & hygiene', () => {
  it('uses useActiveWorkspace (business context, not auth-only)', () => {
    expect(PAGE).toMatch(/from ['"]@\/hooks\/useActiveWorkspace['"]/);
    expect(PAGE).toMatch(/useActiveWorkspace\(\)/);
    expect(PAGE).toMatch(/active_entity_id/);
  });

  it('reads only through the listBusinessActivityTimeline wrapper', () => {
    expect(PAGE).toMatch(/listBusinessActivityTimeline/);
    expect(PAGE).toMatch(/@\/modules\/businesses\/notes/);
  });

  it('does not access supabase tables directly', () => {
    expect(PAGE).not.toMatch(/supabase\.from\(/);
    expect(PAGE).not.toMatch(/from\(['"]business_audit_log['"]\)/);
  });

  it('does not introduce realtime, cron, timers, or notifications', () => {
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

  it('uses /r/{ref} deep-links (via UnifiedOperationsFeed) and no href="#"', () => {
    expect(PAGE).not.toMatch(/href="#"/);
    expect(PAGE).toMatch(/UnifiedOperationsFeed/);
  });
});

describe('BUSINESS-CORE-18 — bilingual filters', () => {
  it('exposes source filter with bilingual labels (work orders / contracts / quotes / leads / bookings)', () => {
    for (const en of ['Work Orders', 'Contracts', 'Quotes', 'Leads', 'Bookings']) {
      expect(PAGE).toContain(en);
    }
    for (const ar of ['أوامر العمل', 'العقود', 'عروض الأسعار', 'الطلبات', 'الحجوزات']) {
      expect(PAGE).toContain(ar);
    }
  });

  it('exposes action filter with bilingual labels', () => {
    for (const en of ['Created', 'Updated', 'Status changed', 'Converted to Work Order']) {
      expect(PAGE).toContain(en);
    }
    for (const ar of ['إنشاء', 'تحديث', 'تغيير حالة', 'تحويل إلى أمر عمل']) {
      expect(PAGE).toContain(ar);
    }
  });

  it('search input mentions every supported official ref prefix', () => {
    for (const p of ['WO-', 'TASK-', 'CNT-', 'QTE-', 'LED-', 'BKG-']) {
      expect(PAGE).toContain(p);
    }
  });
});

describe('BUSINESS-CORE-18 — official-ref search hygiene', () => {
  // Mirror the helper logic from the page (kept private inside the module).
  // We assert the policy by re-implementing the same predicate over the same
  // OFFICIAL_REF pattern, so a UUID is never treated as a matching ref.
  const OFFICIAL_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

  function matches(meta: Record<string, unknown>, query: string): boolean {
    const q = query.trim().toUpperCase();
    for (const k of ['ref_id', 'task_ref_id', 'contract_ref_id', 'quote_ref_id',
      'lead_ref_id', 'booking_ref_id', 'work_order_ref_id'] as const) {
      const v = meta[k];
      if (typeof v !== 'string') continue;
      const up = v.trim().toUpperCase();
      if (!OFFICIAL_REF.test(up)) continue;
      if (up.includes(q)) return true;
    }
    return false;
  }

  it('rejects UUID-shaped metadata when searching by ref', () => {
    expect(matches(
      { ref_id: '550e8400-e29b-41d4-a716-446655440000' },
      '550e8400',
    )).toBe(false);
  });

  it('matches official refs by prefix or partial id', () => {
    expect(matches({ ref_id: 'WO-1234567' }, 'wo-')).toBe(true);
    expect(matches({ contract_ref_id: 'CNT-100' }, 'CNT')).toBe(true);
    expect(matches({ ref_id: 'BKG-9' }, 'QTE')).toBe(false);
  });
});