/**
 * PROJECT ↔ PROVIDER LINKING — guard tests (source-level).
 *
 * Lock in the invariants of the new linking prerequisite:
 *
 *  - The contracts CTA stays disabled until a provider is linked,
 *    either via `businessId` OR via `linkedProviderBusinessId`.
 *  - The helper copy is the required Arabic/English phrasing.
 *  - The Overview tab surfaces the link state (no fake provider list).
 *  - The link CTA is rendered as disabled in this phase.
 *  - Writes go through the service wrapper — no inline RPC inside
 *    components, no service_role in frontend.
 *  - The new RPC service wrapper sends the exact RPC name and never
 *    accepts a provider id from URL/storage (only function args).
 *  - The contracts tab does NOT call the create-contract RPC inline.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => resolve(__dirname, '..', '..', p);
const SERVICE = readFileSync(r('src/services/clientWorkspaceService.ts'), 'utf8');
const CONTRACTS_TAB = readFileSync(
  r('src/components/workspace/WorkspaceContractsTab.tsx'),
  'utf8',
);
const OVERVIEW_TAB = readFileSync(
  r('src/components/workspace/WorkspaceOverviewTab.tsx'),
  'utf8',
);
const LINK_SVC = readFileSync(
  r('src/modules/projects/services/linkProjectProvider.ts'),
  'utf8',
);

describe('PROJECT PROVIDER LINKING — service surface', () => {
  it('clientWorkspaceService exposes linkedProviderBusinessId on the workspace', () => {
    expect(SERVICE).toMatch(/linkedProviderBusinessId:\s*string\s*\|\s*null/);
    expect(SERVICE).toMatch(/selected_provider_business_id/);
  });

  it('link service wrapper calls the exact RPC name and forwards only function args', () => {
    expect(LINK_SVC).toMatch(
      /supabase\.rpc\(\s*['"]link_project_provider_as_client['"]/,
    );
    expect(LINK_SVC).toMatch(/p_project_id:\s*projectId/);
    expect(LINK_SVC).toMatch(/p_provider_business_id:\s*providerBusinessId/);
    // no service_role / no localStorage smuggling
    expect(LINK_SVC).not.toMatch(/service_role/i);
    expect(LINK_SVC).not.toMatch(/localStorage/);
  });
});

describe('PROJECT PROVIDER LINKING — contracts CTA gate', () => {
  it('eligibility uses (linkedProviderBusinessId || businessId) on a project workspace', () => {
    expect(CONTRACTS_TAB).toMatch(/workspace\.linkedProviderBusinessId/);
    expect(CONTRACTS_TAB).toMatch(
      /eligible\s*=\s*workspace\.kind\s*===\s*['"]project['"]\s*&&\s*!!providerBusinessId/,
    );
  });

  it('disabled CTA renders the localized link-a-provider helper copy', () => {
    expect(CONTRACTS_TAB).toMatch(/اربط المشروع بمزود خدمة قبل إنشاء العقد/);
    expect(CONTRACTS_TAB).toMatch(
      /Link a service provider to this project before creating a contract/,
    );
  });

  it('disabled CTA carries an explicit data-testid + aria-disabled', () => {
    expect(CONTRACTS_TAB).toMatch(/workspace-create-contract-disabled/);
    expect(CONTRACTS_TAB).toMatch(/aria-disabled=\{!eligible\}/);
    expect(CONTRACTS_TAB).toMatch(/disabled=\{!eligible\}/);
  });

  it('contracts tab does not call the create-contract RPC inline', () => {
    expect(CONTRACTS_TAB).not.toMatch(/\.rpc\(/);
    expect(CONTRACTS_TAB).not.toMatch(/service_role/i);
  });
});

describe('PROJECT PROVIDER LINKING — overview surface', () => {
  it('overview tab renders a provider section for project workspaces', () => {
    expect(OVERVIEW_TAB).toMatch(/data-testid="workspace-provider-link"/);
    expect(OVERVIEW_TAB).toMatch(/لم يتم ربط مزود خدمة بهذا المشروع/);
    expect(OVERVIEW_TAB).toMatch(/No service provider is linked to this project/);
  });

  it('link CTA is rendered as disabled in this phase (no fake provider picker)', () => {
    expect(OVERVIEW_TAB).toMatch(/data-testid="workspace-link-provider-disabled"/);
    expect(OVERVIEW_TAB).toMatch(
      /ربط مزود الخدمة سيتم تفعيله بعد اعتماد مصدر المزودين/,
    );
    // no direct supabase write inside the overview component
    expect(OVERVIEW_TAB).not.toMatch(/supabase\./);
    expect(OVERVIEW_TAB).not.toMatch(/service_role/i);
  });
});