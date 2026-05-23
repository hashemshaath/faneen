import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

/**
 * CT-11 — Guards that runtime contract analytics RPC access in the app
 * layer goes through the new wrappers and no longer reaches
 * `supabase.rpc('get_*contract_analytics_dashboard', ...)` directly.
 */
const NO_PROVIDER_RPC = /supabase\.rpc\(\s*['"]get_contract_analytics_dashboard['"]/;
const NO_ADMIN_RPC = /supabase\.rpc\(\s*['"]get_admin_contract_analytics_dashboard['"]/;

describe('CT-11 analytics migration: DashboardContractAnalytics', () => {
  const s = read('pages/dashboard/DashboardContractAnalytics.tsx');

  it('no direct provider analytics RPC', () => {
    expect(s).not.toMatch(NO_PROVIDER_RPC);
  });

  it('uses getContractAnalyticsDashboard wrapper', () => {
    expect(s).toMatch(/getContractAnalyticsDashboard\(/);
    expect(s).toMatch(/from '@\/modules\/contracts'/);
  });

  it('preserves _business_id/_period/_scope arg shape', () => {
    expect(s).toMatch(/_business_id:\s*effectiveBusinessId\s*\?\?\s*undefined/);
    expect(s).toMatch(/_period:\s*period/);
    expect(s).toMatch(/_scope:\s*'provider'/);
  });

  it('preserves error handling (throw rpcError)', () => {
    expect(s).toMatch(/if\s*\(rpcError\)\s*throw\s+rpcError/);
  });
});

describe('CT-11 analytics migration: AdminContractAnalytics', () => {
  const s = read('pages/admin/AdminContractAnalytics.tsx');

  it('no direct admin analytics RPC', () => {
    expect(s).not.toMatch(NO_ADMIN_RPC);
  });

  it('uses getAdminContractAnalyticsDashboard wrapper', () => {
    expect(s).toMatch(/getAdminContractAnalyticsDashboard\(/);
    expect(s).toMatch(/from '@\/modules\/contracts'/);
  });

  it('preserves _period/_business_id/_include_demo arg shape', () => {
    expect(s).toMatch(/_period:\s*period/);
    expect(s).toMatch(/_business_id:\s*undefined/);
    expect(s).toMatch(/_include_demo:\s*includeDemo/);
  });

  it('preserves error handling (throw rpcError)', () => {
    expect(s).toMatch(/if\s*\(rpcError\)\s*throw\s+rpcError/);
  });
});

describe('CT-11 regression guard: zero direct runtime contract RPCs in app layer', () => {
  // Runtime contract RPCs that should be fully routed through services.
  // PDF export RPCs (record_contract_pdf_export, list_*pdf_exports*) are
  // intentionally deferred to CT-12.
  const RUNTIME_RPCS = [
    'update_contract_draft_autosave',
    'search_contract_clients',
    'quick_resolve_contract_client',
    'list_client_sites_for_contract',
    'create_contract_from_template',
    'verify_contract_public',
    'recalc_contract_total',
    'accept_contract',
    'send_contract_for_approval',
    'clone_contract_as_draft',
    'set_contract_execution_site',
    'link_lead_to_contract',
    'complete_contract_from_invitation',
    'get_contract_analytics_dashboard',
    'get_admin_contract_analytics_dashboard',
    'prepare_contract_prefill_from_lead',
    'get_contract_source_lead_summary',
    'approve_contract_amendment',
    'reject_contract_amendment',
    'cancel_contract_amendment',
    'apply_contract_amendment',
    'create_client_invitation',
    'resend_client_invitation',
    'cancel_client_invitation',
  ];

  it('app layer (excluding services/tests/generated) has no direct rpc calls to these', () => {
    const pattern = RUNTIME_RPCS.map((n) => `rpc\\([\\s'"\`]*${n}`).join('|');
    let out = '';
    try {
      out = execSync(
        `rg -n --no-heading -e "${pattern}" src/ ` +
          `--glob '!src/modules/contracts/**' ` +
          `--glob '!src/**/__tests__/**' ` +
          `--glob '!src/test/**' ` +
          `--glob '!src/integrations/**'`,
        { cwd: resolve(__dirname, '../../../../../'), encoding: 'utf8' },
      );
    } catch (e: unknown) {
      // rg exits 1 when no matches — that is the success case.
      const err = e as { status?: number; stdout?: string };
      if (err.status === 1) out = '';
      else throw e;
    }
    expect(out.trim()).toBe('');
  });
});