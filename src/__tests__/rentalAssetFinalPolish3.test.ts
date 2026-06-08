/**
 * RENTAL-ASSET-FINAL-POLISH-3 — final polish smoke + scope-creep guards.
 * No DB hits. Source-level + module-surface checks.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  getAssetUtilizationSummary,
  getRentalAssetPolishCounts,
  AssetUtilizationSummary,
  AssetQrIdentity,
  AssetMaintenanceAlerts,
  RentalAssetPolishOpsCard,
} from '@/modules/assets';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Part A — utilization summary', () => {
  it('exports utilization summary service + component', () => {
    expect(typeof getAssetUtilizationSummary).toBe('function');
    expect(AssetUtilizationSummary).toBeDefined();
  });
  it('component shows the required fields', () => {
    const src = read('src/modules/assets/components/AssetUtilizationSummary.tsx');
    expect(src).toMatch(/days_rented/);
    expect(src).toMatch(/days_idle/);
    expect(src).toMatch(/utilization_pct/);
    expect(src).toMatch(/current_status/);
    expect(src).toMatch(/last_rental_ref/);
    expect(src).toMatch(/next_available_date/);
  });
  it('utilization service returns null for empty input safely', async () => {
    const r = await getAssetUtilizationSummary('');
    expect(r).toBeNull();
  });
});

describe('Part B — QR / Barcode identity', () => {
  it('AssetQrIdentity component exported', () => {
    expect(AssetQrIdentity).toBeDefined();
  });
  it('encodes only safe internal asset metadata (ref + name + category + status)', () => {
    const src = read('src/modules/assets/components/AssetQrIdentity.tsx');
    expect(src).toMatch(/asset\.ref_id/);
    expect(src).toMatch(/\/admin\/assets\?ref=/);
    // no rental customer data
    expect(src).not.toMatch(/customer/i);
    expect(src).not.toMatch(/client_phone|customer_email|customer_name/);
    // no sensitive rental detail
    expect(src).not.toMatch(/total_price|price|payment/i);
  });
  it('uses the project-internal QR generator, not an external API', () => {
    const src = read('src/modules/assets/components/AssetQrIdentity.tsx');
    expect(src).toMatch(/from\s+'@\/lib\/badge\/qr'/);
    expect(src).not.toMatch(/api\.qrserver\.com|chart\.googleapis\.com|http(s)?:\/\/[^'"]*qr/i);
  });
});

describe('Part C — maintenance alert polish', () => {
  it('AssetMaintenanceAlerts exported', () => {
    expect(AssetMaintenanceAlerts).toBeDefined();
  });
  it('renders the 4 alert kinds', () => {
    const src = read('src/modules/assets/components/AssetMaintenanceAlerts.tsx');
    expect(src).toMatch(/Maintenance overdue/);
    expect(src).toMatch(/Maintenance due/);
    expect(src).toMatch(/Inspection overdue/);
    expect(src).toMatch(/Post-rental inspection required/);
    expect(src).toMatch(/Maintenance recommended after rental close/);
  });
  it('shows days remaining / overdue and next action context', () => {
    const src = read('src/modules/assets/components/AssetMaintenanceAlerts.tsx');
    expect(src).toMatch(/daysUntil/);
    expect(src).toMatch(/maintenanceTier/);
    expect(src).toMatch(/overdue/);
  });
});

describe('Part D — operations center polish', () => {
  it('RentalAssetPolishOpsCard exported and surfaces the 5 final tiles', () => {
    expect(RentalAssetPolishOpsCard).toBeDefined();
    const src = read('src/modules/assets/components/RentalAssetPolishOpsCard.tsx');
    expect(src).toMatch(/low_utilization_assets/);
    expect(src).toMatch(/assets_without_qr/);
    expect(src).toMatch(/inspections_overdue/);
    expect(src).toMatch(/post_rental_inspection_queue/);
    expect(src).toMatch(/repeated_overrides/);
  });
  it('admin Operations Hub assets tab renders the polish card', () => {
    const src = read('src/pages/admin/AdminOperationsAssets.tsx');
    expect(src).toMatch(/RentalAssetPolishOpsCard/);
  });
  it('counts service returns numbers (no throw)', async () => {
    const r = await getRentalAssetPolishCounts();
    expect(typeof r.low_utilization_assets).toBe('number');
    expect(typeof r.assets_without_qr).toBe('number');
    expect(typeof r.inspections_overdue).toBe('number');
    expect(typeof r.post_rental_inspection_queue).toBe('number');
    expect(typeof r.repeated_overrides).toBe('number');
  });
});

describe('migration shape — utilization + polish RPCs', () => {
  const dir = join(root, 'supabase/migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql'));
  const sql = files
    .map(f => readFileSync(join(dir, f), 'utf8'))
    .find(s => /asset_utilization_summary/.test(s) && /rental_asset_polish_counts/.test(s));

  it('migration exists', () => expect(sql).toBeTruthy());
  it('declares both functions with search_path public', () => {
    expect(sql).toMatch(/FUNCTION public\.asset_utilization_summary/);
    expect(sql).toMatch(/FUNCTION public\.rental_asset_polish_counts/);
    expect(sql).toMatch(/SET search_path = public/);
  });
  it('grants EXECUTE to authenticated + service_role', () => {
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.asset_utilization_summary[^;]+authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.rental_asset_polish_counts[^;]+authenticated/);
    expect(sql).toMatch(/service_role/);
  });
  it('returns only operational keys (no customer/payment data)', () => {
    expect(sql).not.toMatch(/customer_email|customer_phone|customer_name/i);
    expect(sql).not.toMatch(/payment|invoice|amount_due|total_price/i);
  });
});

describe('Part E — scope-creep guard', () => {
  it('no accounting/payment/inventory/supplier modules added under assets/', () => {
    const dir = join(root, 'src/modules/assets');
    const list = readdirSync(dir, { recursive: true }) as string[];
    const forbidden = /accounting|payment|invoice|ledger|inventory|supplier|gateway/i;
    const offenders = list.filter(f => forbidden.test(f));
    expect(offenders, `unexpected files: ${offenders.join(', ')}`).toEqual([]);
  });
  it('no new public route for assets', () => {
    const app = read('src/App.tsx');
    const lines = app.split('\n').filter(l => /path="\/(assets|asset)\//.test(l));
    expect(lines, `public asset routes found: ${lines.join(' | ')}`).toEqual([]);
  });
  it('robots/sitemap have not been opened to assets', () => {
    for (const f of ['public/robots.txt', 'public/sitemap.xml']) {
      if (!existsSync(join(root, f))) continue;
      const src = read(f);
      expect(src).not.toMatch(/\/assets\//);
    }
  });
});

describe('no direct supabase in pages for polish surface', () => {
  it('AdminOperationsAssets goes through module only', () => {
    const src = read('src/pages/admin/AdminOperationsAssets.tsx');
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
  it('AdminAssets does not call supabase directly for polish RPCs', () => {
    const src = read('src/pages/admin/AdminAssets.tsx');
    expect(src).not.toMatch(/asset_utilization_summary/);
    expect(src).not.toMatch(/rental_asset_polish_counts/);
  });
  it('DashboardAssets does not call supabase directly for polish RPCs', () => {
    const src = read('src/pages/dashboard/DashboardAssets.tsx');
    expect(src).not.toMatch(/asset_utilization_summary/);
    expect(src).not.toMatch(/rental_asset_polish_counts/);
  });
});

describe('assets remain non-public', () => {
  it('public rental pages do not import polish components', () => {
    const pubs = ['src/pages/RentalsCatalog.tsx', 'src/pages/RentalItemPublic.tsx'];
    for (const p of pubs) {
      if (!existsSync(join(root, p))) continue;
      const src = read(p);
      expect(src).not.toMatch(/AssetUtilizationSummary/);
      expect(src).not.toMatch(/AssetQrIdentity/);
      expect(src).not.toMatch(/AssetMaintenanceAlerts/);
      expect(src).not.toMatch(/RentalAssetPolishOpsCard/);
      expect(src).not.toMatch(/asset_utilization_summary/);
      expect(src).not.toMatch(/rental_asset_polish_counts/);
    }
  });
});