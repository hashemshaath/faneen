import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { userNavGroups, providerNavGroups } from '@/modules/dashboard/navigation';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

const APP = read('src/App.tsx');
const HOME = read('src/components/home/v2/HomeV2.tsx');
const ADMIN_NAV = read('src/modules/admin-shell/navigation/adminNavigation.ts');
const QUOTE_DETAILS = read('src/pages/dashboard/QuoteRequestDetails.tsx');
const PROVIDER_BID = read('src/modules/opportunities/bids/ProviderBidSection.tsx');
const ADMIN_OPS = read('src/pages/admin/AdminOpportunitiesOperations.tsx');

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const flatLabels = (groups: typeof userNavGroups) =>
  groups.flatMap((g) => g.items.map((i) => i.label.ar));

describe('Opportunities Phase 13 — route + terminology guard', () => {
  it('1. canonical opportunity routes are registered', () => {
    for (const p of [
      '/dashboard/opportunities',
      '/dashboard/opportunities/assigned',
      '/dashboard/opportunities/:id',
      '/admin/opportunities',
    ]) {
      expect(APP).toContain(`path="${p}"`);
    }
  });

  it('2. legacy routes remain wired (no deletions)', () => {
    for (const p of [
      '/dashboard/provider/leads',
      '/dashboard/rfq',
      '/dashboard/rfq/inbox',
      '/dashboard/my-requests',
      '/admin/quote-requests',
      '/admin/quote-requests/:id',
      '/quote',
    ]) {
      expect(APP).toContain(`path="${p}"`);
    }
  });

  it('3. each legacy route is declared exactly once (no divergent duplicates)', () => {
    for (const p of ['/dashboard/provider/leads', '/dashboard/rfq/inbox', '/dashboard/my-requests']) {
      const occurrences = APP.match(new RegExp(`path="${p}"`, 'g')) ?? [];
      expect(occurrences.length, `route ${p} declared ${occurrences.length}x`).toBe(1);
    }
  });

  it('4. dashboards menus use opportunity terminology', () => {
    expect(flatLabels(userNavGroups)).toContain('الفرص');
    expect(flatLabels(providerNavGroups)).toContain('الفرص المسندة');
    expect(ADMIN_NAV).toMatch(/مركز عمليات الفرص|إدارة الفرص/);
  });

  it('5. homepage primary CTA uses opportunity-aligned copy', () => {
    expect(HOME).toMatch(/ابدأ فرصة|أنشئ فرصة|اطرح فرصتك/);
    expect(HOME).toMatch(/quote:\s*['"]\/quote['"]/);
  });

  it('6. RFQ / Provider Leads do not appear as visible UI on the new surfaces', () => {
    for (const src of [QUOTE_DETAILS, ADMIN_OPS, PROVIDER_BID]) {
      const code = stripComments(src);
      expect(code).not.toMatch(/>\s*RFQ\s*</);
      expect(code).not.toMatch(/صندوق RFQ/);
      expect(code).not.toMatch(/Provider Leads/i);
      expect(code).not.toMatch(/طلبات المزودين/);
    }
  });
});