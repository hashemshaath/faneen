import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PROFILE-PAYMENT-1 guard: membership payment side-effect dispatchers must
 * not access the `profiles` table directly. All profile reads route through
 * the canonical `getProfileByUserId` wrapper in `@/modules/users`.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const FILES = [
  'src/modules/memberships/services/payments/manualMarkPaid.ts',
  'src/modules/memberships/services/payments/manualMarkRefunded.ts',
];

describe('membership payment services route profile reads through users wrapper', () => {
  for (const file of FILES) {
    const src = read(file);
    it(`${file} has no direct supabase.from('profiles') access`, () => {
      expect(src).not.toMatch(/supabase\.from\(\s*['"]profiles['"]\s*\)/);
    });
    it(`${file} imports getProfileByUserId from the users module`, () => {
      expect(src).toMatch(/getProfileByUserId/);
      expect(src).toMatch(/from\s+['"]@\/modules\/users['"]/);
    });
    it(`${file} gates outbound email through getEmailDeliveryAddress`, () => {
      expect(src).toMatch(/getEmailDeliveryAddress/);
    });
  }
});
