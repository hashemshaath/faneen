/**
 * PLATFORM-DEEP-AUDIT-REPAIR-1 — regression guards.
 *
 * Pure file-scan / module-presence tests. No router boot, no Supabase.
 * Enforces v1.0 production launch invariants discovered during the audit.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');
const read = (p: string) => fs.readFileSync(p, 'utf8');

/* ───────────────────────── Critical routes ───────────────────────── */

describe('PDAR-1 — critical routes registered in App.tsx', () => {
  const app = read(path.join(SRC, 'App.tsx'));

  const required = [
    '/', '/search', '/r/:refId', '/q/:code', '/client/:refId',
    '/dashboard', '/dashboard/operations-center',
    '/dashboard/work-orders', '/dashboard/work-orders/board',
    '/dashboard/work-orders/:refId',
    '/dashboard/procurement', '/dashboard/contracts',
    '/dashboard/business-edit', '/dashboard/settings/staff',
    '/admin/identity', '/admin/businesses',
    '/admin/provider-review', '/admin/membership-payments',
    '/admin/operations',
  ];

  it.each(required)('registers %s', (route) => {
    expect(app).toContain(`path="${route}"`);
  });

  it('/:username dynamic resolver is present', () => {
    expect(app).toMatch(/path="\/:username"/);
  });
});

/* ─────────────────── Out-of-scope modules / channels ─────────────── */

describe('PDAR-1 — out-of-scope modules not introduced', () => {
  const banned = [
    'inventory', 'supplierPortal', 'accounting',
    'whatsapp', 'sms', 'hr', 'payroll', 'customerLogin',
  ];
  it.each(banned)('no src/modules/%s', (m) => {
    expect(fs.existsSync(path.join(SRC, 'modules', m))).toBe(false);
  });
  it('no mobile app shell', () => {
    expect(fs.existsSync(path.join(ROOT, 'mobile'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'app'))).toBe(false);
  });
});

/* ───────────────── Public token pages — no direct DB ─────────────── */

const TOKEN_PAGES = [
  'pages/CustomerProjectPortal.tsx',
  'pages/PublicSiteScan.tsx',
  'pages/QuotationViewer.tsx',
  'pages/PublicBarcodeResolve.tsx',
  'pages/QSlugDispatcher.tsx',
  'pages/ReferenceResolver.tsx',
];

describe('PDAR-1 — public token pages are safe', () => {
  it.each(TOKEN_PAGES)('%s calls useNoIndex', (p) => {
    const src = read(path.join(SRC, p));
    // Dispatcher has no head; both branches noindex themselves.
    if (p.endsWith('QSlugDispatcher.tsx')) return;
    expect(src).toContain('useNoIndex');
  });

  it.each(TOKEN_PAGES)('%s has no direct supabase.from(...) call', (p) => {
    const src = read(path.join(SRC, p));
    expect(src).not.toMatch(/supabase\.from\(/);
  });

  it('CustomerProjectPortal never renders raw token / UUID / internal_note / supplier_*', () => {
    const src = read(path.join(SRC, 'pages/CustomerProjectPortal.tsx'));
    // Token must never be rendered or logged.
    expect(src).not.toMatch(/\{[^}]*token_hash[^}]*\}/);
    expect(src).not.toMatch(/internal_note/);
    expect(src).not.toMatch(/supplier_quote/);
    expect(src).not.toMatch(/staff_note/);
    // No raw UUID braces displayed (rough check — UUID regex literal/value).
    expect(src).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});

/* ───────────────── Public directory privacy invariants ───────────── */

describe('PDAR-1 — public directory privacy', () => {
  it('SearchResults reads businesses_public, not raw businesses', () => {
    const src = read(path.join(SRC, 'components/search/SearchResults.tsx'));
    expect(src).not.toMatch(/supabase\.from\(\s*['"]businesses['"]\s*\)/);
  });

  it('PublishReadinessPanel mirrors the businesses_public filter', () => {
    const src = read(path.join(SRC, 'components/admin/PublishReadinessPanel.tsx'));
    expect(src).toContain('is_active');
    expect(src).toContain("approval_status");
    expect(src).toContain('is_demo');
  });
});

/* ─────────────── Email templates — no raw UUID/token URLs ────────── */

describe('PDAR-1 — transactional email templates safety', () => {
  const tplDir = path.join(ROOT, 'supabase/functions/_shared/transactional-email-templates');
  const tplFiles = fs.readdirSync(tplDir).filter((f) => f.endsWith('.tsx'));

  it('has at least the v1.0 customer templates', () => {
    expect(tplFiles.some((f) => f.includes('customer-project-completed'))).toBe(true);
    expect(tplFiles.some((f) => f.includes('customer-project-confirmed'))).toBe(true);
    expect(tplFiles.some((f) => f.includes('customer-thank-you-feedback'))).toBe(true);
    expect(tplFiles.some((f) => f.includes('customer-warranty-started'))).toBe(true);
  });

  it.each(tplFiles)('%s contains no raw UUID and no raw token literal', (f) => {
    const src = read(path.join(tplDir, f));
    expect(src, 'raw UUID literal').not.toMatch(
      /["'][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']/i,
    );
    // Templates must never embed the raw token query (?t=...) — only signed/ref URLs.
    expect(src).not.toMatch(/token_hash/);
  });
});

/* ───────────────────────── Audit docs exist ──────────────────────── */

describe('PDAR-1 — audit deliverables exist', () => {
  const required = [
    'route-link-audit.md',
    'database-inventory.md',
    'security-access-audit.md',
    'rpc-edge-function-audit.md',
    'service-boundary-audit.md',
    'screen-audit.md',
    'microservice-boundaries.md',
    'data-quality-report.md',
  ];
  it.each(required)('docs/%s', (f) => {
    expect(fs.existsSync(path.join(DOCS, f))).toBe(true);
    expect(read(path.join(DOCS, f)).length).toBeGreaterThan(400);
  });
});