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

describe('BARCODE-REGISTRY-LIFECYCLE-2 — admin lifecycle UI', () => {
  it('imports lifecycle wrappers from the canonical module', () => {
    expect(PAGE_SRC).toMatch(/freezeBarcodeAdmin/);
    expect(PAGE_SRC).toMatch(/archiveBarcodeAdmin/);
    expect(PAGE_SRC).toMatch(/restoreBarcodeAdmin/);
    expect(PAGE_SRC).toMatch(/from ['"]@\/modules\/barcodes['"]/);
  });

  it('does not call lifecycle RPCs directly from the page', () => {
    expect(PAGE_SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_freeze_barcode['"]/);
    expect(PAGE_SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_archive_barcode['"]/);
    expect(PAGE_SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_restore_barcode['"]/);
  });

  it('renders bilingual lifecycle button labels', () => {
    expect(PAGE_SRC).toContain("'تجميد'");   expect(PAGE_SRC).toContain("'Freeze'");
    expect(PAGE_SRC).toContain("'أرشفة'");   expect(PAGE_SRC).toContain("'Archive'");
    expect(PAGE_SRC).toContain("'استعادة'"); expect(PAGE_SRC).toContain("'Restore'");
  });

  it('renders bilingual reason input + cancel/confirm controls', () => {
    expect(PAGE_SRC).toContain('سبب الإجراء');
    expect(PAGE_SRC).toContain('Reason for action');
    expect(PAGE_SRC).toContain("'إلغاء'");    expect(PAGE_SRC).toContain("'Cancel'");
    expect(PAGE_SRC).toContain("'تأكيد'");   expect(PAGE_SRC).toContain("'Confirm'");
  });

  it('encodes action availability by status', () => {
    // Per spec matrix: active→[freeze,archive], frozen→[restore,archive],
    // archived→[restore], revoked→[archive], else→[].
    expect(PAGE_SRC).toMatch(/case 'active':\s*return \['freeze', 'archive'\]/);
    expect(PAGE_SRC).toMatch(/case 'frozen':\s*return \['restore', 'archive'\]/);
    expect(PAGE_SRC).toMatch(/case 'archived':\s*return \['restore'\]/);
    expect(PAGE_SRC).toMatch(/case 'revoked':\s*return \['archive'\]/);
    expect(PAGE_SRC).toMatch(/default:\s*return \[\]/);
  });

  it('renders the restore-conflict bilingual error copy verbatim', () => {
    expect(PAGE_SRC).toContain('لا يمكن الاستعادة بسبب وجود رمز نشط لنفس الكيان.');
    expect(PAGE_SRC).toContain('Cannot restore because another active barcode exists for this entity.');
    expect(PAGE_SRC).toMatch(/entity_already_has_active_barcode/);
  });

  it('maps invalid_transition and not_found errors', () => {
    expect(PAGE_SRC).toMatch(/invalid_transition/);
    expect(PAGE_SRC).toMatch(/not_found/);
  });

  it('invalidates list, summary, and detail queries after a successful action', () => {
    expect(PAGE_SRC).toMatch(/invalidateQueries\(\{ queryKey: \['admin-barcode-detail'/);
    expect(PAGE_SRC).toMatch(/invalidateQueries\(\{ queryKey: \['admin-barcode-list'\]/);
    expect(PAGE_SRC).toMatch(/invalidateQueries\(\{ queryKey: \['admin-barcode-summary'\]/);
  });

  it('does not include transfer or delete UI', () => {
    expect(PAGE_SRC).not.toMatch(/admin_transfer_barcode/);
    expect(PAGE_SRC).not.toMatch(/transferBarcodeAdmin/);
    expect(PAGE_SRC).not.toMatch(/admin_delete_barcode/);
    expect(PAGE_SRC).not.toMatch(/\.delete\(/);
  });
});