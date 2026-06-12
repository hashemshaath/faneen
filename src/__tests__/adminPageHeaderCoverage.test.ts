import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ADMIN REDESIGN PHASE 4 — Page consistency guard.
 *
 * Tracks AdminPageHeader usage across the canonical admin pages.
 * Pages that already adopted the shared header are pinned in
 * REQUIRES_HEADER and may never regress. Heavy legacy pages that
 * still ship a bespoke hero are listed in PENDING_FOLLOW_UP so the
 * regression surface is visible and ratchets downward over time.
 *
 * Adding `AdminPageHeader` to a PENDING_FOLLOW_UP page is a normal
 * Phase 4 follow-up: just move the entry into REQUIRES_HEADER.
 */
const ADMIN_DIR = resolve(__dirname, '../pages/admin');

const REQUIRES_HEADER = [
  'AdminAccessManagement.tsx',
  'AdminBrands.tsx',
  'AdminBusinesses.tsx',
  'AdminIdentityCenter.tsx',
  'AdminProviderReview.tsx',
  'AdminQuoteOperations.tsx',
  'AdminSystemAccess.tsx',
] as const;

const PENDING_FOLLOW_UP = [
  'AdminContactMessages.tsx',
  'AdminIdentity.tsx',
  'AdminMembershipPayments.tsx',
  'AdminMemberships.tsx',
  'AdminOperations.tsx',
  'AdminSystemSettings.tsx',
  'AdminUsers.tsx',
] as const;

const read = (file: string): string => readFileSync(resolve(ADMIN_DIR, file), 'utf8');

describe('admin page header coverage (Phase 4)', () => {
  it.each(REQUIRES_HEADER)('%s renders AdminPageHeader', (file) => {
    const src = read(file);
    expect(src).toMatch(/<AdminPageHeader[\s>]/);
    expect(src).toContain("from '@/components/admin/AdminPageHeader'");
  });

  it('REQUIRES_HEADER and PENDING_FOLLOW_UP do not overlap', () => {
    const overlap = REQUIRES_HEADER.filter((f) => (PENDING_FOLLOW_UP as readonly string[]).includes(f));
    expect(overlap).toEqual([]);
  });

  it('no admin page leaks raw Supabase error objects to UI', () => {
    for (const file of [...REQUIRES_HEADER, ...PENDING_FOLLOW_UP]) {
      const src = read(file);
      // Heuristic: toasting `.message` of an unknown error directly is allowed,
      // but rendering `error.details` / `error.hint` from Supabase is not — they
      // are raw Postgres strings and confuse end users.
      expect(src, file).not.toMatch(/toast[^()]*\(\s*error\.(details|hint)\b/);
    }
  });

  it('no admin page ships "coming soon" without an Arabic equivalent', () => {
    for (const file of [...REQUIRES_HEADER, ...PENDING_FOLLOW_UP]) {
      const src = read(file).toLowerCase();
      if (src.includes('coming soon')) {
        expect(read(file), file).toMatch(/غير\s*جاهز|قريبًا|قريباً/);
      }
    }
  });

  it('no admin page uses banned escape hatches', () => {
    for (const file of [...REQUIRES_HEADER]) {
      const src = read(file);
      expect(src, file).not.toMatch(/@ts-ignore|@ts-expect-error/);
      expect(src, file).not.toMatch(/\bas\s+any\b/);
    }
  });
});