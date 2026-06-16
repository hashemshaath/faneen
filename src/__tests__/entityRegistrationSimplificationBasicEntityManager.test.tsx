/**
 * ENTITY REGISTRATION SIMPLIFICATION — guard tests.
 * Source-level only (no rendering). Enforces that the new
 * `/register-entity` surface collects ONLY basic entity + account-manager
 * data, defers everything else to the dashboard onboarding wizard, and
 * never makes the entity publicly visible.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');
const exists = (p: string) => fs.existsSync(path.resolve(__dirname, '..', '..', p));

describe('ENTITY REGISTRATION SIMPLIFICATION · basic entity + account manager', () => {
  it('ships the new /register-entity page', () => {
    expect(exists('src/pages/RegisterEntity.tsx')).toBe(true);
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/register-entity"/);
    expect(app).toMatch(/import\("\.\/pages\/RegisterEntity"\)/);
  });

  const PAGE = read('src/pages/RegisterEntity.tsx');

  it('asks for exactly the basic entity fields', () => {
    expect(PAGE).toMatch(/id="entity-name-ar"/);
    expect(PAGE).toMatch(/id="entity-name-en"/);
    expect(PAGE).toMatch(/id="entity-unified"/);
    expect(PAGE).toMatch(/id="entity-email"/);
  });

  it('asks for exactly the account manager fields', () => {
    expect(PAGE).toMatch(/id="mgr-name"/);
    expect(PAGE).toMatch(/id="mgr-email"/);
    expect(PAGE).toMatch(/<PhoneField/);
    expect(PAGE).toMatch(/<PasswordField/);
  });

  it('does NOT ask for services / images / branches / files / service-areas during registration', () => {
    expect(PAGE).not.toMatch(/services?[\s\S]*data-step="entity"|data-step="entity"[\s\S]*services?/i);
    // No file upload inputs of any kind
    expect(PAGE).not.toMatch(/<input[^>]*type="file"/i);
    expect(PAGE).not.toMatch(/type=["']file["']/);
    // No image/logo upload primitives
    expect(PAGE).not.toMatch(/ImageUploader|LogoUpload|UploadImage|<FileUpload/);
    // No branch / service-area / team / membership prompts
    expect(PAGE).not.toMatch(/branches?|الفروع/i);
    expect(PAGE).not.toMatch(/service_areas?|مناطق الخدمة/i);
    expect(PAGE).not.toMatch(/membership|free_launch|اشتراك/i);
    expect(PAGE).not.toMatch(/team_members?|عدد الموظفين/i);
  });

  it('non-enumerating duplicate handling for entity email', () => {
    // Must NOT reveal that the email is registered
    expect(PAGE).not.toMatch(/مسجل بالفعل|already registered on Qitaat/);
    // Must use safe phrasing per spec
    expect(PAGE).toMatch(/سجّل الدخول أو اطلب الانضمام|sign in or ask the entity admin to invite you/);
  });

  it('creates the entity in a non-public draft state via existing primitives', () => {
    // No direct supabase writes from the page
    expect(PAGE).not.toMatch(/supabase\.from\(/);
    expect(PAGE).not.toMatch(/supabase\.rpc\(/);
    // Routes through canonical auth + business creation primitives
    expect(PAGE).toMatch(/authService\.signUp\(/);
    expect(PAGE).toMatch(/authService\.createBusiness\(/);
    // The canonical createBusiness sets approval_status: 'draft'
    const svc = read('src/services/auth/authService.ts');
    expect(svc).toMatch(/approval_status:\s*'draft'/);
  });

  it('does not touch RLS / migrations / membership / credits', () => {
    expect(PAGE).not.toMatch(/membership_|free_launch|provider_lead_credit/);
    expect(PAGE).not.toMatch(/ALTER\s+TABLE|CREATE\s+POLICY|GRANT\s+/i);
  });

  it('uses no hardcoded hex colors and no type suppressions', () => {
    expect(PAGE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(PAGE).not.toMatch(/\bany\b/);
    expect(PAGE).not.toMatch(/as\s+any/);
    expect(PAGE).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
  });

  it('ships the post-registration welcome card mounted in the dashboard', () => {
    expect(exists('src/components/dashboard/EntityWelcomeCard.tsx')).toBe(true);
    const overview = read('src/pages/dashboard/DashboardOverview.tsx');
    expect(overview).toMatch(/<EntityWelcomeCard\s*\/>/);
    const card = read('src/components/dashboard/EntityWelcomeCard.tsx');
    expect(card).toMatch(/data-feature="entity-welcome-card"/);
    expect(card).toMatch(/data-feature="entity-welcome-steps"/);
    expect(card).toMatch(/qitaat_entity_welcome/);
    expect(card).toMatch(/to="\/onboarding"/);
    // The welcome card explains that the entity is not yet public
    expect(card).toMatch(/لن تظهر الجهة للعملاء|will not appear to clients/);
  });
});