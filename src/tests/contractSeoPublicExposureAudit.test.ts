/**
 * CONTRACT SEO PUBLIC EXPOSURE AUDIT + DECISION GATE
 *
 * Audit-only guards. Locks in the current safe posture and prevents
 * accidental future leaks of contract data into public SEO surfaces.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('Contract SEO public exposure audit', () => {
  it('sitemap edge function does not enumerate contracts, milestones, work orders, BOQ', () => {
    const src = read('supabase/functions/sitemap/index.ts');
    expect(src).not.toMatch(/from\(\s*["']contracts["']\s*\)/);
    expect(src).not.toMatch(/from\(\s*["']contract_milestones["']\s*\)/);
    expect(src).not.toMatch(/from\(\s*["']contract_amendments["']\s*\)/);
    expect(src).not.toMatch(/from\(\s*["']work_orders["']\s*\)/);
    expect(src).not.toMatch(/from\(\s*["']work_order_boqs["']\s*\)/);
    expect(src).not.toMatch(/type === ["']contracts?["']/);
  });

  it('static sitemap.xml index does not advertise a contracts sub-sitemap', () => {
    const xml = read('public/sitemap.xml');
    expect(xml).not.toMatch(/type=contracts?/i);
    expect(xml).not.toMatch(/\/contracts\//);
  });

  it('robots.txt disallows dashboard, admin, and auth surfaces (contracts live there)', () => {
    const robots = read('public/robots.txt');
    expect(robots).toMatch(/Disallow:\s*\/dashboard\//);
    expect(robots).toMatch(/Disallow:\s*\/admin\//);
    expect(robots).toMatch(/Disallow:\s*\/auth/);
  });

  it('llms.txt does not enumerate private contract URLs', () => {
    const llms = read('public/llms.txt');
    expect(llms).not.toMatch(/\/contracts\/[a-f0-9-]{8,}/i);
    expect(llms).not.toMatch(/\/dashboard\/contracts/);
    expect(llms).not.toMatch(/\/v\/c\//);
  });

  it('public verify route uses noindex and never embeds party prices/locations/BOQ', () => {
    const src = read('src/pages/VerifyContract.tsx');
    expect(src).toMatch(/useNoIndex\(\)/);
    // forbid sensitive client-side leaks on the verify surface
    expect(src).not.toMatch(/client_name|clientName/);
    expect(src).not.toMatch(/total_amount|grand_total|unit_price/);
    expect(src).not.toMatch(/site_address|execution_site|site_id/);
    expect(src).not.toMatch(/boq_items|measurement_sheet/);
    expect(src).not.toMatch(/pdf_url|signed_url/i);
  });

  it('no public storage bucket exposes contract PDFs (PDF stays a client blob)', () => {
    const pdf = read('src/lib/contract-pdf-export.ts');
    expect(pdf).not.toMatch(/storage\.from\(\s*["']contracts?["']\s*\)/);
    expect(pdf).not.toMatch(/createPublicUrl|getPublicUrl/);
  });

  it('contract routes are mounted under ProtectedRoute and are not in static sitemap', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/contracts\/:id"[^>]*element=\{<ProtectedRoute>/);
    expect(app).toMatch(/path="\/contracts"[^>]*element=\{<ProtectedRoute>/);
    expect(app).toMatch(/path="\/dashboard\/contracts"[^>]*element=\{<ProtectedRoute>/);
  });
});