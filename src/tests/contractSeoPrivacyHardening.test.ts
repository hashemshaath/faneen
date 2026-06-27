/**
 * CONTRACT SEO PRIVACY HARDENING — VERIFY ROUTE + NOINDEX
 *
 * Locks the privacy posture for the public verify route and the
 * protected /contracts/* routes. No real SEO is added.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('Contract SEO privacy hardening', () => {
  it('VerifyContract does not render provider_name', () => {
    const src = read('src/pages/VerifyContract.tsx');
    expect(src).not.toMatch(/data\.provider_name/);
    expect(src).not.toMatch(/label=\{t\.provider\}/);
  });

  it('VerifyContract does not leak client name, prices, site, PDF, BOQ', () => {
    const src = read('src/pages/VerifyContract.tsx');
    expect(src).not.toMatch(/client_name|clientName/);
    expect(src).not.toMatch(/total_amount|grand_total|unit_price|price/i);
    expect(src).not.toMatch(/site_address|execution_site|site_id/);
    expect(src).not.toMatch(/boq|measurement/i);
    expect(src).not.toMatch(/pdf_url|signed_url/i);
  });

  it('VerifyContract still uses noindex', () => {
    expect(read('src/pages/VerifyContract.tsx')).toMatch(/useNoIndex\(\)/);
  });

  it('/contracts (Contracts.tsx) uses useNoIndex', () => {
    expect(read('src/pages/Contracts.tsx')).toMatch(/useNoIndex\(\)/);
  });

  it('/contracts/:id (ContractDetail.tsx) uses useNoIndex', () => {
    expect(read('src/pages/ContractDetail.tsx')).toMatch(/useNoIndex\(\)/);
  });

  it('/contracts/request (RequestContractPage.tsx) uses useNoIndex', () => {
    expect(read('src/pages/contracts/RequestContractPage.tsx')).toMatch(/useNoIndex\(\)/);
  });

  it('robots.txt disallows /contracts and /contracts/ and /v/c/', () => {
    const robots = read('public/robots.txt');
    expect(robots).toMatch(/Disallow:\s*\/contracts(\s|$)/m);
    expect(robots).toMatch(/Disallow:\s*\/contracts\//);
    expect(robots).toMatch(/Disallow:\s*\/v\/c\//);
  });

  it('static sitemap.xml contains no real contracts or verify URLs', () => {
    const xml = read('public/sitemap.xml');
    expect(xml).not.toMatch(/\/contracts\//);
    expect(xml).not.toMatch(/\/v\/c\//);
  });

  it('llms.txt does not enumerate private contracts or verify URLs', () => {
    const llms = read('public/llms.txt');
    expect(llms).not.toMatch(/\/contracts\/[a-f0-9-]{8,}/i);
    expect(llms).not.toMatch(/\/v\/c\//);
  });
});
