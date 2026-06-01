import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * UX-REDESIGN-1 — Homepage redesign invariants.
 * Asserts hidden features are now linked from the homepage and that
 * unsupported claims and weak CTAs were removed.
 */
describe('UX-REDESIGN-1 — Homepage redesign', () => {
  const index = read('src/pages/Index.tsx');
  const features = read('src/components/home/v2/sections/PlatformFeaturesSection.tsx');
  const finalCta = read('src/components/home/v2/sections/FinalCTASection.tsx');
  const who = read('src/components/home/v2/sections/WhoIsItForSection.tsx');
  const how = read('src/components/home/v2/sections/HowItWorksV2.tsx');
  const trust = read('src/components/home/v2/sections/TrustSection.tsx');
  const forProv = read('src/components/home/v2/sections/ForProvidersSection.tsx');

  it('homepage mounts the new PlatformFeaturesSection (lazy)', () => {
    expect(index).toMatch(/PlatformFeaturesSection/);
    expect(index).toMatch(/<PlatformFeaturesSection\s*\/>/);
  });

  it('PlatformFeaturesSection links to every previously-hidden public route', () => {
    for (const route of ['/services', '/brands', '/showcase', '/projects', '/compare', '/for-providers']) {
      expect(features).toContain(`'${route}'`);
    }
  });

  it('FinalCTA softens the unsupported Saudi-wide coverage claim', () => {
    expect(finalCta).not.toMatch(/تغطية المملكة/);
    expect(finalCta).not.toMatch(/Saudi-wide coverage/);
    expect(finalCta).toMatch(/تغطية متعددة المدن السعودية/);
  });

  it('FinalCTA exposes secondary links to sectors/services/brands/showcase', () => {
    for (const route of ['/sectors', '/services', '/brands', '/showcase']) {
      expect(finalCta).toContain(`to=\"${route}\"`);
    }
  });

  it('WhoIsItForSection replaces weak /about CTA with buyer + provider CTAs', () => {
    expect(who).not.toMatch(/to=["']\/about["']/);
    expect(who).toMatch(/ROUTES\.quote/);
    expect(who).toMatch(/ROUTES\.signupProvider/);
  });

  it('HowItWorks adds a provider-side secondary CTA to /for-providers', () => {
    expect(how).toContain('"/for-providers"');
  });

  it('TrustSection adds the no-guarantee disclaimer + verification link', () => {
    expect(trust).toMatch(/لا نضمن نتائج التنفيذ/);
    expect(trust).toContain('/about#trust');
  });

  it('ForProvidersSection CTA points to the full /for-providers landing', () => {
    expect(forProv).toContain("'/for-providers'");
  });

  it('homepage source has no private/admin/dashboard anchors', () => {
    // Allow /auth?mode=signup|login but block /dashboard|/admin|/onboarding leaks in homepage tree.
    const allFiles = [index, features, finalCta, who, how, trust, forProv].join('\n');
    expect(allFiles).not.toMatch(/to=["']\/dashboard/);
    expect(allFiles).not.toMatch(/to=["']\/admin/);
    expect(allFiles).not.toMatch(/to=["']\/onboarding/);
  });

  it('homepage does not introduce unconfirmed PDPL/local-hosting claims', () => {
    const allFiles = [index, features, finalCta, who, how, trust, forProv].join('\n');
    expect(allFiles).not.toMatch(/PDPL/i);
    expect(allFiles).not.toMatch(/استضافة (داخل|في) السعودية/);
    expect(allFiles).not.toMatch(/الأفضل في السعودية/);
    expect(allFiles).not.toMatch(/نضمن الجودة/);
  });
});