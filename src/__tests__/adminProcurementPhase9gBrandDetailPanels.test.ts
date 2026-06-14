/**
 * ADMIN REDESIGN PHASE 9G — guard test.
 * Asserts that brand-detail panel extraction stayed presentational and that
 * no forbidden surfaces were touched.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PANEL_DIR = resolve(__dirname, '../components/admin/procurement/brand-detail');
const PAGE = resolve(__dirname, '../pages/admin/AdminBrandDetail.tsx');
const APP = resolve(__dirname, '../App.tsx');

const PANELS = [
  'BrandDetailOverviewPanel',
  'BrandClaimsPanel',
  'BrandEquivalencePanel',
  'BrandProvidersPanel',
  'BrandAuditPanel',
];

function read(p: string) { return readFileSync(p, 'utf8'); }

describe('Phase 9G — brand-detail panel extraction', () => {
  it('1-5. each panel file exists', () => {
    for (const name of PANELS) {
      const p = resolve(PANEL_DIR, `${name}.tsx`);
      expect(existsSync(p), `missing panel: ${name}`).toBe(true);
    }
  });

  it('6. AdminBrandDetail.tsx adopts all five panels', () => {
    const src = read(PAGE);
    for (const name of PANELS) {
      expect(src.includes(`<${name}`), `page does not render ${name}`).toBe(true);
    }
    expect(src.includes("from '@/components/admin/procurement/brand-detail'")).toBe(true);
  });

  it('7. panels do not import Supabase', () => {
    for (const name of PANELS) {
      const src = read(resolve(PANEL_DIR, `${name}.tsx`));
      expect(src.includes('@/integrations/supabase')).toBe(false);
      expect(src.includes('supabase-js')).toBe(false);
    }
  });

  it('8. panels contain no queries or mutations', () => {
    for (const name of PANELS) {
      const src = read(resolve(PANEL_DIR, `${name}.tsx`));
      expect(src.includes('useQuery')).toBe(false);
      expect(src.includes('useMutation')).toBe(false);
      expect(src.includes('useQueryClient')).toBe(false);
    }
  });

  it('9. panels do not import executive write services', () => {
    const forbidden = [
      'adminApproveBrand', 'adminRejectBrand', 'adminMergeBrands',
      'adminUpdateBrand', 'adminApproveProviderBrandLink',
      'adminRejectProviderBrandLink', 'adminCreateProviderBrandLink',
      'adminLinkBrandToAllServices', 'adminSetProviderBrandLinkProducts',
      'adminRemoveProviderBrandLinkProduct', 'adminCreateBrandProduct',
      'adminUpdateBrandProduct', 'adminDeleteBrandProduct',
      'adminApproveBrandProductRequest', 'adminRejectBrandProductRequest',
    ];
    for (const name of PANELS) {
      const src = read(resolve(PANEL_DIR, `${name}.tsx`));
      for (const sym of forbidden) {
        expect(src.includes(sym), `${name} imports forbidden write API: ${sym}`).toBe(false);
      }
    }
  });

  it('10. panels contain no hardcoded hex colors', () => {
    for (const name of PANELS) {
      const src = read(resolve(PANEL_DIR, `${name}.tsx`));
      expect(/#[0-9a-fA-F]{3,8}\b/.test(src), `${name} contains a hex color`).toBe(false);
    }
  });

  it('11. panels do not use any/as any/ts-ignore/eslint-disable', () => {
    for (const name of PANELS) {
      const src = read(resolve(PANEL_DIR, `${name}.tsx`));
      expect(/\bas any\b/.test(src)).toBe(false);
      expect(/:\s*any\b/.test(src)).toBe(false);
      expect(src.includes('@ts-ignore')).toBe(false);
      expect(src.includes('@ts-expect-error')).toBe(false);
      expect(src.includes('eslint-disable')).toBe(false);
    }
  });

  it('12. App.tsx routes were not modified for brand-detail panels', () => {
    const src = read(APP);
    // Pages should still own the route exactly as before.
    expect(src.includes('AdminBrandDetail')).toBe(true);
    // Panels are not routes.
    for (const name of PANELS) {
      expect(src.includes(name)).toBe(false);
    }
  });

  it('13. forbidden modules untouched (sanity: panels do not import them)', () => {
    const forbiddenPaths = [
      '@/modules/quotes',
      '@/modules/leads/services',
    ];
    for (const name of PANELS) {
      const src = read(resolve(PANEL_DIR, `${name}.tsx`));
      for (const fp of forbiddenPaths) {
        expect(src.includes(fp), `${name} imports forbidden module: ${fp}`).toBe(false);
      }
    }
  });

  it('14. panels do not import quoteRequests / quoteOperationsAggregation / providerCommercialConfig', () => {
    const forbidden = [
      '@/lib/quoteRequests',
      '@/lib/quoteOperationsAggregation',
      '@/lib/providerCommercialConfig',
    ];
    for (const name of PANELS) {
      const src = read(resolve(PANEL_DIR, `${name}.tsx`));
      for (const fp of forbidden) {
        expect(src.includes(fp)).toBe(false);
      }
    }
  });
});