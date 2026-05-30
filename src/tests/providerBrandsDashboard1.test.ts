/**
 * PROVIDER-BRANDS-DASHBOARD-1 — guards for /dashboard/brands.
 *
 * Verifies the provider Brands dashboard exposes the required panels,
 * routes only through the brands service layer, preserves public
 * approved-only visibility, and does not creep into RFQ / SLA / second
 * registries.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';
import { ROUTE_PAGE_KEYS } from '@/components/help/HelpLauncherFloating';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const read = (p: string) => readFileSync(repo(p), 'utf-8');

const PAGE = 'src/pages/dashboard/DashboardBrands.tsx';
const SERVICE = 'src/modules/brands/services/brandsService.ts';
const APP = 'src/App.tsx';
const PUBLIC_BRAND_DETAIL = 'src/pages/BrandDetail.tsx';

describe('PROVIDER-BRANDS-DASHBOARD-1 — file + route presence', () => {
  it('DashboardBrands page exists', () => {
    expect(existsSync(repo(PAGE))).toBe(true);
  });

  it('/dashboard/brands route registered in App.tsx', () => {
    expect(read(APP)).toContain('path="/dashboard/brands"');
  });

  it('HelpLauncherFloating maps /dashboard/brands → dashboard.brands', () => {
    const entry = ROUTE_PAGE_KEYS.find((e) => e.pattern === '/dashboard/brands');
    expect(entry?.pageKey).toBe('dashboard.brands');
  });

  it('contextual help registry has dashboard.brands articles', () => {
    expect(Array.isArray(contextualHelpRegistry['dashboard.brands'])).toBe(true);
    expect((contextualHelpRegistry['dashboard.brands'] ?? []).length).toBeGreaterThan(0);
  });
});

describe('PROVIDER-BRANDS-DASHBOARD-1 — service-layer isolation', () => {
  it('page imports from @/modules/brands and never raw supabase client', () => {
    const src = read(PAGE);
    expect(src).toMatch(/from ['"]@\/modules\/brands['"]/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/supabase\.rpc\(/);
  });

  it('page does not directly touch brand registry tables or admin RPCs', () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/brand_catalog|brand_audit_logs|brand_addition_requests/);
    expect(src).not.toMatch(/admin_approve_brand|admin_reject_brand|admin_archive_brand/);
  });
});

describe('PROVIDER-BRANDS-DASHBOARD-1 — required panels and CTAs', () => {
  const src = read(PAGE);

  it('renders an approved brands browser', () => {
    expect(src).toContain('approved-brands-browser');
    expect(src).toMatch(/listApprovedBrandsForProviderPicker/);
  });

  it('renders the my-linked-brands panel via listMyProviderBrandLinks', () => {
    expect(src).toContain('my-linked-brands-panel');
    expect(src).toMatch(/listMyProviderBrandLinks/);
  });

  it('renders the my-brand-requests panel via listMyBrandRequests', () => {
    expect(src).toContain('my-brand-requests-panel');
    expect(src).toMatch(/listMyBrandRequests/);
  });

  it('exposes a "request new brand" CTA wired to createMyBrandRequest', () => {
    expect(src).toContain('request-new-brand-cta');
    expect(src).toMatch(/createMyBrandRequest/);
  });

  it('uses DashboardEmptyState for empty states', () => {
    expect(src).toMatch(/DashboardEmptyState/);
  });

  it('links to the public brand page via /brands/:slug', () => {
    expect(src).toMatch(/\/brands\/\$\{[^}]+slug\}/);
  });

  it('uses ref_id / slug labels (no raw uuid primary labels)', () => {
    expect(src).toMatch(/ref_id/);
    expect(src).toMatch(/slug/);
  });
});

describe('PROVIDER-BRANDS-DASHBOARD-1 — link/unlink wrappers exist', () => {
  const svc = read(SERVICE);

  it('brandsService exports the provider dashboard aliases', () => {
    for (const name of [
      'listApprovedBrandsForProviderPicker',
      'linkBrandToMyServiceOrBusiness',
      'unlinkMyProviderBrand',
      'createMyBrandRequest',
      'getBrandFilterOptions',
      'listMyProviderBrandLinks',
      'listMyBrandRequests',
    ]) {
      expect(svc).toMatch(new RegExp(`export (?:const|async function) ${name}\\b`));
    }
  });

  it('getBrandFilterOptions reads only the approved brands_public view', () => {
    expect(svc).toMatch(
      /getBrandFilterOptions[\s\S]{0,400}brands_public/,
    );
  });
});

describe('PROVIDER-BRANDS-DASHBOARD-1 — public visibility unchanged', () => {
  it('public BrandDetail still shows only verified provider links', () => {
    const src = read(PUBLIC_BRAND_DETAIL);
    expect(src).toMatch(/listPublicProvidersForBrand/);
    expect(src).not.toMatch(/listMyProviderBrandLinks/);
  });

  it('listPublicProvidersForBrand filters by verified server-side', () => {
    const svc = read(SERVICE);
    expect(svc).toMatch(
      /listPublicProvidersForBrand[\s\S]{0,500}authorization_status[\s\S]{0,40}verified/,
    );
  });

  it('provider page does not expose pending/rejected provider links publicly', () => {
    const src = read(PAGE);
    // page may show own pending/rejected statuses, but must not call public provider listing
    expect(src).not.toMatch(/listPublicProvidersForBrand/);
  });
});

describe('PROVIDER-BRANDS-DASHBOARD-1 — scope discipline', () => {
  const src = read(PAGE);

  it('no RFQ brand picker added', () => {
    expect(src).not.toMatch(/rfq|RFQ/);
  });

  it('no brand SLA cron added in page', () => {
    expect(src).not.toMatch(/\bSLA\b|\bcron\b/);
  });

  it('no inventory/accounting/supplier portal scope creep', () => {
    expect(src).not.toMatch(/inventory|accounting|supplier[- ]?portal/i);
  });

  it('provider cannot call approve / reject RPCs from the page', () => {
    expect(src).not.toMatch(/admin_approve|admin_reject|approve_brand_addition|reject_brand_addition/);
  });
});

describe('PROVIDER-BRANDS-DASHBOARD-1 — brands isolation audit script intact', () => {
  it('audit script exists and lists business_service_brands as guarded', () => {
    const audit = read('scripts/brands-isolation-audit.mjs');
    expect(audit).toMatch(/business_service_brands/);
    expect(audit).toMatch(/brands_public/);
  });
});