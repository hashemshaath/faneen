import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeUtilization, isLowUtilization,
  canTransition, daysUntil, maintenanceTier,
} from '@/modules/assets';

const root = process.cwd();

describe('ASSET-MICROSERVICE-1 — utilization math', () => {
  it('returns 0 for zero/invalid totals', () => {
    expect(computeUtilization(5, 0)).toBe(0);
    expect(computeUtilization(NaN, 10)).toBe(0);
  });
  it('clamps rented to total and computes percentage', () => {
    expect(computeUtilization(15, 30)).toBe(50);
    expect(computeUtilization(40, 30)).toBe(100);
    expect(computeUtilization(0, 30)).toBe(0);
  });
  it('flags low utilization under default 25%', () => {
    expect(isLowUtilization(10)).toBe(true);
    expect(isLowUtilization(25)).toBe(false);
    expect(isLowUtilization(80)).toBe(false);
  });
});

describe('ASSET-MICROSERVICE-1 — lifecycle', () => {
  it('allows valid transitions and self-loop', () => {
    expect(canTransition('available','rented')).toBe(true);
    expect(canTransition('rented','available')).toBe(true);
    expect(canTransition('maintenance','available')).toBe(true);
    expect(canTransition('available','available')).toBe(true);
  });
  it('rejects illegal transitions and treats retired as terminal', () => {
    expect(canTransition('rented','reserved')).toBe(false);
    expect(canTransition('retired','available')).toBe(false);
    expect(canTransition('retired','rented')).toBe(false);
  });
});

describe('ASSET-MICROSERVICE-1 — date helpers', () => {
  const today = new Date('2026-06-08T00:00:00Z');
  it('daysUntil returns null when missing', () => {
    expect(daysUntil(null, today)).toBeNull();
  });
  it('daysUntil returns positive future / negative past', () => {
    expect(daysUntil('2026-06-15', today)).toBe(7);
    expect(daysUntil('2026-06-01', today)).toBe(-7);
  });
  it('maintenanceTier buckets correctly', () => {
    expect(maintenanceTier(null, today)).toBe('safe');
    expect(maintenanceTier('2026-06-01', today)).toBe('overdue');
    expect(maintenanceTier('2026-06-08', today)).toBe('due');
    expect(maintenanceTier('2026-06-09', today)).toBe('due');
    expect(maintenanceTier('2026-06-12', today)).toBe('soon');
    expect(maintenanceTier('2026-07-12', today)).toBe('safe');
  });
});

describe('ASSET-MICROSERVICE-1 — module wiring', () => {
  it('barrel re-exports core surface', async () => {
    const mod = await import('@/modules/assets');
    for (const k of [
      'AssetCategoriesApi','AssetsApi','AssetMaintenanceApi','AssetInspectionsApi',
      'AssetUtilizationApi','AssetRentalLinksApi','AssetOps',
      'AssetStatusBadge','AssetOpsCard',
      'computeUtilization','canTransition','daysUntil','maintenanceTier',
      'ASSET_STATUS_LABELS','MAINTENANCE_STATUS_LABELS','INSPECTION_RESULT_LABELS',
    ]) {
      expect(mod, `missing export ${k}`).toHaveProperty(k);
    }
  });

  it('provider and admin pages are registered in App.tsx', () => {
    const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
    expect(app).toMatch(/path="\/dashboard\/assets"/);
    expect(app).toMatch(/path="\/admin\/assets"/);
    expect(app).not.toMatch(/path="\/assets"\s/); // never exposed publicly
  });

  it('assets are NOT included in the public sitemap or public catalog routes', () => {
    expect(existsSync(join(root, 'src/pages/AssetsCatalog.tsx'))).toBe(false);
    expect(existsSync(join(root, 'src/pages/AssetPublic.tsx'))).toBe(false);
  });

  it('operations hub registers Assets tab', () => {
    const hub = readFileSync(join(root, 'src/pages/admin/AdminOperationsHub.tsx'), 'utf8');
    expect(hub).toMatch(/AdminOperationsAssets/);
    expect(hub).toMatch(/key: 'assets'/);
  });
});