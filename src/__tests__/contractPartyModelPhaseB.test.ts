/**
 * CONTRACT PARTY MODEL — PHASE B (central party resolver).
 *
 * Verifies the new `resolveContractPartiesAndEligibility` helper and
 * locks in that DashboardContracts + WorkspaceContractsTab consume it.
 * Source-level guards mirror the pattern used by Phase A so they stay
 * fast and hermetic.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  resolveContractPartiesAndEligibility,
  CONTRACT_PARTY_MISSING_MESSAGES,
} from '@/modules/contracts/services/contractParties';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');
const DASH = read('pages/dashboard/DashboardContracts.tsx');
const WTAB = read('components/workspace/WorkspaceContractsTab.tsx');
const HELPER = read('modules/contracts/services/contractParties.ts');

const baseClient = {
  user: { id: 'u-client' },
  profile: { full_name: 'Client User', phone: '+9665XXXXXXXX' },
  isAdmin: false,
  isProvider: false,
  ownedBusinessId: null,
  editingId: null,
};

describe('resolveContractPartiesAndEligibility — party definitions', () => {
  it('defines first party as الجهة المنفذة (executing provider)', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      firstParty: { selectedProviderBusinessId: 'biz-1' },
      executionSiteId: 'site-1',
    });
    expect(r.firstPartyRoleLabel.ar).toBe('الجهة المنفذة');
    expect(r.firstPartyRoleLabel.en).toBe('Executing provider');
    expect(r.firstPartyBusinessId).toBe('biz-1');
  });

  it('defines second party as صاحب الحساب / طالب الخدمة', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      firstParty: { selectedProviderBusinessId: 'biz-1' },
      executionSiteId: 'site-1',
    });
    expect(r.secondPartyRoleLabel.ar).toContain('صاحب الحساب');
    expect(r.secondPartyUserId).toBe('u-client');
  });

  it('first party falls back to legacy businessId when no explicit provider', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      firstParty: { fallbackBusinessId: 'biz-legacy' },
      executionSiteId: 'site-1',
    });
    expect(r.firstPartyBusinessId).toBe('biz-legacy');
  });
});

describe('resolveContractPartiesAndEligibility — client-only detection', () => {
  it('client account → isClientOnlyAccount=true', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      firstParty: {},
    });
    expect(r.isClientOnlyAccount).toBe(true);
  });

  it('admin → not client-only', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      isAdmin: true,
      firstParty: {},
    });
    expect(r.isClientOnlyAccount).toBe(false);
  });

  it('provider → not client-only', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      isProvider: true,
      firstParty: {},
    });
    expect(r.isClientOnlyAccount).toBe(false);
  });

  it('business owner → not client-only', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      ownedBusinessId: 'biz-x',
      firstParty: {},
    });
    expect(r.isClientOnlyAccount).toBe(false);
  });

  it('editing mode disables client-only auto-fill', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      editingId: 'contract-1',
      firstParty: {},
    });
    expect(r.isClientOnlyAccount).toBe(false);
  });
});

describe('resolveContractPartiesAndEligibility — missing requirements', () => {
  it('missing provider yields missing_first_party', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      firstParty: {},
      executionSiteId: 'site-1',
    });
    expect(r.missingRequirements).toContain('missing_first_party');
    expect(r.isEligible).toBe(false);
  });

  it('missing site yields missing_execution_site', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      firstParty: { selectedProviderBusinessId: 'biz-1' },
    });
    expect(r.missingRequirements).toContain('missing_execution_site');
  });

  it('missing profile yields missing_second_party_profile', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      profile: { full_name: null, phone: null },
      firstParty: { selectedProviderBusinessId: 'biz-1' },
      executionSiteId: 'site-1',
    });
    expect(r.missingRequirements).toContain('missing_second_party_profile');
  });

  it('missing project on workspace surface yields missing_project', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      firstParty: { selectedProviderBusinessId: 'biz-1' },
      executionSiteId: 'site-1',
      requiresProject: true,
      projectId: null,
    });
    expect(r.missingRequirements).toContain('missing_project');
  });

  it('missing permission yields missing_permission', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      firstParty: { selectedProviderBusinessId: 'biz-1' },
      executionSiteId: 'site-1',
      hasPermission: false,
    });
    expect(r.missingRequirements).toContain('missing_permission');
  });

  it('fully eligible when all requirements satisfied', () => {
    const r = resolveContractPartiesAndEligibility({
      ...baseClient,
      firstParty: { selectedProviderBusinessId: 'biz-1' },
      executionSiteId: 'site-1',
    });
    expect(r.isEligible).toBe(true);
    expect(r.missingRequirements).toEqual([]);
  });

  it('exposes bilingual messages for every missing-requirement code', () => {
    const codes = [
      'missing_first_party',
      'missing_second_party_profile',
      'missing_execution_site',
      'missing_sector',
      'missing_template',
      'missing_scope_of_work',
      'missing_contract_terms',
      'missing_warranty',
      'missing_payment_terms',
      'missing_execution_duration',
      'missing_delivery_terms',
      'missing_project',
      'missing_permission',
    ] as const;
    for (const code of codes) {
      expect(CONTRACT_PARTY_MISSING_MESSAGES[code].ar.length).toBeGreaterThan(0);
      expect(CONTRACT_PARTY_MISSING_MESSAGES[code].en.length).toBeGreaterThan(0);
    }
  });
});

describe('Phase B — consumers wire the helper', () => {
  it('DashboardContracts imports the resolver', () => {
    expect(DASH).toMatch(
      /import\s*\{[^}]*\bresolveContractPartiesAndEligibility\b[^}]*\}\s*from\s*['"]@\/modules\/contracts\/services\/contractParties['"]/,
    );
  });

  it('DashboardContracts invokes the resolver', () => {
    expect(DASH).toMatch(/resolveContractPartiesAndEligibility\(\s*\{/);
  });

  it('WorkspaceContractsTab imports the resolver', () => {
    expect(WTAB).toMatch(
      /import\s*\{[^}]*\bresolveContractPartiesAndEligibility\b[^}]*\}\s*from\s*['"]@\/modules\/contracts\/services\/contractParties['"]/,
    );
  });

  it('WorkspaceContractsTab invokes the resolver', () => {
    expect(WTAB).toMatch(/resolveContractPartiesAndEligibility\(\s*\{/);
  });
});

describe('Phase B — non-regression', () => {
  it('client-only account still hides ClientPicker (Phase A invariant)', () => {
    expect(DASH).toMatch(/!isClientOnlyAccount\s*&&\s*\(\s*\n\s*<ClientPicker/);
  });

  it('workspace tab keeps the linkedProviderBusinessId ?? businessId derivation', () => {
    expect(WTAB).toMatch(/workspace\.linkedProviderBusinessId\s*\?\?\s*workspace\.businessId/);
  });

  it('workspace tab keeps the project + provider eligibility expression', () => {
    expect(WTAB).toMatch(
      /eligible\s*=\s*workspace\.kind\s*===\s*['"]project['"]\s*&&\s*!!providerBusinessId/,
    );
  });

  it('helper is pure: no supabase, no service_role, no any, no ts-ignore', () => {
    expect(HELPER).not.toMatch(/supabase/i);
    expect(HELPER).not.toMatch(/service_role/i);
    expect(HELPER).not.toMatch(/:\s*any\b/);
    expect(HELPER).not.toMatch(/@ts-ignore/);
    expect(HELPER).not.toMatch(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  });
});