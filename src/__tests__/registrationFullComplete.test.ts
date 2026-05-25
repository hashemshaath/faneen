/**
 * REGISTRATION-UX-FULL-COMPLETE-1
 * Source-level guarantees for the complete entity onboarding MVP:
 *  intent → details → business-details → entity-type → entity-capabilities
 *         → business-sectors → summary.
 *
 * No runtime rendering — keeps the test fast and route-free.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ONBOARDING = fs.readFileSync(
  path.resolve(__dirname, '../pages/Onboarding.tsx'),
  'utf8',
);

const ACCESS_SERVICE = fs.readFileSync(
  path.resolve(__dirname, '../modules/entities/services/access/createEntityAccessRequest.ts'),
  'utf8',
);

const DUPLICATE_SERVICE = fs.readFileSync(
  path.resolve(__dirname, '../modules/entities/services/access/findPossibleDuplicateEntities.ts'),
  'utf8',
);

const AUTH_SERVICE = fs.readFileSync(
  path.resolve(__dirname, '../services/auth/authService.ts'),
  'utf8',
);

describe('Registration Full Complete — step order', () => {
  it('STEP_ORDER includes entity-capabilities between business-details and business-sectors', () => {
    expect(ONBOARDING).toMatch(/'business-details',[\s\S]{0,80}'entity-capabilities',\s*'business-sectors'/);
  });

  it('business-details Continue advances directly to entity-capabilities (merged screen)', () => {
    expect(ONBOARDING).toMatch(/setStep\('entity-capabilities'\)/);
  });

  it('entity-capabilities Continue advances to business-sectors', () => {
    expect(ONBOARDING).toMatch(/setStep\('business-sectors'\)/);
  });
});

describe('Registration Full Complete — entity types (no government)', () => {
  const allowed = [
    'company',
    'establishment',
    'individual_business',
    'private_entity',
    'service_provider',
    'buyer_entity',
    'other',
  ];
  it.each(allowed)('declares allowed entity type "%s"', (t) => {
    expect(ONBOARDING).toContain(`'${t}'`);
  });

  it('excludes all government wording', () => {
    expect(ONBOARDING).not.toMatch(/government/i);
    expect(ONBOARDING).not.toContain('government_site');
    expect(ONBOARDING).not.toContain('government_entity');
    expect(ONBOARDING).not.toContain('جهة حكومية');
    expect(ONBOARDING).not.toContain('حكومي');
  });
});

describe('Registration Full Complete — capabilities', () => {
  it('offers provider / buyer / both modes', () => {
    // Modes are rendered via a literal options array consumed by data-capability-mode={o.id}.
    expect(ONBOARDING).toContain('data-capability-mode={o.id}');
    expect(ONBOARDING).toMatch(/id:\s*'provider'/);
    expect(ONBOARDING).toMatch(/id:\s*'buyer'/);
    expect(ONBOARDING).toMatch(/id:\s*'both'/);
  });

  it('translates modes into a structured capabilities jsonb shape', () => {
    expect(ONBOARDING).toContain('can_provide_services');
    expect(ONBOARDING).toContain('can_request_services');
    expect(ONBOARDING).toContain('can_issue_quotes');
    expect(ONBOARDING).toContain('can_receive_quotes');
  });

  it('Arabic and English labels are present', () => {
    expect(ONBOARDING).toContain('مقدم خدمة');
    expect(ONBOARDING).toContain('مستفيد / طالب خدمة');
    expect(ONBOARDING).toContain('الاثنين');
    expect(ONBOARDING).toContain('Provider');
    expect(ONBOARDING).toContain('Buyer / beneficiary');
    expect(ONBOARDING).toContain('Both');
  });
});

describe('Registration Full Complete — createBusiness wiring', () => {
  it('passes entity_type and capabilities to createBusiness on completion', () => {
    expect(ONBOARDING).toMatch(/createBusiness\([\s\S]*entity_type:\s*entityType[\s\S]*capabilities:\s*capabilitiesFromMode/);
  });

  it('authService.createBusiness accepts and forwards entity_type + capabilities', () => {
    expect(AUTH_SERVICE).toContain('entity_type?: string');
    expect(AUTH_SERVICE).toContain('capabilities?: Record<string, boolean>');
    expect(AUTH_SERVICE).toMatch(/extras\?\.entity_type\s*\?\s*\{\s*entity_type:\s*extras\.entity_type\s*\}/);
    expect(AUTH_SERVICE).toMatch(/extras\?\.capabilities\s*\?\s*\{\s*capabilities:\s*extras\.capabilities\s*\}/);
  });
});

describe('Registration Full Complete — duplicate prevention', () => {
  it('uses findPossibleDuplicateEntities before allowing entity creation', () => {
    expect(ONBOARDING).toContain('findPossibleDuplicateEntities');
  });

  it('shows the exact-duplicate warning copy and a request-access alternative', () => {
    expect(ONBOARDING).toContain('قد تكون هذه المنشأة مسجلة مسبقًا');
    expect(ONBOARDING).toContain('This entity may already exist');
    expect(ONBOARDING).toContain('data-feature="duplicate-warning"');
  });

  it('duplicate service projects safe-only columns (no PII)', () => {
    expect(DUPLICATE_SERVICE).toContain('id, ref_id, legacy_ref_id, name_ar, name_en, city_id');
    expect(DUPLICATE_SERVICE).not.toMatch(/\bemail\b/);
    expect(DUPLICATE_SERVICE).not.toMatch(/\bphone\b/);
  });
});

describe('Registration Full Complete — request access MVP', () => {
  it('createEntityAccessRequest writes to entity_access_requests', () => {
    expect(ACCESS_SERVICE).toContain(`from('entity_access_requests')`);
    expect(ACCESS_SERVICE).toContain('requester_user_id');
  });

  it('does not display token / synthetic email / provider_intent_id', () => {
    expect(ONBOARDING).not.toMatch(/provider_intent_id/);
    expect(ONBOARDING).not.toMatch(/synthetic[_-]?phone[_-]?email/i);
  });

  it('individual intent uses extended bilingual copy explaining the path', () => {
    expect(ONBOARDING).toContain('يمكنك استخدام قطاعات كفرد');
    expect(ONBOARDING).toContain('You can use Qitaat as an individual');
  });
});

describe('Registration Full Complete — backward compatibility', () => {
  it('preserves the existing summary step and is_onboarded write', () => {
    expect(ONBOARDING).toContain("if (step === 'summary')");
    expect(ONBOARDING).toContain('is_onboarded: true');
  });

  it('individual completion still skips createBusiness', () => {
    expect(ONBOARDING).toMatch(/accountType === 'business' && businessName && username/);
  });
});