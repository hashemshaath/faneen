import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { userNavGroups, providerNavGroups } from '@/modules/dashboard/navigation';

const ROOT = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');
const ADMIN_NAV = readFileSync(
  resolve(ROOT, 'src/modules/admin-shell/navigation/adminNavigation.ts'),
  'utf8',
);
const QUOTE_DETAILS = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/QuoteRequestDetails.tsx'),
  'utf8',
);

const flatLabels = (groups: typeof userNavGroups) =>
  groups.flatMap((g) => g.items.map((i) => i.label.ar));

describe('Opportunities Phase 12 — navigation alignment', () => {
  it('1. user menu surfaces "الفرص"', () => {
    expect(flatLabels(userNavGroups)).toContain('الفرص');
  });
  it('2. provider menu surfaces "الفرص المسندة"', () => {
    expect(flatLabels(providerNavGroups)).toContain('الفرص المسندة');
  });
  it('3. admin nav surfaces "مركز عمليات الفرص" or "إدارة الفرص"', () => {
    expect(ADMIN_NAV).toMatch(/مركز عمليات الفرص|إدارة الفرص/);
  });
  it('4. opportunity details page exposes back link to /dashboard/my-requests', () => {
    expect(QUOTE_DETAILS).toMatch(/\/dashboard\/my-requests/);
    expect(QUOTE_DETAILS).toContain('تفاصيل الفرصة');
  });
  it('5. legacy routes remain registered', () => {
    for (const p of [
      '/dashboard/provider/leads',
      '/dashboard/rfq',
      '/dashboard/rfq/inbox',
      '/admin/quote-requests',
      '/admin/quote-requests/:id',
    ]) {
      expect(APP).toContain(`path="${p}"`);
    }
  });
  it('6. canonical opportunity routes remain registered', () => {
    for (const p of [
      '/dashboard/opportunities',
      '/dashboard/opportunities/assigned',
      '/dashboard/opportunities/:id',
      '/admin/opportunities',
    ]) {
      expect(APP).toContain(`path="${p}"`);
    }
  });
});