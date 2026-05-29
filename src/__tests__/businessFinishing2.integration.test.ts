/**
 * BUSINESS-FINISHING-2A — Integration mount audit.
 *
 * Source-level assertions only: confirm visibility components are mounted
 * in the required pages, no raw UUIDs are surfaced, and no forbidden
 * domain references (inventory / supplier payments / supplier portal /
 * realtime / direct supabase.from) sneak into newly touched files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

const TOUCHED_FILES = [
  'src/pages/dashboard/DashboardWorkOrders.tsx',
  'src/pages/dashboard/DashboardWorkOrderDetail.tsx',
  'src/pages/dashboard/ProductionBoardPage.tsx',
  'src/pages/dashboard/DashboardProcurement.tsx',
  'src/pages/dashboard/DashboardProcurementDetail.tsx',
  'src/pages/dashboard/DashboardStaffCenter.tsx',
  'src/pages/ContractDetail.tsx',
  'src/components/contracts/dashboard/ContractCard.tsx',
  'src/components/workOrders/WorkOrderBoqSection.tsx',
  'src/components/workOrders/WorkOrderQuotationsSection.tsx',
  'src/pages/admin/AdminIdentity.tsx',
  'src/pages/QuotationViewer.tsx',
];

describe('BUSINESS-FINISHING-2A — HealthBadge mounts', () => {
  it('mounts HealthBadge in DashboardWorkOrders list rows', () => {
    const src = read('src/pages/dashboard/DashboardWorkOrders.tsx');
    expect(src).toMatch(/HealthBadge/);
    expect(src).toMatch(/workOrderHealth/);
  });
  it('mounts HealthBadge in DashboardWorkOrderDetail', () => {
    expect(read('src/pages/dashboard/DashboardWorkOrderDetail.tsx')).toMatch(/HealthBadge/);
  });
  it('mounts HealthBadge in ProductionBoardPage cards', () => {
    expect(read('src/pages/dashboard/ProductionBoardPage.tsx')).toMatch(/HealthBadge/);
  });
  it('mounts HealthBadge in WorkOrderQuotationsSection', () => {
    expect(read('src/components/workOrders/WorkOrderQuotationsSection.tsx')).toMatch(/HealthBadge/);
  });
  it('mounts HealthBadge in ContractCard', () => {
    expect(read('src/components/contracts/dashboard/ContractCard.tsx')).toMatch(/HealthBadge/);
  });
  it('mounts HealthBadge in public QuotationViewer', () => {
    expect(read('src/pages/QuotationViewer.tsx')).toMatch(/HealthBadge/);
  });
});

describe('BUSINESS-FINISHING-2A — RelatedReferencesPanel mounts', () => {
  it('mounts on WorkOrderDetail', () => {
    expect(read('src/pages/dashboard/DashboardWorkOrderDetail.tsx')).toMatch(/RelatedReferencesPanel/);
  });
  it('mounts on ProcurementDetail', () => {
    expect(read('src/pages/dashboard/DashboardProcurementDetail.tsx')).toMatch(/RelatedReferencesPanel/);
  });
  it('mounts on ContractDetail', () => {
    expect(read('src/pages/ContractDetail.tsx')).toMatch(/RelatedReferencesPanel/);
  });
  it('mounts on WorkOrderBoqSection', () => {
    expect(read('src/components/workOrders/WorkOrderBoqSection.tsx')).toMatch(/RelatedReferencesPanel/);
  });
  it('routes through /r/{refId} resolver — never raw UUIDs', () => {
    const panel = read('src/components/reference/RelatedReferencesPanel.tsx');
    expect(panel).toMatch(/\/r\/\$\{encodeURIComponent\(e\.refId!\)\}/);
  });
});

describe('BUSINESS-FINISHING-2A — UnifiedTimeline mounts', () => {
  it('mounts on WorkOrderDetail', () => {
    expect(read('src/pages/dashboard/DashboardWorkOrderDetail.tsx')).toMatch(/UnifiedTimeline/);
  });
  it('mounts on ProcurementDetail', () => {
    expect(read('src/pages/dashboard/DashboardProcurementDetail.tsx')).toMatch(/UnifiedTimeline/);
  });
  it('mounts on ContractDetail', () => {
    expect(read('src/pages/ContractDetail.tsx')).toMatch(/UnifiedTimeline/);
  });
  it('does NOT mount on public QuotationViewer (token-scope safety)', () => {
    expect(read('src/pages/QuotationViewer.tsx')).not.toMatch(/UnifiedTimeline/);
  });
});

describe('BUSINESS-FINISHING-2A — Revision + Access timelines', () => {
  it('QuotationRevisionHistory mounts in WorkOrderQuotationsSection', () => {
    expect(read('src/components/workOrders/WorkOrderQuotationsSection.tsx')).toMatch(/QuotationRevisionHistory/);
  });
  it('QuotationRevisionHistory does NOT mount in public QuotationViewer', () => {
    expect(read('src/pages/QuotationViewer.tsx')).not.toMatch(/QuotationRevisionHistory/);
  });
  it('AccessTimeline mounts in Staff Center', () => {
    expect(read('src/pages/dashboard/DashboardStaffCenter.tsx')).toMatch(/AccessTimeline/);
  });
  it('PermissionMatrix mounts in AdminIdentity', () => {
    expect(read('src/pages/admin/AdminIdentity.tsx')).toMatch(/PermissionMatrix/);
  });
});

describe('BUSINESS-FINISHING-2A — KPI strips', () => {
  it('ProductionBoardPage mounts KpiStrip', () => {
    expect(read('src/pages/dashboard/ProductionBoardPage.tsx')).toMatch(/KpiStrip/);
  });
  it('DashboardProcurement mounts KpiStrip', () => {
    expect(read('src/pages/dashboard/DashboardProcurement.tsx')).toMatch(/KpiStrip/);
  });
});

describe('BUSINESS-FINISHING-2A — DiagnosticsCard mounts', () => {
  it('ProductionBoardPage mounts DiagnosticsCard', () => {
    expect(read('src/pages/dashboard/ProductionBoardPage.tsx')).toMatch(/DiagnosticsCard/);
  });
  it('DashboardProcurement mounts DiagnosticsCard', () => {
    expect(read('src/pages/dashboard/DashboardProcurement.tsx')).toMatch(/DiagnosticsCard/);
  });
  it('DashboardProcurementDetail mounts DiagnosticsCard', () => {
    expect(read('src/pages/dashboard/DashboardProcurementDetail.tsx')).toMatch(/DiagnosticsCard/);
  });
});

describe('BUSINESS-FINISHING-2A — Scope guards on touched files', () => {
  const FORBIDDEN: Array<[string, RegExp]> = [
    ['stock_movements', /\bstock_movements?\b/i],
    ['warehouse', /\bwarehouse\b/i],
    ['supplier_portal', /\bsupplier_portal\b/i],
    ['supplier_payments', /\bsupplier_payments?\b/i],
    ['inventory', /\binventory\b/i],
    ['postgres_changes', /\bpostgres_changes\b/i],
  ];
  for (const file of TOUCHED_FILES) {
    it(`${file} has no forbidden domain references`, () => {
      const src = read(file);
      for (const [name, re] of FORBIDDEN) {
        expect(re.test(src), `${file} unexpectedly matches forbidden token ${name}`).toBe(false);
      }
    });
  }
});

describe('BUSINESS-FINISHING-2A — Helper components stay UI-only', () => {
  it('KpiCard never imports supabase client', () => {
    expect(read('src/components/dashboard/KpiCard.tsx')).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
  it('DiagnosticsCard never imports supabase client', () => {
    expect(read('src/components/dashboard/DiagnosticsCard.tsx')).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
  it('HealthBadge never imports supabase client', () => {
    expect(read('src/components/health/HealthBadge.tsx')).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
  it('RelatedReferencesPanel never imports supabase client', () => {
    expect(read('src/components/reference/RelatedReferencesPanel.tsx')).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
  it('analytics/diagnostics helpers are pure (no supabase, no react)', () => {
    const src = read('src/modules/analytics/diagnostics.ts');
    expect(src).not.toMatch(/supabase/);
    expect(src).not.toMatch(/from\s+['"]react['"]/);
  });
});
