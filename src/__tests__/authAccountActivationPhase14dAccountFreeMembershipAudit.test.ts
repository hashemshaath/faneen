import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.resolve(ROOT, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.resolve(ROOT, p));

/**
 * AUTH-14D · Read-only invariants for the account-activation + free-launch
 * membership pipeline. This phase MUST NOT touch any behavior; this guard
 * locks the surfaces audited in
 * `docs/auth-account-activation-journey-phase-14d-account-free-membership-audit.md`.
 */
describe('AUTH-14D · activation + free-membership invariants', () => {
  // 1. ensure_provider_subscription migration is still present
  it('ensure_provider_subscription migration still ships free_launch grant', () => {
    const migDir = path.resolve(ROOT, 'supabase/migrations');
    const files = fs.readdirSync(migDir);
    const hit = files.find((f) => {
      const txt = fs.readFileSync(path.join(migDir, f), 'utf8');
      return /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.ensure_provider_subscription/i.test(txt)
        && /free_launch/.test(txt);
    });
    expect(hit, 'migration declaring ensure_provider_subscription with free_launch must exist').toBeTruthy();
  });

  // 2. free_launch plan code references preserved
  it('free_launch plan code is still referenced from the UI badge', () => {
    const badge = read('src/components/dashboard/FreeLaunchBadge.tsx');
    expect(badge).toMatch(/free_launch/);
  });

  // 3. Provider dashboard still mounts the free-launch badge
  it('ProviderDashboardView still mounts FreeLaunchBadge', () => {
    const src = read('src/pages/dashboard/overview/ProviderDashboardView.tsx');
    expect(src).toContain('FreeLaunchBadge');
  });

  // 4. No UI file invokes membership grant / credits mutation directly.
  //    All such calls must go through @/modules/credits or the cron edge.
  it('UI never calls forbidden credit RPCs directly', () => {
    const forbidden = [
      'consume_provider_lead_credit',
      'grant_monthly_provider_credit',
      'admin_adjust_provider_credits',
      'provider_lead_credit_transactions',
    ];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip the credits module itself + this guard file.
          if (full.includes(`${path.sep}modules${path.sep}credits`)) continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          if (full.endsWith('authAccountActivationPhase14dAccountFreeMembershipAudit.test.ts')) continue;
          const txt = fs.readFileSync(full, 'utf8');
          for (const k of forbidden) {
            // Only flag direct RPC / .from(... TableName ...) usage, not the
            // shared list in this file or in the credits-isolation script.
            if (txt.includes(`.rpc('${k}'`) || txt.includes(`from('${k}'`)) {
              offenders.push(`${full} :: ${k}`);
            }
          }
        }
      }
    };
    walk(path.resolve(ROOT, 'src'));
    expect(offenders).toEqual([]);
  });

  // 5. Onboarding wizard + business-creation client paths untouched by 14D
  //    (no new mutation surface added in this phase).
  it('Onboarding wizard is still the canonical business-creation client surface', () => {
    expect(exists('src/pages/Onboarding.tsx')).toBe(true);
    const src = read('src/pages/Onboarding.tsx');
    expect(src).toMatch(/is_onboarded/);
    expect(src).toMatch(/businesses/);
  });

  // 6. No new migration / edge function files were introduced for 14D
  it('phase 14D introduces no DB migration or edge function', () => {
    const migDir = path.resolve(ROOT, 'supabase/migrations');
    for (const f of fs.readdirSync(migDir)) {
      const txt = fs.readFileSync(path.join(migDir, f), 'utf8');
      expect(txt).not.toMatch(/phase[\s_-]?14d/i);
    }
    const edgeDir = path.resolve(ROOT, 'supabase/functions');
    if (fs.existsSync(edgeDir)) {
      for (const entry of fs.readdirSync(edgeDir)) {
        expect(entry).not.toMatch(/phase-14d/i);
      }
    }
  });

  // 7. Auth core surfaces (Auth.tsx, ProtectedRoute, AuthContext) untouched
  it('auth core surfaces preserve their entry points', () => {
    const auth = read('src/pages/Auth.tsx');
    expect(auth).toContain('IdentitySignInForm');
    expect(auth).toMatch(/return 'identity'/);
    const guarded = read('src/components/auth/ProtectedRoute.tsx');
    expect(guarded).toMatch(/is_onboarded|isOnboarded/);
  });

  // 8. Audit report file exists and reaches the final decision line
  it('phase 14D audit report is committed with the final decision', () => {
    const doc = read('docs/auth-account-activation-journey-phase-14d-account-free-membership-audit.md');
    expect(doc).toMatch(/ACCOUNT FREE MEMBERSHIP AUDIT COMPLETE/);
  });

  // 9. No `any`, no suppressions, no hex colors in the report's test guard
  it('this guard test itself respects the project rules', () => {
    const txt = read('src/__tests__/authAccountActivationPhase14dAccountFreeMembershipAudit.test.ts');
    expect(txt).not.toMatch(/\bas\s+any\b/);
    expect(txt).not.toMatch(/:\s*any\b/);
    expect(txt).not.toMatch(/@ts-ignore/);
    expect(txt).not.toMatch(/@ts-expect-error/);
    expect(txt).not.toMatch(/eslint-disable/);
    expect(txt).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});