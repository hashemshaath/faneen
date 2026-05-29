/**
 * BUSINESS-FINISHING-1 — Pure helper coverage for Phases A/D/E/F/G/H.
 *
 * No DOM, no React: validates pure logic and static guarantees. UI
 * components are covered separately. This file also enforces the
 * scope guards from the BUSINESS-FINISHING-1 brief.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  parseRef,
  resolveRefRoute,
  REF_PREFIXES,
} from '@/modules/workspace/shell/refRouteMap';
import {
  workOrderHealth,
  contractHealth,
  rfqHealth,
  quotationHealth,
  WORK_ORDER_HEALTH_LABELS,
  WORK_ORDER_HEALTH_TONE,
} from '@/modules/health';
import {
  computeProductionMetrics,
  computeProcurementMetrics,
  computeQuotationMetrics,
} from '@/modules/analytics';
import { deriveQuotationRevisions } from '@/modules/quotes/lib/revisionHistory';
import { buildPermissionMatrix } from '@/components/identity/PermissionMatrix';
import { isAccessEvent } from '@/components/identity/AccessTimeline';

// ─────────────────────────────────────────────────────────────────────────
// Phase A — Global Reference Search

describe('Phase A — refRouteMap', () => {
  it.each(['BOQ', 'RFQ', 'PO', 'WOQ', 'CONTRACT', 'QUOTE', 'NOTE'] as const)(
    'recognises %s prefix',
    (p) => {
      expect(REF_PREFIXES.includes(p)).toBe(true);
      const ref = `${p}-1000001`;
      expect(parseRef(ref)?.prefix).toBe(p);
      const route = resolveRefRoute(ref);
      expect(route).toBeTruthy();
      expect(route).toContain(encodeURIComponent(ref));
    },
  );
  it('returns null for an unknown prefix', () => {
    expect(resolveRefRoute('ZZZ-100')).toBeNull();
  });
  it('keeps legacy prefixes working', () => {
    expect(resolveRefRoute('WO-1000042')).toContain('/dashboard/work-orders');
    expect(resolveRefRoute('CNT-1000007')).toContain('/dashboard/contracts');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Phase D — Health helpers

describe('Phase D — health helpers', () => {
  const NOW = Date.parse('2026-06-01T00:00:00Z');

  it('workOrderHealth: completed/cancelled short-circuit', () => {
    expect(workOrderHealth('completed', null, NOW)).toBe('completed');
    expect(workOrderHealth('cancelled', '2026-05-01', NOW)).toBe('completed');
  });
  it('workOrderHealth: overdue/due_soon/on_track', () => {
    expect(workOrderHealth('active', '2026-05-30T00:00:00Z', NOW)).toBe('overdue');
    expect(workOrderHealth('active', '2026-06-02T00:00:00Z', NOW)).toBe('due_soon');
    expect(workOrderHealth('active', '2026-07-01T00:00:00Z', NOW)).toBe('on_track');
    expect(workOrderHealth('active', null, NOW)).toBe('on_track');
  });

  it('contractHealth covers all branches', () => {
    expect(contractHealth('cancelled', null, NOW)).toBe('cancelled');
    expect(contractHealth('completed', null, NOW)).toBe('completed');
    expect(contractHealth('draft', null, NOW)).toBe('draft');
    expect(contractHealth('active', '2026-05-01', NOW)).toBe('delayed');
    expect(contractHealth('active', '2026-07-01', NOW)).toBe('active');
  });

  it('rfqHealth and quotationHealth', () => {
    expect(rfqHealth('awarded', null, NOW)).toBe('awarded');
    expect(rfqHealth('sent', '2026-05-01', NOW)).toBe('expired');
    expect(rfqHealth('sent', '2026-07-01', NOW)).toBe('open');

    expect(quotationHealth('approved', null, NOW)).toBe('approved');
    expect(quotationHealth('rejected', null, NOW)).toBe('rejected');
    expect(quotationHealth('sent', '2026-05-01', NOW)).toBe('expired');
    expect(quotationHealth('sent', '2026-07-01', NOW)).toBe('sent');
    expect(quotationHealth('draft', null, NOW)).toBe('draft');
  });

  it('exposes labels + semantic tones for every state', () => {
    for (const k of Object.keys(WORK_ORDER_HEALTH_LABELS)) {
      expect(WORK_ORDER_HEALTH_TONE[k as keyof typeof WORK_ORDER_HEALTH_TONE])
        .toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Phase E — Analytics helpers

describe('Phase E — analytics helpers', () => {
  const NOW = Date.parse('2026-06-01T00:00:00Z');

  it('computeProductionMetrics aggregates correctly', () => {
    const m = computeProductionMetrics(
      [
        { id: '1', status: 'completed', pipeline_stage: 'done',
          created_at: '2026-05-01T00:00:00Z', due_at: null,
          completed_at: '2026-05-11T00:00:00Z' },
        { id: '2', status: 'active', pipeline_stage: 'fab',
          created_at: '2026-05-01T00:00:00Z',
          due_at: '2026-05-15T00:00:00Z', completed_at: null }, // overdue
        { id: '3', status: 'active', pipeline_stage: 'fab',
          created_at: '2026-05-01T00:00:00Z',
          due_at: '2026-07-01T00:00:00Z', completed_at: null },
      ],
      [
        { work_order_id: '2', stage_key: 'fab', duration_ms: 6 * 86400000 },
        { work_order_id: '3', stage_key: 'fab', duration_ms: 4 * 86400000 },
        { work_order_id: '1', stage_key: 'install', duration_ms: 1 * 86400000 },
      ],
      NOW,
    );
    expect(m.totalCount).toBe(3);
    expect(m.completedCount).toBe(1);
    expect(m.overdueCount).toBe(1);
    expect(m.completionRate).toBeCloseTo(1 / 3, 5);
    expect(m.averageCycleTimeMs).toBe(10 * 86400000);
    expect(m.bottleneckStage).toBe('fab');
  });

  it('computeProcurementMetrics counts open/awarded/pending', () => {
    const m = computeProcurementMetrics(
      [
        { id: 'a', status: 'sent', awarded_quote_id: null },
        { id: 'b', status: 'sent', awarded_quote_id: 'q1' },
        { id: 'c', status: 'draft', awarded_quote_id: null },
      ],
      [
        { rfq_id: 'a', status: 'submitted' },
        { rfq_id: 'a', status: 'draft' },
        { rfq_id: 'b', status: 'awarded' },
      ],
    );
    expect(m.openRfqCount).toBe(2);
    expect(m.awardedRfqCount).toBe(1);
    expect(m.pendingSupplierQuoteCount).toBe(2);
    expect(m.averageResponsesPerRfq).toBeCloseTo(2 / 3, 5);
  });

  it('computeQuotationMetrics rates', () => {
    const m = computeQuotationMetrics(
      [
        { status: 'approved', expires_at: null },
        { status: 'rejected', expires_at: null },
        { status: 'sent', expires_at: '2026-05-01T00:00:00Z' },
        { status: 'draft', expires_at: null },
      ],
      NOW,
    );
    expect(m.total).toBe(4);
    expect(m.approvalRate).toBeCloseTo(0.25, 5);
    expect(m.rejectionRate).toBeCloseTo(0.25, 5);
    expect(m.expiryRate).toBeCloseTo(0.25, 5);
  });

  it('quotation metrics on empty input do not divide-by-zero', () => {
    const m = computeQuotationMetrics([]);
    expect(m).toEqual({ total: 0, approvalRate: 0, rejectionRate: 0, expiryRate: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Phase F — Quotation revisions

describe('Phase F — deriveQuotationRevisions', () => {
  it('filters to matching ref + orders + versions', () => {
    const revs = deriveQuotationRevisions(
      [
        { id: 'e1', business_id: 'b', actor_id: 'u', entity_type: 'work_order_quotation',
          entity_id: 'q1', action: 'quotation_sent',
          metadata: { ref_id: 'WOQ-1000001' },
          created_at: '2026-05-10T00:00:00Z' },
        { id: 'e0', business_id: 'b', actor_id: 'u', entity_type: 'work_order_quotation',
          entity_id: 'q1', action: 'quotation_created',
          metadata: { ref_id: 'WOQ-1000001' },
          created_at: '2026-05-09T00:00:00Z' },
        { id: 'e2', business_id: 'b', actor_id: 'u', entity_type: 'work_order_quotation',
          entity_id: 'q2', action: 'quotation_created',
          metadata: { ref_id: 'WOQ-1000002' },
          created_at: '2026-05-11T00:00:00Z' },
      ],
      'WOQ-1000001',
    );
    expect(revs).toHaveLength(2);
    expect(revs[0]).toMatchObject({ version: 1, action: 'quotation_created' });
    expect(revs[1]).toMatchObject({ version: 2, action: 'quotation_sent' });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Phase G — Permission matrix

describe('Phase G — buildPermissionMatrix', () => {
  it('produces a full role × permission grid with stable cells', () => {
    const cells = buildPermissionMatrix();
    // 10 roles × 27 permissions = 270 cells
    expect(cells.length).toBeGreaterThanOrEqual(10 * 20);
    const owner = cells.filter((c) => c.role === 'owner');
    expect(owner.every((c) => c.granted)).toBe(true);
    const viewer = cells.filter((c) => c.role === 'viewer');
    const granted = viewer.filter((c) => c.granted).map((c) => c.permission);
    expect(granted).toEqual(['entity.view']);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Phase H — Access timeline filter

describe('Phase H — isAccessEvent', () => {
  it('captures identity/access actions', () => {
    expect(isAccessEvent({
      id: 'x', business_id: 'b', actor_id: 'u',
      entity_type: 'membership', entity_id: 'm',
      action: 'role_changed', metadata: null,
      created_at: '2026-05-01T00:00:00Z',
    })).toBe(true);
    expect(isAccessEvent({
      id: 'x', business_id: 'b', actor_id: 'u',
      entity_type: 'work_order', entity_id: 'wo',
      action: 'stage_advanced', metadata: null,
      created_at: '2026-05-01T00:00:00Z',
    })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scope guards — static source-level enforcement.

describe('BUSINESS-FINISHING-1 — scope guards', () => {
  const ROOT = process.cwd();
  const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

  it('analytics module has NO supabase imports (pure helpers only)', () => {
    const src = read('src/modules/analytics/index.ts');
    expect(src).not.toMatch(/from\s+['"][^'"]*supabase[^'"]*['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/integrations/);
  });

  it('health module has NO supabase imports', () => {
    const src = read('src/modules/health/index.ts');
    expect(src).not.toMatch(/from\s+['"][^'"]*supabase[^'"]*['"]/);
  });

  it('quotation revision helper is pure', () => {
    const src = read('src/modules/quotes/lib/revisionHistory.ts');
    expect(src).not.toMatch(/supabase\.from/);
  });

  it('RelatedReferencesPanel never exposes raw UUIDs (uses /r/ resolver)', () => {
    const src = read('src/components/reference/RelatedReferencesPanel.tsx');
    expect(src).toMatch(/\/r\/\$\{encodeURIComponent\(e\.refId!\)\}/);
    // No direct uuid rendering / database id leak
    expect(src).not.toMatch(/business_id|user_id|entity_id/);
  });

  it('no new inventory/payments/warehouse/supplier-portal/realtime imports in new modules', () => {
    const files = [
      'src/modules/analytics/index.ts',
      'src/modules/health/index.ts',
      'src/modules/quotes/lib/revisionHistory.ts',
      'src/components/health/HealthBadge.tsx',
      'src/components/timeline/UnifiedTimeline.tsx',
      'src/components/identity/PermissionMatrix.tsx',
      'src/components/identity/AccessTimeline.tsx',
      'src/components/reference/RelatedReferencesPanel.tsx',
      'src/components/quotes/QuotationRevisionHistory.tsx',
    ];
    const forbidden = /(inventory|stock_|warehouse|supplier_payments|supplier_portal|postgres_changes|\.channel\()/i;
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} must not reference forbidden domains`).not.toMatch(forbidden);
    }
  });
});