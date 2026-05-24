import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PAGE_SRC = fs.readFileSync(
  path.resolve(__dirname, '../AdminBarcodeRegistry.tsx'),
  'utf8',
);
const APP_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../../App.tsx'),
  'utf8',
);
const SIDEBAR_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../../components/dashboard/DashboardSidebar.tsx'),
  'utf8',
);

describe('AdminBarcodeRegistry route + admin protection', () => {
  it('registers the /admin/barcode-registry route with requireAdmin', () => {
    expect(APP_SRC).toMatch(/path=["']\/admin\/barcode-registry["']/);
    const m = APP_SRC.match(
      /<Route\s+path=["']\/admin\/barcode-registry["'][^>]*element=\{([\s\S]*?)\}\s*\/>/,
    );
    expect(m?.[1]).toBeTruthy();
    expect(m![1]).toMatch(/ProtectedRoute[^>]*requireAdmin/);
  });

  it('exposes a discoverable sidebar entry for the page', () => {
    expect(SIDEBAR_SRC).toMatch(/\/admin\/barcode-registry/);
  });
});

describe('AdminBarcodeRegistry source contract', () => {
  it('uses canonical barcodes module wrappers (no direct supabase RPC)', () => {
    expect(PAGE_SRC).toMatch(/from ['"]@\/modules\/barcodes['"]/);
    expect(PAGE_SRC).toMatch(/listBarcodeRegistryRecords/);
    expect(PAGE_SRC).toMatch(/getBarcodeRegistrySummary/);
    expect(PAGE_SRC).toMatch(/getBarcodeRegistryRecordById/);
  });

  it('does not access barcode RPCs directly from the page', () => {
    expect(PAGE_SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_list_barcodes['"]/);
    expect(PAGE_SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_barcode_registry_summary['"]/);
    expect(PAGE_SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_get_barcode_detail['"]/);
    expect(PAGE_SRC).not.toMatch(/from\(\s*['"]barcodes['"]/);
  });

  it('renders bilingual header title and subtitle', () => {
    expect(PAGE_SRC).toContain('سجل الباركود');
    expect(PAGE_SRC).toContain('Barcode Registry');
    expect(PAGE_SRC).toContain('إدارة وتتبع روابط الباركود');
    expect(PAGE_SRC).toContain(
      'Manage and track barcode and verification links connected to businesses and services.',
    );
  });

  it('renders the bilingual empty state from the spec', () => {
    expect(PAGE_SRC).toContain('لا توجد رموز باركود حتى الآن.');
    expect(PAGE_SRC).toContain('No barcode records yet.');
  });

  it('renders bilingual link-copied toast text', () => {
    expect(PAGE_SRC).toContain('تم نسخ الرابط');
    expect(PAGE_SRC).toContain('Link copied');
  });

  it('builds public URLs via the shared helper, not hard-coded paths', () => {
    expect(PAGE_SRC).toMatch(/buildBarcodeUrl/);
    expect(PAGE_SRC).not.toMatch(/['"`]\/q\/\$\{/);
  });

  it('uses safe target=_blank with rel="noreferrer noopener" for external links', () => {
    const anchors = PAGE_SRC.match(/<a\b[^>]*target=["']_blank["'][^>]*>/g) ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(a).toMatch(/rel=["'][^"']*noopener[^"']*["']/);
      expect(a).toMatch(/rel=["'][^"']*noreferrer[^"']*["']/);
    }
  });

  it('does not call window.open from the page (uses anchor with rel safety instead)', () => {
    expect(PAGE_SRC).not.toMatch(/window\.open\(/);
  });

  it('provides loading, retry, and clear-filters affordances', () => {
    expect(PAGE_SRC).toMatch(/جارٍ التحميل/);
    expect(PAGE_SRC).toMatch(/إعادة المحاولة|Retry/);
    expect(PAGE_SRC).toMatch(/clearFilters/);
  });

  it('does not include unauthorized destructive actions (delete/disable)', () => {
    expect(PAGE_SRC).not.toMatch(/\.delete\(/);
    expect(PAGE_SRC).not.toMatch(/admin_delete_barcode/);
    expect(PAGE_SRC).not.toMatch(/admin_revoke_barcode/);
  });

  it('applies the noindex hook so the admin page stays out of search engines', () => {
    expect(PAGE_SRC).toMatch(/useNoIndex\(\)/);
  });
});

describe('BARCODE-REGISTRY-LIFECYCLE-1 — UI deferred contract', () => {
  // Lifecycle action buttons land in BARCODE-REGISTRY-LIFECYCLE-2.
  // This phase only ships server RPCs + service wrappers; the page must
  // remain free of freeze/archive/restore controls until then.
  it('page does not yet call lifecycle service wrappers', () => {
    expect(PAGE_SRC).not.toMatch(/freezeBarcodeAdmin/);
    expect(PAGE_SRC).not.toMatch(/archiveBarcodeAdmin/);
    expect(PAGE_SRC).not.toMatch(/restoreBarcodeAdmin/);
  });

  it('page does not call lifecycle RPCs directly', () => {
    expect(PAGE_SRC).not.toMatch(/admin_freeze_barcode/);
    expect(PAGE_SRC).not.toMatch(/admin_archive_barcode/);
    expect(PAGE_SRC).not.toMatch(/admin_restore_barcode/);
  });
});