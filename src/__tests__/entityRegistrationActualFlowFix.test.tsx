/**
 * ENTITY REGISTRATION SIMPLIFICATION — ACTUAL FLOW FIX guard tests.
 *
 * Source-level only (no rendering). Verifies that the `/start → create
 * entity → /register-entity → dashboard welcome → /onboarding` flow is
 * wired in real code, not only in earlier test files.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');

const START = read('src/pages/Start.tsx');
const REGISTER = read('src/pages/RegisterEntity.tsx');
const ONBOARDING = read('src/pages/Onboarding.tsx');
const MEMBERSHIP = read('src/pages/Membership.tsx');
const DASHBOARD = read('src/pages/dashboard/DashboardOverview.tsx');

describe('ENTITY REGISTRATION SIMPLIFICATION · actual flow fix', () => {
  it('1) /start "create entity" CTA targets /register-entity (not /onboarding)', () => {
    expect(START).toMatch(/'\/register-entity'/);
    // No CTA in /start should jump straight into the long onboarding wizard.
    expect(START).not.toMatch(/to:\s*['"]\/onboarding['"]/);
  });

  it('2) all "create entity / become provider" CTAs route to /register-entity', () => {
    // Membership: become-a-provider CTA + soft redirect for users trying to
    // subscribe to a provider plan.
    expect(MEMBERSHIP).toMatch(/to="\/register-entity"/);
    expect(MEMBERSHIP).toMatch(/navigate\('\/register-entity'\)/);
  });

  it('3) /register-entity contains no service / image / branch / file / service-area / membership controls', () => {
    // Strip line comments and block comments before scanning so that the
    // page's documentation header (which legitimately lists the deferred
    // fields by name) does not trip the field-name guards.
    const code = REGISTER
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/<input[^>]*type=["']file["']/i);
    expect(code).not.toMatch(/ImageUploader|LogoUpload|UploadImage|<FileUpload|<Dropzone/);
    expect(code).not.toMatch(/id=["']entity-(services?|branches?|logo|description|service-areas?|team|membership)["']/);
    expect(code).not.toMatch(/employees_count|service_areas|visibility/);
  });

  it('4) /onboarding is not the first-entry point for entity creation', () => {
    // A redirect card is rendered when there is no draft business yet,
    // pointing the user to /register-entity instead of dumping the full
    // wizard on them.
    expect(ONBOARDING).toMatch(/\/register-entity/);
    expect(ONBOARDING).toMatch(/onboarding-redirect-card|register a new entity|تسجيل جهة جديدة/i);
  });

  it('5) /onboarding renders a redirect card when no draft entity exists', () => {
    expect(ONBOARDING).toMatch(/data-feature=["']onboarding-redirect-card["']/);
  });

  it('6) the dashboard shows the EntityWelcomeCard after registration', () => {
    expect(DASHBOARD).toMatch(/EntityWelcomeCard/);
  });

  it('7) the welcome card CTA targets /onboarding for completing details', () => {
    const welcome = read('src/components/dashboard/EntityWelcomeCard.tsx');
    expect(welcome).toMatch(/\/onboarding/);
  });

  it('8) the entity is created in draft, non-public state', () => {
    expect(REGISTER).toMatch(/authService\.createBusiness\(/);
    const svc = read('src/services/auth/authService.ts');
    expect(svc).toMatch(/approval_status:\s*'draft'/);
  });

  it('9) no DB / RLS / RPC / migration / edge edits inside the page', () => {
    expect(REGISTER).not.toMatch(/supabase\.from\(|supabase\.rpc\(/);
    expect(REGISTER).not.toMatch(/ALTER\s+TABLE|CREATE\s+POLICY|GRANT\s+/i);
  });

  it('10) Auth core is not touched by the page', () => {
    // Reading useAuth() is fine — that is consumption, not modification.
    // Auth core would be: editing AuthContext/AuthProvider internals or
    // bypassing authService primitives.
    expect(REGISTER).not.toMatch(/AuthProvider|AuthContext\.Provider|signOut\(/);
  });

  it('11) no hardcoded hex colors', () => {
    expect(REGISTER).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('12) no new test / type suppressions on the entity-creation surface', () => {
    // Only guard the new surfaces this pass actually owns. Onboarding
    // existed previously and may carry unrelated, scoped lint pragmas
    // (e.g. `react-hooks/exhaustive-deps`) that are out of scope here.
    for (const src of [REGISTER, START]) {
      expect(src).not.toMatch(/@ts-(ignore|expect-error)|eslint-disable|\.skip\(|xit\(|xdescribe\(/);
    }
  });
});