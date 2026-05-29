/**
 * REGISTRATION-UX consolidated entity onboarding — source-level guarantees
 * for the current (post APP-CODEBASE-CLEANUP-STABILIZE-2) flow:
 *
 *   intent → account-type → business-details (name AR/EN + unified + email +
 *            region + sectors + optional CR) → details → phone-verify →
 *            documents → summary
 *
 * Replaces the legacy entity-type / entity-capabilities / business-sectors
 * / main-location / staff-invite step assertions which referenced features
 * intentionally removed during registration consolidation.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

const ONBOARDING = read('pages/Onboarding.tsx');
const AUTH_SERVICE = read('services/auth/authService.ts');
const DUPLICATE_SERVICE = read(
  'modules/entities/services/access/findPossibleDuplicateEntities.ts',
);
const ACCESS_SERVICE = read(
  'modules/entities/services/access/createEntityAccessRequest.ts',
);

describe('Registration consolidated — step order', () => {
  it('STEP_ORDER is the consolidated 7-step sequence', () => {
    expect(ONBOARDING).toMatch(
      /'intent',\s*'account-type',\s*'business-details',\s*'details',\s*'phone-verify',\s*'documents',\s*'summary'/,
    );
  });

  it('OnboardingStep union matches STEP_ORDER (no removed steps)', () => {
    for (const s of [
      "'intent'",
      "'business-details'",
      "'phone-verify'",
      "'documents'",
      "'summary'",
    ]) {
      expect(ONBOARDING).toContain(s);
    }
  });

  it('removed legacy steps are not referenced anywhere', () => {
    for (const removed of [
      "'entity-type'",
      "'entity-capabilities'",
      "'business-sectors'",
      "'main-location'",
      "'staff-invite'",
    ]) {
      expect(ONBOARDING).not.toContain(removed);
    }
  });
});

describe('Registration consolidated — business-details collects all entity data', () => {
  it('collects Arabic + English entity name, unified number, business email, region, sectors', () => {
    expect(ONBOARDING).toContain('setBusinessName');
    expect(ONBOARDING).toContain('setBusinessNameEn');
    expect(ONBOARDING).toContain('unifiedNumber');
    expect(ONBOARDING).toContain('businessEmail');
    expect(ONBOARDING).toContain('regionId');
    expect(ONBOARDING).toContain('SectorPicker');
  });

  it('completion validation requires all 6 mandatory entity fields', () => {
    // The total field count drives the on-screen completeness bar.
    expect(ONBOARDING).toContain('total += 6;');
    expect(ONBOARDING).toMatch(
      /unifiedValid && emailValid && !!regionId && sectors\.length > 0/,
    );
  });

  it('persists Arabic + English name, unified number and region on createBusiness', () => {
    expect(ONBOARDING).toMatch(/createBusiness\([\s\S]{0,800}name_en:\s*businessNameEn/);
    expect(ONBOARDING).toMatch(/createBusiness\([\s\S]{0,800}unified_number:\s*unifiedNumber/);
    expect(ONBOARDING).toMatch(/createBusiness\([\s\S]{0,800}region:\s*selectedRegion/);
    expect(ONBOARDING).toMatch(/createBusiness\([\s\S]{0,800}sectors,/);
  });

  it('authService.createBusiness accepts and forwards the extras payload', () => {
    expect(AUTH_SERVICE).toContain('entity_type?: string');
    expect(AUTH_SERVICE).toContain('capabilities?: Record<string, boolean>');
  });
});

describe('Registration consolidated — government exclusion preserved', () => {
  it('excludes all government wording', () => {
    expect(ONBOARDING).not.toMatch(/government/i);
    expect(ONBOARDING).not.toContain('جهة حكومية');
    expect(ONBOARDING).not.toContain('حكومي');
  });
});

describe('Registration consolidated — duplicate prevention service', () => {
  it('duplicate service projects safe-only columns (no PII)', () => {
    expect(DUPLICATE_SERVICE).toContain('id, ref_id, legacy_ref_id, name_ar, name_en, city_id');
    expect(DUPLICATE_SERVICE).not.toMatch(/\bemail\b/);
    expect(DUPLICATE_SERVICE).not.toMatch(/\bphone\b/);
  });
});

describe('Registration consolidated — request access MVP', () => {
  it('createEntityAccessRequest writes to entity_access_requests', () => {
    expect(ACCESS_SERVICE).toContain(`from('entity_access_requests')`);
    expect(ACCESS_SERVICE).toContain('requester_user_id');
  });

  it('never renders synthetic phone email domain or raw provider tokens', () => {
    expect(ONBOARDING).not.toMatch(/synthetic[_-]?phone[_-]?email/i);
    expect(ONBOARDING).not.toContain('@phone.qitaat.local');
  });
});

describe('Registration consolidated — completion contract', () => {
  it('persists is_onboarded:true exactly once via completeOnboarding', () => {
    const hits = ONBOARDING.match(/is_onboarded:\s*true/g) || [];
    expect(hits.length).toBe(1);
  });

  it('business completion routes through createBusiness with id + name + username', () => {
    expect(ONBOARDING).toMatch(
      /accountType === 'business' && businessName && username/,
    );
    expect(ONBOARDING).toMatch(
      /authService\.createBusiness\(user!\.id, businessName, username,/,
    );
  });

  it('summary step still mounts the verification status badge', () => {
    expect(ONBOARDING).toContain(
      "import { EntityVerificationStatusBadge } from '@/components/entities/EntityVerificationStatusBadge'",
    );
    expect(ONBOARDING).toContain('<EntityVerificationStatusBadge');
  });
});

describe('Registration consolidated — forbidden access guardrails', () => {
  it('does not query forbidden auth/role tables directly from the page', () => {
    expect(ONBOARDING).not.toMatch(/supabase\.from\(['"](profiles|user_roles)['"]\)/);
  });

  it('does not touch supabase.storage directly (routes through @/modules/files)', () => {
    expect(ONBOARDING).not.toMatch(/supabase\.storage/);
    expect(ONBOARDING).toContain("from '@/modules/files'");
  });
});