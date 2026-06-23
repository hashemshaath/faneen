/**
 * ENABLE CONTRACT CREATION FROM LINKED PROJECT — guard tests.
 *
 * Locks in:
 *  - The RPC `create_contract_from_workspace_as_client` derives the
 *    provider business from `selected_provider_business_id` (new
 *    project ↔ provider linking) and falls back to `business_id`
 *    (legacy business-owned projects).
 *  - The contract row is inserted with `business_id` set to the
 *    derived provider business, not the (possibly null) legacy
 *    `project.business_id`.
 *  - Ownership / provider-validity / client≠provider / standalone-site
 *    guards remain in the function — they are NOT relaxed.
 *  - The function stays SECURITY DEFINER with `search_path = public`
 *    and is only granted to `authenticated` (no public, no anon).
 *  - The service wrapper and the workspace contracts tab keep their
 *    no-client-id / no-provider-id / no-service-role contracts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

function latestMigrationFor(needle: string): string {
  const dir = join(ROOT, 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of [...files].reverse()) {
    const txt = readFileSync(join(dir, f), 'utf8');
    if (txt.includes(needle)) return txt;
  }
  throw new Error(`No migration found containing ${needle}`);
}

const RPC_SRC = latestMigrationFor('create_contract_from_workspace_as_client');
const WRAPPER = readFileSync(
  resolve(ROOT, 'src/modules/contracts/services/createContractFromWorkspace.ts'),
  'utf8',
);
const TAB = readFileSync(
  resolve(ROOT, 'src/components/workspace/WorkspaceContractsTab.tsx'),
  'utf8',
);

describe('RPC create_contract_from_workspace_as_client — provider derivation', () => {
  it('derives provider business via COALESCE(selected_provider_business_id, business_id)', () => {
    expect(RPC_SRC).toMatch(
      /COALESCE\(\s*v_project\.selected_provider_business_id\s*,\s*v_project\.business_id\s*\)/,
    );
  });

  it('uses the derived provider business id when inserting the contract', () => {
    // Insert order: client_id, provider_id, business_id, ...
    expect(RPC_SRC).toMatch(/VALUES\s*\(\s*v_uid,\s*v_provider_id,\s*v_provider_business_id/);
  });

  it('still requires a valid business row with a real owner user', () => {
    expect(RPC_SRC).toMatch(/IF NOT FOUND OR v_business\.user_id IS NULL THEN/);
    expect(RPC_SRC).toMatch(/PROVIDER_NOT_DERIVABLE/);
  });

  it('still rejects projects the caller does not own', () => {
    expect(RPC_SRC).toMatch(/owner_user_id IS NULL OR v_project\.owner_user_id <> v_uid/);
    expect(RPC_SRC).toMatch(/NOT_WORKSPACE_OWNER/);
  });

  it('still refuses standalone site workspaces (no derivable provider)', () => {
    expect(RPC_SRC).toMatch(/Standalone site has no derivable provider/);
  });

  it('still blocks the caller from acting as both client and provider', () => {
    expect(RPC_SRC).toMatch(/v_provider_id = v_uid/);
    expect(RPC_SRC).toMatch(/CLIENT_CANNOT_BE_PROVIDER/);
  });

  it('keeps SECURITY DEFINER + search_path=public + authenticated-only grant', () => {
    expect(RPC_SRC).toMatch(/SECURITY DEFINER/);
    expect(RPC_SRC).toMatch(/SET search_path = public/);
    expect(RPC_SRC).toMatch(/REVOKE ALL ON FUNCTION public\.create_contract_from_workspace_as_client/);
    expect(RPC_SRC).toMatch(/GRANT EXECUTE ON FUNCTION public\.create_contract_from_workspace_as_client[^;]*TO authenticated/);
    expect(RPC_SRC).not.toMatch(/TO\s+anon\b/);
    expect(RPC_SRC).not.toMatch(/TO\s+PUBLIC\b/);
  });

  it('still creates the contract in draft status (lifecycle untouched)', () => {
    expect(RPC_SRC).toMatch(/'draft'::contract_status/);
  });
});

describe('Frontend wiring — no provider/client smuggling', () => {
  it('service wrapper never accepts client_id or provider_id from callers', () => {
    // Strip comments before checking so doc references like
    // "never accepts client_id" do not register as actual smuggling.
    const code = WRAPPER.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\bclient_id\b/);
    expect(code).not.toMatch(/\bprovider_id\b/);
    expect(code).not.toMatch(/service_role/i);
  });

  it('service wrapper calls the exact RPC name with only the four documented args', () => {
    expect(WRAPPER).toMatch(/supabase\.rpc\(\s*\n?\s*['"]create_contract_from_workspace_as_client['"]/);
    expect(WRAPPER).toMatch(/_workspace_kind:\s*input\.kind/);
    expect(WRAPPER).toMatch(/_workspace_id:\s*input\.workspaceId/);
    expect(WRAPPER).toMatch(/_template_version_id:\s*input\.templateVersionId/);
    expect(WRAPPER).toMatch(/_payload:/);
  });

  it('workspace contracts tab does not render ClientPicker and does not call RPC inline', () => {
    const code = TAB.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/<ClientPicker\b/);
    expect(code).not.toMatch(/\.rpc\(/);
    expect(code).not.toMatch(/service_role/i);
  });

  it('eligibility still uses (linkedProviderBusinessId ?? businessId) — matches the new RPC derivation', () => {
    expect(TAB).toMatch(/workspace\.linkedProviderBusinessId\s*\?\?\s*workspace\.businessId/);
    expect(TAB).toMatch(/eligible\s*=\s*workspace\.kind\s*===\s*['"]project['"]\s*&&\s*!!providerBusinessId/);
  });

  it('disabled CTA still shows the link-a-provider helper copy', () => {
    expect(TAB).toContain('اربط المشروع بمزود خدمة قبل إنشاء العقد');
    expect(TAB).toContain('Link a service provider to this project before creating a contract');
  });

  it('RPC and wrapper contain no hardcoded UUIDs', () => {
    const uuid = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    expect(RPC_SRC).not.toMatch(uuid);
    expect(WRAPPER).not.toMatch(uuid);
  });
});