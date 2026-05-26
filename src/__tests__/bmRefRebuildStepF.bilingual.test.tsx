import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BM-REF-REBUILD-1 — Step F (bilingual + SEO addendum)
 *
 * Confirms the resolver page:
 *  - calls useNoIndex (private routing surface)
 *  - ships Arabic + English copy for loading / not-found states
 *  - exposes a safe Back link (no href="#")
 *  - never renders raw tokens or provider_intent_id
 */
const PAGE = readFileSync(resolve('src/pages/ReferenceResolver.tsx'), 'utf8');

describe('Step F — bilingual + SEO', () => {
  it('imports and invokes useNoIndex', () => {
    expect(PAGE).toMatch(/from\s+['"]@\/hooks\/useNoIndex['"]/);
    expect(PAGE).toMatch(/useNoIndex\(\)/);
  });

  it('includes the required Arabic loading copy', () => {
    expect(PAGE).toContain('جارٍ فتح المرجع...');
  });

  it('includes the required English loading copy', () => {
    expect(PAGE).toMatch(/Opening reference/);
  });

  it('includes the required Arabic unavailable copy for not-found / invalid / error', () => {
    expect(PAGE).toContain('لم يتم العثور على هذا المرجع أو لم يعد متاحًا.');
  });

  it('includes a Back link in both languages', () => {
    expect(PAGE).toContain('العودة');
    expect(PAGE).toMatch(/>Back</);
    expect(PAGE).toMatch(/to="\/"/);
  });

  it('never renders provider_intent_id or token literals', () => {
    expect(PAGE).not.toMatch(/provider_intent_id/);
    expect(PAGE).not.toMatch(/\.token\b/);
  });

  it('never registers href="#" anywhere', () => {
    expect(PAGE).not.toMatch(/href=("|')#\1/);
  });
});