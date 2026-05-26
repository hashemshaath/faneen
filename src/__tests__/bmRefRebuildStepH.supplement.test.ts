import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BM-REF-REBUILD-1 — Step H (supplement)
 *
 * Closes the remaining Step H surfaces called out in the phase brief
 * that the original Step H test did not cover:
 *
 *   1. AdminMembershipPayments — PAY ref shows ReferenceBadge AND
 *      ReferenceLinkCopy (admin-only).
 *   2. User-facing membership payment surfaces never leak
 *      provider_intent_id (PCI/payment-token safety).
 *   3. Coverage doc lists which prefixes are approved for `/r/{REF}`
 *      copy links.
 */
const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('Step H supplement — AdminMembershipPayments PAY copy link', () => {
  const SRC = read('src/pages/admin/AdminMembershipPayments.tsx');

  it('imports both ReferenceBadge and ReferenceLinkCopy', () => {
    expect(SRC).toContain("from '@/components/reference/ReferenceBadge'");
    expect(SRC).toContain("from '@/components/reference/ReferenceLinkCopy'");
  });

  it('PAY cell renders ReferenceBadge AND ReferenceLinkCopy bound to r.ref_id', () => {
    expect(SRC).toMatch(/<ReferenceBadge\s+refId=\{r\.ref_id\}/);
    expect(SRC).toMatch(/<ReferenceLinkCopy\s+refId=\{r\.ref_id\}\s+isRTL=\{isRTL\}/);
  });

  it('never passes provider_intent_id to ReferenceLinkCopy', () => {
    expect(SRC).not.toMatch(/<ReferenceLinkCopy[^/>]*provider_intent_id/);
  });

  it('never passes a raw uuid id (r.id) to ReferenceLinkCopy', () => {
    expect(SRC).not.toMatch(/<ReferenceLinkCopy[^/>]*refId=\{r\.id\}/);
  });
});

describe('Step H supplement — user-facing payment surfaces never leak provider_intent_id', () => {
  const FILES = [
    'src/components/membership/MembershipPaymentHistory.tsx',
    'src/components/membership/MembershipPaymentStatus.tsx',
    'src/pages/MembershipInvoice.tsx',
  ];

  it('none of the user-facing payment surfaces select or render provider_intent_id', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} must not reference provider_intent_id`).not.toMatch(
        /provider_intent_id/,
      );
    }
  });

  it('none of the user-facing payment surfaces embed synthetic phone emails', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src).not.toContain('@phone.qitaat.local');
    }
  });

  it('none of the user-facing payment surfaces use href="#" placeholders', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src).not.toMatch(/href=["']#["']/);
    }
  });
});

describe('Step H supplement — coverage doc lists copy-link policy', () => {
  const DOC = read('docs/reference-resolver-coverage.md');

  it('mentions copy-link policy and PAY allowance', () => {
    expect(DOC).toMatch(/PAY/);
    expect(DOC).toMatch(/copy[\s-]?link/i);
  });

  it('explicitly excludes token-based references from copy links', () => {
    expect(DOC).toMatch(/token/i);
  });
});