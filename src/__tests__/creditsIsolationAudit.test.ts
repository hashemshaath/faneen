import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const CREDITS_AUDIT = 'scripts/credits-isolation-audit.mjs';
const MEMBERSHIPS_AUDIT = 'scripts/memberships-isolation-audit.mjs';

describe('CRED-4 credits isolation audit', () => {
  it('script exists', () => {
    expect(existsSync(resolve(CREDITS_AUDIT))).toBe(true);
  });

  it('guards provider_lead_credit_transactions and admin_adjust_provider_credits', () => {
    const src = readFileSync(resolve(CREDITS_AUDIT), 'utf8');
    expect(src).toContain('provider_lead_credit_transactions');
    expect(src).toContain('admin_adjust_provider_credits');
  });

  it('allowlists only src/modules/credits/services/', () => {
    const src = readFileSync(resolve(CREDITS_AUDIT), 'utf8');
    expect(src).toMatch(/ALLOWED_DIRS\s*=\s*\[\s*"src\/modules\/credits\/services\/"\s*\]/);
  });

  it('exits 0 on the current codebase', () => {
    expect(() =>
      execFileSync('node', [CREDITS_AUDIT], { stdio: 'pipe' }),
    ).not.toThrow();
  });

  it('memberships audit no longer guards admin_adjust_provider_credits', () => {
    const src = readFileSync(resolve(MEMBERSHIPS_AUDIT), 'utf8');
    expect(src).not.toContain('admin_adjust_provider_credits');
  });

  it('memberships audit no longer allowlists src/modules/credits/services/', () => {
    const src = readFileSync(resolve(MEMBERSHIPS_AUDIT), 'utf8');
    expect(src).not.toContain('src/modules/credits/services/');
  });
});