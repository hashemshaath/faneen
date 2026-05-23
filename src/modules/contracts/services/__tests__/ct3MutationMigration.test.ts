import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

/**
 * CT-3 — Guards that runtime contract mutations / lifecycle RPC callsites
 * now go through the CT-3 service wrappers and no longer reach into
 * supabase directly for the targeted operations.
 */

const NO_DIRECT_CONTRACTS_UPDATE = /\.from\(\s*['"]contracts['"]\s*\)\s*\.\s*update/;
const RPC = (name: string) =>
  new RegExp(`supabase\\.rpc\\(\\s*['"]${name}['"]`);

describe('CT-3 migration: contract mutations + lifecycle RPCs use services', () => {
  it('DashboardContracts uses updateContractById + createContractFromTemplate', () => {
    const s = read('pages/dashboard/DashboardContracts.tsx');
    expect(s).toMatch(/updateContractById\(/);
    expect(s).toMatch(/createContractFromTemplate\(/);
    expect(s).not.toMatch(NO_DIRECT_CONTRACTS_UPDATE);
    expect(s).not.toMatch(RPC('create_contract_from_template'));
  });

  it('ContractDetail recalc uses the mutations service wrapper', () => {
    const s = read('pages/ContractDetail.tsx');
    expect(s).toMatch(/recalcContractTotalService\(/);
    expect(s).not.toMatch(RPC('recalc_contract_total'));
    expect(s).not.toMatch(NO_DIRECT_CONTRACTS_UPDATE);
  });

  it('useContractDraftAutosave uses updateContractDraftAutosave service', () => {
    const s = read('hooks/useContractDraftAutosave.ts');
    expect(s).toMatch(/updateContractDraftAutosave\(/);
    expect(s).not.toMatch(RPC('update_contract_draft_autosave'));
  });

  it('ClientPicker uses searchContractClients + quickResolveContractClient', () => {
    const s = read('components/contracts/ClientPicker.tsx');
    expect(s).toMatch(/searchContractClients\(/);
    expect(s).toMatch(/quickResolveContractClient\(/);
    expect(s).not.toMatch(RPC('search_contract_clients'));
    expect(s).not.toMatch(RPC('quick_resolve_contract_client'));
  });

  it('ExecutionSiteSection uses listClientSitesForContract', () => {
    const s = read('components/contracts/dashboard/create/ExecutionSiteSection.tsx');
    expect(s).toMatch(/listClientSitesForContract\(/);
    expect(s).not.toMatch(RPC('list_client_sites_for_contract'));
  });

  it('VerifyContract uses verifyContractPublic service', () => {
    const s = read('pages/VerifyContract.tsx');
    expect(s).toMatch(/verifyContractPublic\(/);
    expect(s).not.toMatch(RPC('verify_contract_public'));
  });

  it('ContractPdfExportHistory uses listContractPdfExports service', () => {
    const s = read('components/contract/ContractPdfExportHistory.tsx');
    expect(s).toMatch(/listContractPdfExports\(/);
    expect(s).not.toMatch(RPC('list_contract_pdf_exports'));
  });

  it('AdminPdfExportAudit uses admin pdf export services', () => {
    const s = read('pages/admin/AdminPdfExportAudit.tsx');
    expect(s).toMatch(/adminListContractPdfExports\(/);
    expect(s).toMatch(/adminContractPdfExportsSummary\(/);
    expect(s).not.toMatch(RPC('admin_list_contract_pdf_exports'));
    expect(s).not.toMatch(RPC('admin_contract_pdf_exports_summary'));
  });
});