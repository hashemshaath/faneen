import { describe, it, expect } from 'vitest';

/**
 * Guardrail: the public business profile query must remain on a short
 * stale window AND use refetchOnMount:'always' so that provider edits
 * surface without a hard reload.
 *
 * This is a source-level assertion intentionally — we don't spin up
 * React Query here; the goal is to fail loudly if someone re-introduces
 * the long 5-minute staleTime regression that hid edits from owners.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('business profile freshness contract', () => {
  const src = readFileSync(
    resolve(__dirname, '../../components/business-profile/business-profile.data.ts'),
    'utf8',
  );

  it('uses the short headline stale window for useBusinessByUsername', () => {
    expect(src).toMatch(/PROFILE_HEADLINE_STALE_MS\s*=\s*30\s*\*\s*1000/);
    expect(src).toMatch(/staleTime:\s*PROFILE_HEADLINE_STALE_MS/);
  });

  it('forces refetch on mount so post-edit visits load fresh data', () => {
    expect(src).toMatch(/refetchOnMount:\s*['"]always['"]/);
  });
});

describe('username resolver routing', () => {
  const resolverSrc = readFileSync(
    resolve(__dirname, '../UsernameResolver.tsx'),
    'utf8',
  );

  it('short-circuits reserved slugs before firing the lookup', () => {
    expect(resolverSrc).toMatch(/isReservedUsername/);
    expect(resolverSrc).toMatch(/return\s+<NotFound/);
  });

  it('normalizes the username before using it as a cache key', () => {
    expect(resolverSrc).toMatch(/normalizeUsername\(username\)/);
    expect(resolverSrc).toMatch(/queryKey:\s*\['username-kind',\s*normalized\]/);
  });
});

describe('dashboard business edit invalidation', () => {
  const editSrc = readFileSync(
    resolve(__dirname, '../dashboard/DashboardBusinessEdit.tsx'),
    'utf8',
  );

  it('invalidates the public profile query after save', () => {
    expect(editSrc).toMatch(/queryKey:\s*\['business',\s*newUsername\]/);
  });

  it('invalidates the username-kind resolver query after save', () => {
    expect(editSrc).toMatch(/queryKey:\s*\['username-kind',\s*newUsername\]/);
  });

  it('also invalidates the previous username when it changes', () => {
    expect(editSrc).toMatch(/oldUsername\s*!==\s*newUsername/);
    expect(editSrc).toMatch(/queryKey:\s*\['business',\s*oldUsername\]/);
  });
});

describe('no /business/ links to providers', () => {
  it('SectorBrief uses /:username, not /business/:username', () => {
    const briefSrc = readFileSync(resolve(__dirname, '../SectorBrief.tsx'), 'utf8');
    expect(briefSrc).not.toMatch(/to=\{`\/business\/\$\{/);
  });
});