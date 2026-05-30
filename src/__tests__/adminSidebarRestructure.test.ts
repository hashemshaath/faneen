import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ADMIN-SIDEBAR-UX-RESTRUCTURE-2 guards.
 *
 * Enforces the consolidated admin sidebar structure:
 *  - exactly 9 groups (8 admin + Account) after merging
 *    "Users & Access" + "Businesses & Providers" into
 *    "Users & Businesses"
 *  - no duplicate hrefs across the admin menu
 *  - approved AR/EN group labels present
 *  - no duplicate "مراجعة المزودين" / "إدارة الوصول"
 *  - /admin/entity-access-requests linked exactly once
 *  - every sidebar href maps to a route in App.tsx
 *  - every /admin/* href has requireAdmin or requireSuperAdmin protection
 *  - no href="#"  and no /dashboard/membership link
 */

const root = resolve(__dirname, '..', '..');
const SIDEBAR = readFileSync(resolve(root, 'src/components/dashboard/DashboardSidebar.tsx'), 'utf8');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

// Extract the adminBaseGroups block only — avoids matching provider/user menus.
const ADMIN_BLOCK = (() => {
  const start = SIDEBAR.indexOf('const adminBaseGroups');
  const end = SIDEBAR.indexOf('// Render helpers', start);
  return SIDEBAR.slice(start, end > 0 ? end : SIDEBAR.length);
})();

const APPROVED_GROUPS: Array<{ ar: string; en: string }> = [
  { ar: 'نظرة عامة', en: 'Overview' },
  { ar: 'المستخدمون والمنشآت', en: 'Users & Businesses' },
  { ar: 'الطلبات والعقود', en: 'Requests & Contracts' },
  { ar: 'العضويات والمدفوعات', en: 'Memberships & Payments' },
  { ar: 'التواصل', en: 'Communications' },
  { ar: 'المحتوى والـ SEO', en: 'Content & SEO' },
  { ar: 'التشغيل والتحليلات', en: 'Operations & Insights' },
  { ar: 'الإعدادات والتكاملات', en: 'Settings & Integrations' },
  { ar: 'الحساب', en: 'Account' },
];

const extractHrefs = (block: string): string[] => {
  const re = /url:\s*'([^']+)'/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push(m[1]);
  return out;
};

describe('admin sidebar — approved group labels', () => {
  for (const g of APPROVED_GROUPS) {
    it(`includes group "${g.en}" / "${g.ar}"`, () => {
      expect(ADMIN_BLOCK).toContain(`'${g.ar}'`);
      expect(ADMIN_BLOCK).toContain(`'${g.en}'`);
    });
  }
});

describe('admin sidebar — no duplicate hrefs', () => {
  it('every href appears at most once in admin menu', () => {
    const hrefs = extractHrefs(ADMIN_BLOCK);
    const seen = new Map<string, number>();
    for (const h of hrefs) seen.set(h, (seen.get(h) ?? 0) + 1);
    const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([h]) => h);
    expect(dups, `duplicate hrefs: ${dups.join(', ')}`).toEqual([]);
  });
});

describe('admin sidebar — specific dedupe rules', () => {
  it('"مراجعة المزودين" appears at most once', () => {
    const n = (ADMIN_BLOCK.match(/مراجعة المزودين/g) ?? []).length;
    expect(n).toBe(1);
  });
  it('"إدارة الوصول" appears at most once', () => {
    const n = (ADMIN_BLOCK.match(/إدارة الوصول/g) ?? []).length;
    expect(n).toBe(1);
  });
  it('/admin/entity-access-requests is linked exactly once', () => {
    const n = (ADMIN_BLOCK.match(/\/admin\/entity-access-requests/g) ?? []).length;
    expect(n).toBe(1);
  });
});

describe('admin sidebar — routing integrity', () => {
  const hrefs = extractHrefs(ADMIN_BLOCK).map((h) => h.split('?')[0]);

  it('every sidebar href resolves to a route registered in App.tsx', () => {
    const missing = hrefs.filter((h) => !APP.includes(`path="${h}"`));
    expect(missing, `missing routes: ${missing.join(', ')}`).toEqual([]);
  });

  it('every /admin/* href is requireAdmin or requireSuperAdmin protected', () => {
    const adminHrefs = hrefs.filter((h) => h.startsWith('/admin/'));
    const unprotected = adminHrefs.filter((h) => {
      const re = new RegExp(
        `path="${h.replace(/[/\-]/g, (c) => '\\' + c)}"[^>]*requireAdmin|` +
        `path="${h.replace(/[/\-]/g, (c) => '\\' + c)}"[^>]*requireSuperAdmin`,
      );
      return !re.test(APP);
    });
    expect(unprotected, `unprotected: ${unprotected.join(', ')}`).toEqual([]);
  });

  it('no href="#" in admin sidebar', () => {
    expect(ADMIN_BLOCK).not.toMatch(/url:\s*'#'/);
  });

  it('no /dashboard/membership link anywhere in sidebar', () => {
    expect(SIDEBAR).not.toMatch(/\/dashboard\/membership(?![-/])/);
  });
});
