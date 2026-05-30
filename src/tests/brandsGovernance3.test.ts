/**
 * BRANDS-GOVERNANCE-3 — Phase C public + provider integration guards.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';
import { ROUTE_PAGE_KEYS } from '@/components/help/HelpLauncherFloating';
import {
  normalizeArabicBrandName,
  normalizeEnglishBrandName,
  generateBrandSlugCandidate,
} from '@/modules/brands';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const read = (p: string) => readFileSync(repo(p), 'utf-8');

describe('BRANDS-GOVERNANCE-3 — files exist', () => {
  it.each([
    'src/pages/BrandsCatalog.tsx',
    'src/pages/BrandDetail.tsx',
    'src/pages/PrivateSectorsCatalog.tsx',
    'src/pages/PrivateSectorDetail.tsx',
    'src/pages/dashboard/DashboardBrands.tsx',
    'src/pages/admin/AdminBrands.tsx',
    'src/pages/admin/AdminBrandDetail.tsx',
    'src/pages/admin/AdminBrandRequests.tsx',
    'src/modules/brands/services/brandsService.ts',
    'scripts/brands-isolation-audit.mjs',
  ])('%s exists', (p) => {
    expect(existsSync(repo(p))).toBe(true);
  });
});

describe('BRANDS-GOVERNANCE-3 — routes registered', () => {
  const APP = read('src/App.tsx');
  it.each([
    '/brands',
    '/brands/:slug',
    '/private-sectors',
    '/private-sectors/:slug',
    '/dashboard/brands',
    '/admin/brands',
    '/admin/brands/:id',
    '/admin/brand-requests',
  ])('route %s is in App.tsx', (path) => {
    expect(APP).toContain(`path="${path}"`);
  });
});

describe('BRANDS-GOVERNANCE-3 — service-layer isolation', () => {
  it.each([
    'src/pages/BrandsCatalog.tsx',
    'src/pages/BrandDetail.tsx',
    'src/pages/dashboard/DashboardBrands.tsx',
  ])('%s imports from @/modules/brands and never the raw supabase client', (p) => {
    const src = read(p);
    expect(src).toMatch(/from ['"]@\/modules\/brands['"]/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
  });
});

describe('BRANDS-GOVERNANCE-3 — public visibility / sitemap', () => {
  it('public BrandsCatalog only calls listApprovedBrands (no admin wrappers)', () => {
    const src = read('src/pages/BrandsCatalog.tsx');
    expect(src).toMatch(/listApprovedBrands/);
    expect(src).not.toMatch(/adminListBrands|adminApproveBrand|adminRejectBrand/);
  });
  it('public BrandDetail resolves brands via getBrandBySlug (brands_public view)', () => {
    const src = read('src/pages/BrandDetail.tsx');
    expect(src).toMatch(/getBrandBySlug/);
    expect(src).not.toMatch(/adminGetBrand|brand_addition_requests|brand_audit_logs/);
  });
  it('public BrandDetail renders verified provider links only', () => {
    const src = read('src/pages/BrandDetail.tsx');
    expect(src).toMatch(/listPublicProvidersForBrand/);
  });
  it('listPublicProvidersForBrand filters by authorization_status=verified server-side', () => {
    const src = read('src/modules/brands/services/brandsService.ts');
    expect(src).toMatch(/listPublicProvidersForBrand[\s\S]{0,500}authorization_status[\s\S]{0,40}verified/);
  });
  it('sitemap edge function sources brands from brands_public view', () => {
    const src = read('supabase/functions/sitemap/index.ts');
    const brandsBlock = src.split('type === "brands"')[1]?.split('else if')[0] ?? '';
    expect(brandsBlock).toMatch(/brands_public/);
    expect(brandsBlock).not.toMatch(/private_sectors_public/);
  });
});

describe('BRANDS-GOVERNANCE-3 — admin pages stay private', () => {
  it('admin brand routes are mounted under requireAdmin ProtectedRoute', () => {
    const APP = read('src/App.tsx');
    for (const path of ['/admin/brands', '/admin/brands/:id', '/admin/brand-requests']) {
      const idx = APP.indexOf(`path="${path}"`);
      expect(idx, `route ${path} missing`).toBeGreaterThan(-1);
      const slice = APP.slice(idx, idx + 240);
      expect(slice).toMatch(/requireAdmin/);
    }
  });
});

describe('BRANDS-GOVERNANCE-3 — contextual help', () => {
  const expected = [
    'public.brands',
    'public.brand-detail',
    'dashboard.brands',
    'admin.brand-requests',
    'admin.brand-detail',
  ];
  it.each(expected)('%s mapped in contextualHelpRegistry', (key) => {
    expect(contextualHelpRegistry[key]).toBeDefined();
    expect(contextualHelpRegistry[key].length).toBeGreaterThan(0);
  });
  it.each(expected)('%s reachable via HelpLauncherFloating route map', (key) => {
    expect(ROUTE_PAGE_KEYS.some((e) => e.pageKey === key)).toBe(true);
  });
});

describe('BRANDS-GOVERNANCE-3 — duplicate normalisation', () => {
  it('strips Arabic "شركة" prefix and trade suffixes', () => {
    expect(normalizeArabicBrandName('شركة الفا للتجارة')).toBe('الفا');
    expect(normalizeArabicBrandName('مصنع بيتا الصناعية')).toBe('بيتا');
  });
  it('treats hamza variants as the same letter', () => {
    expect(normalizeArabicBrandName('ألفا')).toBe(normalizeArabicBrandName('الفا'));
  });
  it('strips English Co/Ltd/Inc suffixes and lowercases', () => {
    expect(normalizeEnglishBrandName('Alpha Industries LLC')).toBe('alpha industries');
  });
  it('generates slugs without raw whitespace or unsafe punctuation', () => {
    const slug = generateBrandSlugCandidate('Alpha Industries', 'ألفا');
    expect(slug).toMatch(/^[a-z0-9\-\u0600-\u06FF]+$/);
    expect(slug).not.toMatch(/\s/);
  });
});

describe('BRANDS-GOVERNANCE-3 — scope discipline', () => {
  it('brands service does not pull inventory/accounting/supplier-portal concepts', () => {
    const src = read('src/modules/brands/services/brandsService.ts');
    expect(src).not.toMatch(/inventory_/i);
    expect(src).not.toMatch(/accounting_/i);
    expect(src).not.toMatch(/supplier_portal/i);
  });
});

describe('BRANDS-GOVERNANCE-3 — closeout guards', () => {
  const APP = read('src/App.tsx');
  it('/:username catch-all is registered after /brands routes (no shadowing)', () => {
    const brandsIdx = APP.indexOf('path="/brands"');
    const slugIdx = APP.indexOf('path="/brands/:slug"');
    const userIdx = APP.indexOf('path="/:username"');
    expect(brandsIdx).toBeGreaterThan(-1);
    expect(slugIdx).toBeGreaterThan(-1);
    expect(userIdx).toBeGreaterThan(brandsIdx);
    expect(userIdx).toBeGreaterThan(slugIdx);
  });
  it('legacy private-sectors routes remain accessible', () => {
    expect(APP).toContain('path="/private-sectors"');
    expect(APP).toContain('path="/private-sectors/:slug"');
  });
  it('sitemap function never queries brand_catalog directly (only brands_public)', () => {
    const src = read('supabase/functions/sitemap/index.ts');
    expect(src).not.toMatch(/from\(['"]brand_catalog['"]\)/);
    expect(src).toMatch(/brands_public/);
  });
  it('sitemap function does not expose admin/request brand routes', () => {
    const src = read('supabase/functions/sitemap/index.ts');
    expect(src).not.toMatch(/\/admin\/brand/);
    expect(src).not.toMatch(/brand-requests/);
  });
  it('public brand pages do not import the raw supabase client', () => {
    for (const p of ['src/pages/BrandsCatalog.tsx', 'src/pages/BrandDetail.tsx']) {
      const src = read(p);
      expect(src, p).not.toMatch(/@\/integrations\/supabase\/client/);
    }
  });
  it('public BrandDetail never renders pending/draft/rejected brands (relies on brands_public)', () => {
    const src = read('src/pages/BrandDetail.tsx');
    // public page must not branch on non-approved statuses
    expect(src).not.toMatch(/status\s*===\s*['"]pending['"]/);
    expect(src).not.toMatch(/status\s*===\s*['"]rejected['"]/);
    expect(src).not.toMatch(/status\s*===\s*['"]draft['"]/);
  });
});