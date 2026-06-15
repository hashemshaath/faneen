/**
 * ADMIN UX RECONSOLIDATION PHASE 10 — Settings Center guard.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const HUB = path.join(ROOT, 'pages/admin/AdminSettingsCenter.tsx');
const CENTER_DIR = path.join(ROOT, 'components/admin/centers/settings');
const APP_TSX = path.join(ROOT, 'App.tsx');

const CENTER_FILES = [
  'SettingsOverviewLanding.tsx',
  'IdentityLanding.tsx',
  'NotificationsLanding.tsx',
  'SecurityLanding.tsx',
  'AdvancedLanding.tsx',
  '_landingShared.tsx',
];

const read = (p: string) => fs.readFileSync(p, 'utf8');
const hub = () => read(HUB);
const app = () => read(APP_TSX);
const center = (f: string) => read(path.join(CENTER_DIR, f));

describe('Phase 10 — Admin Settings Center', () => {
  it('1. /admin/settings is wired to AdminSettingsCenter and uses TabbedShell', () => {
    expect(app()).toMatch(/path="\/admin\/settings"\s+element=\{[^}]*AdminSettingsCenter/);
    expect(hub()).toMatch(/TabbedShell/);
  });

  it('2. Settings Center declares all required tab keys', () => {
    const src = hub();
    for (const key of ['overview', 'general', 'branding', 'identity', 'integrations', 'notifications', 'security', 'advanced']) {
      expect(src, `missing tab key=${key}`).toMatch(new RegExp(`key:\\s*['"]${key}['"]`));
    }
  });

  it('3-6. Legacy settings routes still resolve (page or redirect)', () => {
    const src = app();
    for (const r of [
      '/admin/settings',
      '/admin/system-settings',
      '/admin/branding',
      '/admin/system/identity',
      '/admin/identity',
      '/admin/integrations',
      '/admin/analytics-settings',
      '/admin/api-settings',
    ]) {
      expect(src.includes(`path="${r}"`), `route missing: ${r}`).toBe(true);
    }
  });

  it('7. No legacy settings route is deleted without a redirect', () => {
    const src = app();
    for (const r of ['/admin/branding', '/admin/analytics-settings', '/admin/api-settings']) {
      const line = src.split('\n').find((l) => l.includes(`path="${r}"`)) || '';
      expect(line.includes('Navigate to='), `route ${r} must redirect`).toBe(true);
    }
  });

  it('8. Center landings never import Supabase', () => {
    for (const f of CENTER_FILES) {
      const src = center(f);
      expect(src.includes('@/integrations/supabase'), `${f} imports supabase`).toBe(false);
      expect(src.includes('supabase-js'), `${f} imports supabase-js`).toBe(false);
    }
    expect(hub().includes('@/integrations/supabase')).toBe(false);
  });

  it('9. Center landings contain no queries or mutations', () => {
    for (const f of CENTER_FILES) {
      const src = center(f);
      for (const t of ['useQuery(', 'useMutation(', 'useInfiniteQuery(', '.from(', '.rpc(']) {
        expect(src.includes(t), `${f} contains ${t}`).toBe(false);
      }
    }
  });

  it('10. Center landings do not import executive services', () => {
    const forbidden = [
      '@/services/', '@/modules/', 'businessService', 'brandingService',
    ];
    for (const f of CENTER_FILES) {
      const src = center(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} imports ${needle}`).toBe(false);
      }
    }
  });

  it('11. Hub is presentational — no DB/RLS/RPC/edge wiring', () => {
    const src = hub();
    expect(src.includes('@/integrations/supabase')).toBe(false);
    expect(src.includes('supabase/migrations')).toBe(false);
    expect(src.includes('.rpc(')).toBe(false);
    expect(src.includes('supabase/functions')).toBe(false);
  });

  it('12. Branding / identity / favicon / notification dispatch surfaces untouched by center', () => {
    const all = [hub(), ...CENTER_FILES.map((f) => center(f))];
    for (const src of all) {
      for (const needle of [
        'BrandFaviconApplier',
        'IdentityTokensApplier',
        'ThemeApplier',
        'updateBranding(',
        'saveBranding(',
        'sendNotification(',
      ]) {
        expect(src.includes(needle), `unexpected coupling: ${needle}`).toBe(false);
      }
    }
  });

  it('13. Public route surfaces are untouched by the center', () => {
    for (const src of [hub(), ...CENTER_FILES.map((f) => center(f))]) {
      expect(src.includes('/businesses/')).toBe(false);
      expect(src.includes('/sectors/')).toBe(false);
    }
  });

  it('14. No any/ts-ignore/ts-expect-error/eslint-disable in new files', () => {
    for (const f of CENTER_FILES) {
      const src = center(f);
      expect(/\bas\s+any\b/.test(src), `${f} as any`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} :any`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f}`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f}`).toBe(false);
      expect(src.includes('eslint-disable'), `${f}`).toBe(false);
    }
    const h = hub();
    expect(/\bas\s+any\b/.test(h)).toBe(false);
    expect(/:\s*any\b/.test(h)).toBe(false);
  });

  it('15. No hardcoded hex colors in new files', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of CENTER_FILES) {
      expect(hex.test(center(f)), `${f} contains hex color`).toBe(false);
    }
    expect(hex.test(hub())).toBe(false);
  });
});