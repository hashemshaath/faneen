import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const EDGE_CREDITS_AUDIT = 'scripts/edge-credits-isolation-audit.mjs';

describe('EDGE-5 edge credits isolation audit', () => {
  it('script exists', () => {
    expect(existsSync(resolve(EDGE_CREDITS_AUDIT))).toBe(true);
  });

  it('guards the provider_lead_credit_transactions table', () => {
    const src = readFileSync(resolve(EDGE_CREDITS_AUDIT), 'utf8');
    expect(src).toContain('provider_lead_credit_transactions');
  });

  it('guards consume / grant / admin credit RPCs', () => {
    const src = readFileSync(resolve(EDGE_CREDITS_AUDIT), 'utf8');
    expect(src).toContain('consume_provider_lead_credit');
    expect(src).toContain('grant_monthly_provider_credit');
    expect(src).toContain('admin_adjust_provider_credits');
  });

  it('allowlists exactly supabase/functions/_shared/credits/', () => {
    const src = readFileSync(resolve(EDGE_CREDITS_AUDIT), 'utf8');
    expect(src).toMatch(
      /ALLOWED_DIRS\s*=\s*\[\s*"supabase\/functions\/_shared\/credits\/"\s*\]/,
    );
  });

  it('exits 0 on the current codebase', () => {
    expect(() =>
      execFileSync('node', [EDGE_CREDITS_AUDIT], { stdio: 'pipe' }),
    ).not.toThrow();
  });
});