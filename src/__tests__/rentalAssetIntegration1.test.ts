/**
 * RENTAL-ASSET-INTEGRATION-1 — module-level smoke tests.
 * Validates module surface, route safety, no public exposure, and pages do
 * not call Supabase directly for the new integration. Does not hit DB.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  AssetRentalAssignmentsApi,
  checkAssetRentalAvailability,
  describeBlock,
  RentalAssetOpsCard,
  AssetRentalPanel,
  RentalOrderAssetLinks,
} from '@/modules/assets';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('availability checker — pure surface', () => {
  it('checkAssetRentalAvailability exists and is async', () => {
    expect(typeof checkAssetRentalAvailability).toBe('function');
  });
  it('rejects missing input safely', async () => {
    const r = await checkAssetRentalAvailability({ assetId: '', startDate: '', endDate: '' });
    expect(r.available).toBe(false);
  });
  it('describeBlock returns null only when available', () => {
    expect(describeBlock({ available: true })).toBeNull();
    expect(describeBlock({ available: false, reason: 'asset_retired' })).toMatch(/مسحوب|سحب|الخدمة/);
    expect(describeBlock({ available: false, reason: 'asset_in_maintenance' })).toMatch(/صيانة/);
    expect(describeBlock({ available: false, reason: 'asset_in_inspection' })).toMatch(/فحص/);
    expect(describeBlock({ available: false, reason: 'overlap_conflict', conflicting_rental_ref: 'RORD-1' }))
      .toContain('RORD-1');
  });
});

describe('assignments API surface', () => {
  for (const fn of [
    'listAssignmentsForOrder', 'listAssignmentsForAsset', 'createAssignment',
    'setAssignmentStatus', 'deleteAssignment', 'getAssetCurrentRental',
    'getRentalAssetOpsCounts',
  ] as const) {
    it(`${fn} is exported`, () => {
      expect(typeof (AssetRentalAssignmentsApi as Record<string, unknown>)[fn]).toBe('function');
    });
  }
  it('UI components are exported', () => {
    expect(RentalAssetOpsCard).toBeDefined();
    expect(AssetRentalPanel).toBeDefined();
    expect(RentalOrderAssetLinks).toBeDefined();
  });
});

describe('migration shape', () => {
  const mig = 'supabase/migrations/20260608130639_rental_asset_integration.sql';
  // The actual migration filename is hash-generated; locate latest by content scan.
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = join(root, 'supabase/migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));
  const match = files.find(f => /asset_rental_assignments|asset_rental_check_availability/i.test(
    fs.readFileSync(join(dir, f), 'utf8'),
  ));

  it('migration file exists and creates the link table', () => {
    expect(match).toBeTruthy();
    const sql = fs.readFileSync(join(dir, match!), 'utf8');
    expect(sql).toMatch(/CREATE TABLE[^;]+asset_rental_assignments/i);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/CREATE POLICY/i);
    // observability — sync audit
    expect(sql).toMatch(/asset_status_synced_from_rental/);
    // sync trigger
    expect(sql).toMatch(/trg_asset_rental_sync/);
    // ops RPC
    expect(sql).toMatch(/rental_asset_ops_counts/);
    // availability RPC
    expect(sql).toMatch(/asset_rental_check_availability/);
    // status sync behavior
    expect(sql).toMatch(/'rented'/);
    expect(sql).toMatch(/'inspection'/);
    expect(sql).toMatch(/'available'/);
  });
});

describe('no public exposure / no direct supabase in pages', () => {
  it('public rental pages do not import asset assignments', () => {
    const pubs = ['src/pages/RentalsCatalog.tsx', 'src/pages/RentalItemPublic.tsx'];
    for (const p of pubs) {
      if (!existsSync(join(root, p))) continue;
      const src = read(p);
      expect(src).not.toMatch(/asset_rental_assignments/);
      expect(src).not.toMatch(/AssetRentalAssignmentsApi/);
      expect(src).not.toMatch(/AssetRentalPanel/);
    }
  });
  it('integration pages route assignments via module, never raw supabase', () => {
    const files = [
      'src/pages/dashboard/DashboardAssets.tsx',
      'src/pages/dashboard/DashboardRentals.tsx',
      'src/pages/admin/AdminAssets.tsx',
      'src/pages/admin/AdminOperationsRentals.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"][\s\S]{0,400}asset_rental_assignments/);
    }
  });
});

describe('RLS / policies present in migration (no weakening)', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = join(root, 'supabase/migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));
  const sql = files
    .map(f => fs.readFileSync(join(dir, f), 'utf8'))
    .find(s => /asset_rental_assignments/.test(s))!;
  it('has provider + admin policies, no USING (true)', () => {
    expect(sql).toMatch(/arasn admin all/);
    expect(sql).toMatch(/arasn provider read/);
    expect(sql).toMatch(/arasn provider write/);
    // Must NOT contain a blanket allow on this table
    const blockMatches = sql.match(/asset_rental_assignments[\s\S]*?CREATE POLICY[\s\S]*?USING \(true\)/g);
    expect(blockMatches).toBeNull();
  });
});
