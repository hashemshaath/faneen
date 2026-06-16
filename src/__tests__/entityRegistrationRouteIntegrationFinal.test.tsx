/**
 * ENTITY REGISTRATION SIMPLIFICATION — ROUTE INTEGRATION + FINAL REGRESSION.
 * Source-level guards. Pin the wiring between `/start`, `/register-entity`,
 * the welcome card, and the existing onboarding/provider routes.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');
const exists = (p: string) => fs.existsSync(path.resolve(__dirname, '..', '..', p));

describe('ENTITY REGISTRATION SIMPLIFICATION · route integration final', () => {
  const APP = read('src/App.tsx');
  const START = read('src/pages/Start.tsx');
  const REGISTER = read('src/pages/RegisterEntity.tsx');
  const WELCOME = read('src/components/dashboard/EntityWelcomeCard.tsx');
  const OVERVIEW = read('src/pages/dashboard/DashboardOverview.tsx');

  it('1. /register-entity route exists and is lazy-loaded', () => {
    expect(APP).toMatch(/path="\/register-entity"/);
    expect(APP).toMatch(/import\("\.\/pages\/RegisterEntity"\)/);
  });

  it('2. "Create entity" card in /start points to /register-entity', () => {
    expect(exists('src/pages/Start.tsx')).toBe(true);
    // The create-entity card must hand off to the basic registration page,
    // not directly into the full onboarding wizard.
    expect(START).toMatch(/id:\s*'create-entity'[\s\S]*?to:\s*'\/register-entity'/);
    expect(START).not.toMatch(/id:\s*'create-entity'[\s\S]*?to:\s*'\/onboarding'/);
  });

  it('3. /onboarding route is preserved', () => {
    expect(APP).toMatch(/path="\/onboarding"/);
  });

  it('4. /join-as-provider redirect is preserved', () => {
    expect(APP).toMatch(/path="\/join-as-provider"[^>]*element=\{<Navigate to="\/for-providers" replace \/>\}/);
  });

  it('5. EntityWelcomeCard is mounted on the dashboard overview', () => {
    expect(OVERVIEW).toMatch(/<EntityWelcomeCard\s*\/>/);
    expect(WELCOME).toMatch(/data-feature="entity-welcome-card"/);
    expect(WELCOME).toMatch(/qitaat_entity_welcome/);
  });

  it('6. Welcome CTA "Complete entity details" routes to /onboarding', () => {
    expect(WELCOME).toMatch(/to="\/onboarding"/);
  });

  it('7. Registration creates the entity via canonical createBusiness (draft state)', () => {
    expect(REGISTER).toMatch(/authService\.createBusiness\(/);
    const svc = read('src/services/auth/authService.ts');
    expect(svc).toMatch(/approval_status:\s*'draft'/);
  });

  it('8. Entity is not made public from the registration page', () => {
    expect(REGISTER).not.toMatch(/is_public\s*[:=]\s*true/);
    expect(REGISTER).not.toMatch(/approval_status:\s*'approved'/);
  });

  it('9. No new DB / RLS / RPC / migrations / edge calls in the registration page', () => {
    expect(REGISTER).not.toMatch(/supabase\.from\(/);
    expect(REGISTER).not.toMatch(/supabase\.rpc\(/);
    expect(REGISTER).not.toMatch(/supabase\.functions\.invoke\(/);
    expect(REGISTER).not.toMatch(/CREATE\s+POLICY|ALTER\s+TABLE|GRANT\s+/i);
  });

  it('10. Auth core is untouched (no direct supabase.auth.* writes)', () => {
    expect(REGISTER).not.toMatch(/supabase\.auth\.(signUp|signInWith|updateUser|admin)/);
  });

  it('11. No membership / free_launch / credits writes from registration or welcome card', () => {
    for (const src of [REGISTER, WELCOME, START]) {
      expect(src).not.toMatch(/membership_|free_launch|provider_lead_credit/);
    }
  });

  it('12. No hardcoded hex colors in touched files', () => {
    for (const src of [REGISTER, WELCOME, START]) {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('13. No type suppressions in touched files', () => {
    for (const src of [REGISTER, WELCOME, START]) {
      expect(src).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
      expect(src).not.toMatch(/\bas\s+any\b/);
    }
  });
});