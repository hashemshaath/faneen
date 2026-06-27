/**
 * CONTRACT TEMPLATE CONVERSION CTA PHASE 3
 *
 * Each template surfaces a primary quote CTA, a providers CTA, a
 * register-business CTA, and an auth-gated create-contract CTA.
 * Sector slugs are passed via `?sector=`, and the create-contract
 * CTA targets `/contracts/request` which is mounted behind
 * `ProtectedRoute` in App.tsx (no public contract creation surface).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONTRACT_TEMPLATES } from '@/pages/ContractTemplates';
import { resolveQuoteSectorFromUrl } from '@/lib/sectors-seo';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('Phase 3 — sector slug wiring', () => {
  it.each(CONTRACT_TEMPLATES.map((t) => [t.slug, t.quote_sector]))(
    'template %s exposes a quote_sector (%s) that resolves to a canonical sector',
    (_slug, qs) => {
      expect(qs).toBeTruthy();
      expect(resolveQuoteSectorFromUrl(qs)).not.toBeNull();
    },
  );
});

describe('Phase 3 — CTA wiring on the detail page', () => {
  const src = read('src/pages/ContractTemplates.tsx');

  it('renders quote CTA with ?sector= passed through', () => {
    expect(src).toMatch(/to=\{`\/quote\?sector=\$\{template\.quote_sector\}`\}/);
  });

  it('renders providers CTA with ?sector= passed through', () => {
    expect(src).toMatch(/to=\{`\/search\?sector=\$\{template\.quote_sector\}`\}/);
  });

  it('renders register-business CTA pointing to /register-entity', () => {
    expect(src).toMatch(/to="\/register-entity"/);
  });

  it('renders auth-gated create-contract CTA pointing to /contracts/request', () => {
    expect(src).toMatch(/to="\/contracts\/request"/);
  });

  it('does not link to any unprotected contract-creation surface', () => {
    expect(src).not.toMatch(/to="\/contracts\/new"/);
    expect(src).not.toMatch(/to="\/contracts\/create"/);
    expect(src).not.toMatch(/to=\{`\/contracts\/[a-f0-9-]{8,}/i);
  });

  it('does not introduce tracking that leaks user/contract identifiers', () => {
    expect(src).not.toMatch(/contract_id|contractId/);
    expect(src).not.toMatch(/user_id|userId/);
    expect(src).not.toMatch(/service_role/i);
  });
});

describe('Phase 3 — contract routes remain protected & unindexed', () => {
  const app = read('src/App.tsx');
  const req = read('src/pages/contracts/RequestContractPage.tsx');

  it('/contracts, /contracts/request and /contracts/:id are wrapped in ProtectedRoute', () => {
    expect(app).toMatch(/path="\/contracts"[^>]*element=\{<ProtectedRoute>/);
    expect(app).toMatch(/path="\/contracts\/request"[^>]*element=\{<ProtectedRoute>/);
    expect(app).toMatch(/path="\/contracts\/:id"[^>]*element=\{<ProtectedRoute>/);
  });

  it('RequestContractPage applies useNoIndex()', () => {
    expect(req).toMatch(/useNoIndex\(\)/);
  });

  it('robots still disallows /contracts and /v/c/', () => {
    const robots = read('public/robots.txt');
    expect(robots).toMatch(/Disallow:\s*\/contracts(\s|$)/m);
    expect(robots).toMatch(/Disallow:\s*\/v\/c\//);
  });

  it('sitemap stays free of real contracts and verify URLs', () => {
    const sitemap = read('public/sitemap.xml');
    const ctSitemap = read('public/sitemap-contract-templates.xml');
    for (const xml of [sitemap, ctSitemap]) {
      expect(xml).not.toMatch(/\/contracts\/[a-f0-9-]{8,}/i);
      expect(xml).not.toMatch(/\/v\/c\//);
    }
  });
});