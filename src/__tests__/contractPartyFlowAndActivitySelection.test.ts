/**
 * CONTRACT PARTY FLOW + ACTIVITY SELECTION
 *
 * Phase H acceptance — locks in the role-aware contract-parties panel
 * and the activity-source precedence helper:
 *
 *   1. Provider/business-owner accounts never see a provider picker
 *      for themselves; their business is auto-resolved as first party.
 *   2. Personal client accounts never see a ClientPicker for themselves;
 *      they auto-fill as second party and inherit the project-linked
 *      provider as first party (workspace surface).
 *   3. Admin accounts see both parties as explicitly labeled fields.
 *   4. Activity resolution follows project → quote → business → manual,
 *      with no hardcoded defaults.
 *
 * No new RPCs, no DB/RLS changes, no service_role in frontend.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveContractActivity } from '@/modules/contracts/services/resolveContractActivity';

const PAGE = readFileSync(resolve('src/pages/dashboard/DashboardContracts.tsx'), 'utf8');
const PANEL = readFileSync(resolve('src/components/contracts/dashboard/create/ContractPartiesPanel.tsx'), 'utf8');
const TAB = readFileSync(resolve('src/components/workspace/WorkspaceContractsTab.tsx'), 'utf8');
const HELPER = readFileSync(resolve('src/modules/contracts/services/resolveContractActivity.ts'), 'utf8');

describe('ContractPartiesPanel — role-aware parties', () => {
  it('is rendered in the dashboard create flow with a stable testid', () => {
    expect(PAGE).toMatch(/<ContractPartiesPanel\b/);
    expect(PANEL).toMatch(/data-testid="contract-create-parties-panel"/);
    expect(PANEL).toMatch(/data-account-kind=\{accountKind\}/);
  });

  it('derives accountKind from auth flags (admin / provider / client)', () => {
    expect(PAGE).toMatch(/accountKind:\s*ContractAccountKind\s*=\s*isAdmin\s*\?\s*'admin'\s*:\s*\(isProvider\s*\|\|\s*!!businessId\)\s*\?\s*'provider'\s*:\s*'client'/);
  });

  it('exposes provider/client/admin as the only account kinds', () => {
    expect(PANEL).toMatch(/'provider'\s*\|\s*'client'\s*\|\s*'admin'/);
  });

  it('provider accounts get an auto-business hint and no provider picker', () => {
    expect(PANEL).toContain('يتم اعتماد منشأتك تلقائيًا — لا حاجة لاختيار مزود.');
    expect(PANEL).toContain('Your business is set automatically — no provider picker needed.');
    // The dashboard page must not open any provider picker for the signed-in provider.
    expect(PAGE).not.toMatch(/<ProviderPicker\b/);
    expect(PAGE).not.toMatch(/openProviderPicker/);
  });

  it('client accounts get an auto-self hint and a link-a-provider message when missing', () => {
    expect(PANEL).toContain('تم تعبئة بياناتك تلقائيًا — لا حاجة لاختيار عميل.');
    expect(PANEL).toContain('اربط المشروع بمزود خدمة قبل إنشاء العقد');
    expect(PANEL).toContain('Link a service provider to this project before creating a contract');
  });

  it('client-only auto-fill of the signed-in user as second party is unchanged', () => {
    expect(PAGE).toMatch(/if\s*\(\s*!isClientOnlyAccount\s*\)\s*return/);
    expect(PAGE).toMatch(/setSelectedClient\(\{\s*\n\s*user_id:\s*user\.id/);
  });

  it('workspace tab keeps using linkedProviderBusinessId ?? businessId (no client-side smuggling)', () => {
    expect(TAB).toMatch(/workspace\.linkedProviderBusinessId\s*\?\?\s*workspace\.businessId/);
    expect(TAB).not.toMatch(/<ClientPicker\b/);
    expect(TAB).not.toMatch(/\.rpc\(/);
  });

  it('no service_role / any / ts-ignore / hex / hardcoded uuid in new code', () => {
    const files = [PANEL, HELPER];
    for (const src of files) {
      expect(src).not.toMatch(/service_role/i);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/eslint-disable/);
      expect(src).not.toMatch(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    }
  });
});

describe('resolveContractActivity — source precedence', () => {
  it('prefers the project category when present', () => {
    expect(resolveContractActivity({
      projectCategoryId: 'p1', quoteRequestCategoryId: 'q1', businessPrimaryCategoryId: 'b1', manualCategoryId: 'm1',
    })).toEqual({ activityId: 'p1', source: 'project' });
  });
  it('falls back to quote request category', () => {
    expect(resolveContractActivity({
      projectCategoryId: null, quoteRequestCategoryId: 'q1', businessPrimaryCategoryId: 'b1', manualCategoryId: 'm1',
    })).toEqual({ activityId: 'q1', source: 'quote' });
  });
  it('falls back to business primary activity', () => {
    expect(resolveContractActivity({
      projectCategoryId: '', quoteRequestCategoryId: '   ', businessPrimaryCategoryId: 'b1', manualCategoryId: 'm1',
    })).toEqual({ activityId: 'b1', source: 'business' });
  });
  it('falls back to the manual user-picked taxonomy id last', () => {
    expect(resolveContractActivity({
      manualCategoryId: 'm1',
    })).toEqual({ activityId: 'm1', source: 'manual' });
  });
  it('returns null source when nothing is available (callers must surface a picker — never a default)', () => {
    expect(resolveContractActivity({})).toEqual({ activityId: null, source: null });
  });
  it('does not hardcode any activity name or id', () => {
    expect(HELPER).not.toMatch(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    expect(HELPER).not.toMatch(/\b(electrical|plumbing|construction|hvac)\b/i);
  });
});