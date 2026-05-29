/**
 * HYGIENE-PROFILES-1 — IdentityActivityFeed must not access the `profiles`
 * table directly. All reads route through the canonical
 * `listProfilesByUserIds` wrapper under `src/modules/users/services/`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'IdentityActivityFeed.tsx'),
  'utf8',
);

describe('IdentityActivityFeed — profiles isolation', () => {
  it('does not call supabase.from("profiles") directly', () => {
    expect(SRC).not.toMatch(/supabase\.from\(\s*['"]profiles['"]\s*\)/);
  });

  it('uses the canonical listProfilesByUserIds wrapper', () => {
    expect(SRC).toContain(
      "from '@/modules/users/services/listProfilesByUserIds'",
    );
    expect(SRC).toContain('listProfilesByUserIds<ActorLite>');
  });

  it('does not expand actor projection beyond user_id, full_name, avatar_url (no PII)', () => {
    expect(SRC).toContain("select: 'user_id, full_name, avatar_url'");
    expect(SRC).not.toMatch(/select:\s*'[^']*\bemail\b/);
    expect(SRC).not.toMatch(/select:\s*'[^']*\bphone\b/);
  });
});