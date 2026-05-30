import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const BRANDS_AUDIT = 'scripts/brands-isolation-audit.mjs';

describe('BRANDS-GOVERNANCE-2 brands isolation audit', () => {
  it('script exists', () => {
    expect(existsSync(resolve(BRANDS_AUDIT))).toBe(true);
  });

  it('guards all brand tables, the public view, and admin RPCs', () => {
    const src = readFileSync(resolve(BRANDS_AUDIT), 'utf8');
    for (const t of [
      'brand_catalog',
      'brand_manufacturing_countries',
      'brand_sector_links',
      'brand_audit_logs',
      'brand_addition_requests',
      'business_service_brands',
      'brands_public',
    ]) {
      expect(src).toContain(t);
    }
    for (const rpc of [
      'admin_approve_brand',
      'admin_reject_brand',
      'admin_archive_brand',
      'admin_merge_brands',
      'admin_approve_provider_brand_link',
      'admin_reject_provider_brand_link',
      'approve_brand_addition_request',
      'reject_brand_addition_request',
    ]) {
      expect(src).toContain(rpc);
    }
  });

  it('allowlists only src/modules/brands/services/', () => {
    const src = readFileSync(resolve(BRANDS_AUDIT), 'utf8');
    expect(src).toMatch(/ALLOWED_DIRS\s*=\s*\[\s*"src\/modules\/brands\/services\/"\s*\]/);
  });

  it('exits 0 on the current codebase', () => {
    expect(() =>
      execFileSync('node', [BRANDS_AUDIT], { stdio: 'pipe' }),
    ).not.toThrow();
  });
});