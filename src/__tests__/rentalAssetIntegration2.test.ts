/**
 * RENTAL-ASSET-INTEGRATION-2 — picker, batch logic, override governance,
 * audit page, ops widgets, observability. No DB hits.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  AssetPicker, AssetOverridePanel,
  AssetOverridesApi, OVERRIDE_REASONS,
} from '@/modules/assets';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('asset picker + override surface', () => {
  it('AssetPicker component exported', () => {
    expect(AssetPicker).toBeDefined();
  });
  it('AssetOverridePanel component exported', () => {
    expect(AssetOverridePanel).toBeDefined();
  });
  it('Override reasons are the 4 allowed values', () => {
    expect(OVERRIDE_REASONS.map(r => r.value).sort()).toEqual([
      'emergency_release','legacy_data_fix','manual_correction','migration_repair',
    ]);
  });
  for (const fn of ['applyAssetOverride','listOverrides','logAssignmentBlocked'] as const) {
    it(`overrides API exports ${fn}`, () => {
      expect(typeof (AssetOverridesApi as Record<string, unknown>)[fn]).toBe('function');
    });
  }
});

describe('override requires reason + note (>=5 chars)', () => {
  it('rejects empty note client-side', async () => {
    const r = await AssetOverridesApi.applyAssetOverride({
      asset_id: '00000000-0000-0000-0000-000000000000',
      reason: 'manual_correction',
      note: '',
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('note_required');
  });
  it('rejects too-short note', async () => {
    const r = await AssetOverridesApi.applyAssetOverride({
      asset_id: '00000000-0000-0000-0000-000000000000',
      reason: 'manual_correction',
      note: 'ok',
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('note_required');
  });
});

describe('picker enforces availability + batch quantity', () => {
  const src = read('src/modules/assets/components/AssetPicker.tsx');
  it('calls checkAssetRentalAvailability', () => {
    expect(src).toMatch(/checkAssetRentalAvailability/);
  });
  it('disables picks beyond requiredQuantity', () => {
    expect(src).toMatch(/requiredQuantity/);
    expect(src).toMatch(/selectedAssetIds\.length\s*>=\s*requiredQuantity/);
  });
  it('blocks unavailable assets and logs blocked event', () => {
    expect(src).toMatch(/logAssignmentBlocked/);
    expect(src).toMatch(/disabled=\{blocked\}/);
  });
  it('supports search by ref/name/serial and status filter', () => {
    expect(src).toMatch(/ref_id\.toLowerCase\(\)/);
    expect(src).toMatch(/serial_number/);
    expect(src).toMatch(/statusFilter/);
  });
});

describe('audit page + route', () => {
  it('AdminAssetOverrides page exists', () => {
    expect(existsSync(join(root, 'src/pages/admin/AdminAssetOverrides.tsx'))).toBe(true);
  });
  it('route registered in App.tsx', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/\/admin\/assets\/overrides/);
    expect(app).toMatch(/AdminAssetOverrides/);
  });
});

describe('ops widgets surface new counts', () => {
  it('RentalAssetOpsCard renders the 3 new tiles', () => {
    const src = read('src/modules/assets/components/RentalAssetOpsCard.tsx');
    expect(src).toMatch(/overrides_last_24h/);
    expect(src).toMatch(/overrides_total/);
    expect(src).toMatch(/blocked_assignments_today/);
    expect(src).toMatch(/\/admin\/assets\/overrides/);
  });
});

describe('migration shape — overrides + governance', () => {
  const dir = join(root, 'supabase/migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql'));
  const sql = files
    .map(f => readFileSync(join(dir, f), 'utf8'))
    .find(s => /asset_override_log/.test(s))!;

  it('migration exists', () => expect(sql).toBeTruthy());
  it('creates audit table with RLS + admin policies + no UPDATE/DELETE policies', () => {
    expect(sql).toMatch(/CREATE TABLE[^;]+asset_override_log/i);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/aovr admin read/);
    expect(sql).toMatch(/aovr admin insert/);
    // append-only: no UPDATE/DELETE policy lines on the audit table
    expect(sql).not.toMatch(/CREATE POLICY[^;]+asset_override_log[^;]+FOR UPDATE/);
    expect(sql).not.toMatch(/CREATE POLICY[^;]+asset_override_log[^;]+FOR DELETE/);
  });
  it('apply_override RPC enforces admin + note', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.asset_apply_override/);
    expect(sql).toMatch(/unauthorized: admin only/);
    expect(sql).toMatch(/note_required/);
  });
  it('emits observability events', () => {
    expect(sql).toMatch(/asset_override_applied/);
  });
  it('extends rental_asset_ops_counts with new keys', () => {
    expect(sql).toMatch(/overrides_last_24h/);
    expect(sql).toMatch(/overrides_total/);
    expect(sql).toMatch(/blocked_assignments_today/);
  });
  it('reason enum has the 4 values', () => {
    for (const v of ['emergency_release','manual_correction','legacy_data_fix','migration_repair']) {
      expect(sql).toMatch(new RegExp(v));
    }
  });
});

describe('no direct supabase in pages / no RLS weakening', () => {
  it('AdminAssetOverrides goes through services module', () => {
    const src = read('src/pages/admin/AdminAssetOverrides.tsx');
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(src).toMatch(/services\/overrides/);
  });
  it('migration uses no USING (true) on override table', () => {
    const dir = join(root, 'supabase/migrations');
    const files = readdirSync(dir).filter(f => f.endsWith('.sql'));
    const sql = files.map(f => readFileSync(join(dir, f), 'utf8'))
      .find(s => /asset_override_log/.test(s))!;
    const segment = sql.split('asset_override_log').slice(0, 5).join('asset_override_log');
    expect(segment).not.toMatch(/USING \(true\)/);
  });
});
