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
    // Per spec matrix: active→[freeze,archive,transfer], frozen→[restore,archive,transfer],
    // archived→[restore], revoked→[archive], else→[].
    expect(PAGE_SRC).toMatch(/case 'active':\s*return \['freeze', 'archive', 'transfer'\]/);
    expect(PAGE_SRC).toMatch(/case 'frozen':\s*return \['restore', 'archive', 'transfer'\]/);
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

  it('does not include delete or revoke UI (still no destructive actions)', () => {
    expect(PAGE_SRC).not.toMatch(/admin_delete_barcode/);
    expect(PAGE_SRC).not.toMatch(/admin_revoke_barcode/);
    expect(PAGE_SRC).not.toMatch(/\.delete\(/);
  });
});

describe('BARCODE-REGISTRY-TRANSFER-2 — admin transfer UI', () => {
  it('imports the canonical transfer wrapper (no direct RPC)', () => {
    expect(PAGE_SRC).toMatch(/transferBarcodeAdmin/);
    expect(PAGE_SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_transfer_barcode['"]/);
  });

  it('renders bilingual Transfer button label', () => {
    expect(PAGE_SRC).toContain("'نقل'");
    expect(PAGE_SRC).toContain("'Transfer'");
  });

  it('renders bilingual target user field and helper copy', () => {
    expect(PAGE_SRC).toContain('المستخدم المستهدف');
    expect(PAGE_SRC).toContain('Target user');
    expect(PAGE_SRC).toContain('أدخل معرف المستخدم UUID');
    expect(PAGE_SRC).toContain('Enter the user UUID');
  });

  it('renders bilingual transfer reason input copy', () => {
    expect(PAGE_SRC).toContain('سبب النقل');
    expect(PAGE_SRC).toContain('Transfer reason');
  });

  it('renders bilingual transfer consequence warning', () => {
    expect(PAGE_SRC).toContain(
      'سيصبح هذا الرمز غير متاح للعامة بعد النقل. يجب إصدار رمز جديد للمالك الجديد عند الحاجة.',
    );
    expect(PAGE_SRC).toContain(
      'This code will become unavailable publicly after transfer. Issue a new code for the new owner if needed.',
    );
  });

  it('calls transferBarcodeAdmin with barcodeId, targetUserId, and reason', () => {
    expect(PAGE_SRC).toMatch(/transferBarcodeAdmin\(\s*barcodeId\s*,/);
    // The mutation hands off action+reason+targetUserId
    expect(PAGE_SRC).toMatch(/action:\s*pending,\s*reason,\s*targetUserId/);
  });

  it('validates target as a UUID client-side before submit', () => {
    expect(PAGE_SRC).toMatch(/UUID_RE/);
    expect(PAGE_SRC).toMatch(/transferTargetValid/);
  });

  it('maps target_user_not_found / same_owner / invalid_transition error envelopes', () => {
    expect(PAGE_SRC).toMatch(/target_user_not_found/);
    expect(PAGE_SRC).toContain('المستخدم المستهدف غير موجود.');
    expect(PAGE_SRC).toContain('Target user was not found.');
    expect(PAGE_SRC).toMatch(/same_owner/);
    expect(PAGE_SRC).toContain('لا يمكن نقل الرمز إلى نفس المالك.');
    expect(PAGE_SRC).toContain('Cannot transfer to the same owner.');
    expect(PAGE_SRC).toMatch(/invalid_transition/);
    expect(PAGE_SRC).toContain('لا يمكن نقل الرمز من حالته الحالية.');
    expect(PAGE_SRC).toContain('This code cannot be transferred from its current status.');
  });

  it('does not access profiles table directly from the page', () => {
    expect(PAGE_SRC).not.toMatch(/from\(\s*['"]profiles['"]/);
    expect(PAGE_SRC).not.toMatch(/\.from\(\s*['"]auth\.users['"]/);
  });
});

describe('BARCODE-REGISTRY-USER-PICKER-1 — admin user picker', () => {
  it('imports adminSearchUsersForTransfer from the users module', () => {
    expect(PAGE_SRC).toMatch(/adminSearchUsersForTransfer/);
    expect(PAGE_SRC).toMatch(/from ['"]@\/modules\/users['"]/);
  });

  it('does not call the search RPC directly from the page', () => {
    expect(PAGE_SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_search_users_for_transfer['"]/);
  });

  it('does not access raw profiles / auth.users from the page', () => {
    expect(PAGE_SRC).not.toMatch(/from\(\s*['"]profiles['"]/);
    expect(PAGE_SRC).not.toMatch(/from\(\s*['"]auth\.users['"]/);
  });

  it('renders bilingual search label + placeholder', () => {
    expect(PAGE_SRC).toContain('ابحث عن المستخدم');
    expect(PAGE_SRC).toContain('Search user');
    expect(PAGE_SRC).toContain('ابحث بالاسم أو الرقم المرجعي أو الجوال');
    expect(PAGE_SRC).toContain('Search by name, reference ID, or phone');
  });

  it('debounces search input and enforces min length of 2', () => {
    // 300ms debounce timer + canSearch guard with debounced.length >= 2.
    expect(PAGE_SRC).toMatch(/setTimeout\(\(\)\s*=>\s*setDebounced/);
    expect(PAGE_SRC).toMatch(/debounced\.length\s*>=\s*2/);
  });

  it('renders empty-state and loading copy for the results list', () => {
    expect(PAGE_SRC).toContain('لم يتم العثور على مستخدمين');
    expect(PAGE_SRC).toContain('No users found');
    expect(PAGE_SRC).toContain('جارٍ البحث…');
    expect(PAGE_SRC).toContain('Searching…');
  });

  it('shows ref_id / masked_email / phone_hint in the result row', () => {
    expect(PAGE_SRC).toMatch(/u\.ref_id/);
    expect(PAGE_SRC).toMatch(/u\.masked_email/);
    expect(PAGE_SRC).toMatch(/u\.phone_hint/);
  });

  it('keeps the UUID paste fallback with strict client-side validation', () => {
    expect(PAGE_SRC).toContain('لصق UUID');
    expect(PAGE_SRC).toContain('Paste UUID');
    expect(PAGE_SRC).toMatch(/UUID_RE/);
  });

  it('selecting a search result populates targetUserId for transferBarcodeAdmin', () => {
    expect(PAGE_SRC).toMatch(/onSelect=\{\(uid\)\s*=>\s*setTargetUserId\(uid\)\}/);
    expect(PAGE_SRC).toMatch(/transferBarcodeAdmin\(\s*barcodeId\s*,/);
  });

  it('does not render raw full email/phone fields anywhere in the picker', () => {
    // Picker code must only project the *masked* fields, never `.email` / `.phone`.
    expect(PAGE_SRC).not.toMatch(/u\.email\b/);
    expect(PAGE_SRC).not.toMatch(/u\.phone\b/);
  });
});

describe('BARCODE-REGISTRY-TRANSFER-AUDIT-1 — admin transfer trail UI', () => {
  it('imports the canonical transfer-trail wrapper (no direct RPC)', () => {
    expect(PAGE_SRC).toMatch(/listBarcodeTransferTrailAdmin/);
    expect(PAGE_SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_get_barcode_transfer_trail['"]/);
  });

  it('renders bilingual "Transfer history" / "سجل النقل" section header', () => {
    expect(PAGE_SRC).toContain('سجل النقل');
    expect(PAGE_SRC).toContain('Transfer history');
  });

  it('renders bilingual empty state for transfer history', () => {
    expect(PAGE_SRC).toContain('لا توجد عمليات نقل لهذا الرمز.');
    expect(PAGE_SRC).toContain('No transfer history for this code.');
  });

  it('renders bilingual transferred-status helper copy', () => {
    expect(PAGE_SRC).toContain(
      'سيبقى الرمز القديم غير متاح، وسيتم إنشاء رمز جديد نشط مرتبط بالكيان نفسه.',
    );
    expect(PAGE_SRC).toContain(
      'The old code will remain unavailable. A new active code will be created for the same entity.',
    );
  });

  it('localizes the transferred status filter option', () => {
    expect(PAGE_SRC).toMatch(/s === 'transferred' \? bi\('منقول',\s*'Transferred'\)/);
  });

  it('uses safe masked/labelled fields for users (no raw email/phone projection)', () => {
    // Only the masked + label fields from BarcodeTransferTrailEntry should be projected.
    expect(PAGE_SRC).toMatch(/from_masked_email/);
    expect(PAGE_SRC).toMatch(/to_masked_email/);
    expect(PAGE_SRC).toMatch(/from_phone_hint/);
    expect(PAGE_SRC).toMatch(/to_phone_hint/);
    // Must not project full raw email/phone fields from trail entries.
    expect(PAGE_SRC).not.toMatch(/\.from_email\b/);
    expect(PAGE_SRC).not.toMatch(/\.to_email\b/);
    expect(PAGE_SRC).not.toMatch(/\.from_phone\b/);
    expect(PAGE_SRC).not.toMatch(/\.to_phone\b/);
    // No synthetic placeholder leak.
    expect(PAGE_SRC).not.toMatch(/@phone\.qitaat\.local/);
  });

  it('invalidates the transfer-trail query after lifecycle changes', () => {
    expect(PAGE_SRC).toMatch(
      /invalidateQueries\(\{ queryKey: \['admin-barcode-transfer-trail'/,
    );
  });

  it('keeps transferred status with no lifecycle actions and no delete/revoke', () => {
    // availableActions('transferred') falls into default → [] (already covered
    // by the lifecycle suite). Re-assert here that no destructive UI was added.
    expect(PAGE_SRC).not.toMatch(/admin_delete_barcode/);
    expect(PAGE_SRC).not.toMatch(/admin_revoke_barcode/);
    // No availableActions branch grants any action to 'transferred'.
    expect(PAGE_SRC).not.toMatch(/case 'transferred':\s*return \[/);
  });

  it('exposes the successor-issuance CTA only inside the transferred-status branch', () => {
    // CTA component exists.
    expect(PAGE_SRC).toMatch(/const SuccessorIssuer:/);
    // It is rendered only when status === 'transferred'.
    expect(PAGE_SRC).toMatch(
      /b\.status === 'transferred'[\s\S]{0,200}<SuccessorIssuer/,
    );
    // Bilingual CTA + explanation copy.
    expect(PAGE_SRC).toContain('إصدار رمز جديد للمالك الجديد');
    expect(PAGE_SRC).toContain('Issue new code for new owner');
    // Conflict mapping copy.
    expect(PAGE_SRC).toContain('يوجد رمز نشط بالفعل لهذا الكيان.');
    expect(PAGE_SRC).toContain('An active code already exists for this entity.');
  });

  it('successor flow uses canonical wrapper, not direct supabase rpc/table access', () => {
    expect(PAGE_SRC).toMatch(/issueSuccessorBarcodeAdmin/);
    // The SuccessorIssuer block must not call supabase directly.
    const block = PAGE_SRC.split('const SuccessorIssuer:')[1]?.split('const TransferTrail:')[0] ?? '';
    expect(block).not.toMatch(/supabase\.rpc\(/);
    expect(block).not.toMatch(/supabase\.from\(/);
    // Reason input + copy-link affordances are present.
    expect(block).toMatch(/Issuance reason|سبب الإصدار/);
    expect(block).toMatch(/Copy link|نسخ الرابط/);
    // Uses buildBarcodeUrl helper for public URL.
    expect(block).toMatch(/buildBarcodeUrl\(/);
  });

  it('invalidates list/detail/summary after issuing a successor (via shared invalidateAll)', () => {
    // SuccessorIssuer is wired through DetailPanel.invalidateAll, which already
    // invalidates list, detail, summary, and transfer-trail queries.
    expect(PAGE_SRC).toMatch(/<SuccessorIssuer[^>]*onChanged=\{invalidateAll\}/);
  });
});