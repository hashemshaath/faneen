/**
 * CLIENT WORKSPACE UNIFICATION — Phase 2 guards.
 *
 * Static-source assertions only. No DB, no network, no mutations.
 * Verifies that the read-only contracts query is correctly scoped to
 * `contracts.execution_site_id` and that no contract-creation RPC was
 * introduced in the workspace surface.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf-8');

const FILES = [
  'src/services/clientWorkspaceService.ts',
  'src/pages/dashboard/DashboardWorkspaces.tsx',
  'src/pages/dashboard/DashboardWorkspaceDetail.tsx',
  'src/components/workspace/WorkspaceContractsTab.tsx',
  'src/components/workspace/WorkspaceFilesTab.tsx',
  'src/components/workspace/WorkspaceOverviewTab.tsx',
  'src/components/workspace/WorkspaceComingSoonTab.tsx',
] as const;

describe('CLIENT WORKSPACE UNIFICATION PHASE 2 — guards', () => {
  it('contracts list is scoped to execution_site_id', () => {
    const svc = read('src/services/clientWorkspaceService.ts');
    expect(svc).toMatch(/\.from\(['"]contracts['"]\)/);
    expect(svc).toMatch(/\.eq\(['"]execution_site_id['"]\s*,\s*siteId\)/);
  });

  it('no contract-creation RPC is called from workspace surface', () => {
    for (const f of FILES) {
      const src = read(f);
      // Strip block + line comments before searching for actual RPC calls,
      // so explanatory comments in the service header don't trip the guard.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      expect(code, `${f} must not call create_contract_from_template`).not.toMatch(
        /\.rpc\(\s*['"]create_contract_from_template['"]/,
      );
      expect(
        code,
        `${f} must not call create_contract_from_workspace_as_client`,
      ).not.toMatch(/\.rpc\(\s*['"]create_contract_from_workspace_as_client['"]/);
    }
  });

  it('workspace files do not contain any/as any/ts-ignore/eslint-disable/service_role/hex', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} has 'as any'`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${f} has ': any'`).not.toMatch(/:\s*any\b/);
      expect(src, `${f} has ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${f} has eslint-disable`).not.toMatch(/eslint-disable/);
      expect(src, `${f} references service_role`).not.toMatch(/service_role/);
      expect(src, `${f} has hardcoded hex`).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    }
  });

  it('create-contract CTA is conditional with helper text and goes through the service wrapper', () => {
    const tab = read('src/components/workspace/WorkspaceContractsTab.tsx');
    // Both eligible/ineligible testids must exist as the rendered value
    // of `data-testid` (a ternary over `eligible`).
    expect(tab).toMatch(
      /data-testid=\{eligible\s*\?\s*['"]workspace-create-contract['"]\s*:\s*['"]workspace-create-contract-disabled['"]\}/,
    );
    expect(tab).toMatch(/aria-disabled=\{!eligible\}/);
    expect(tab).toMatch(/disabled=\{!eligible\}/);
    expect(tab).toMatch(
      /لا يمكن إنشاء عقد حتى يتم ربط المشروع بمزود خدمة/,
    );
    // Writes must go through the service wrapper; no inline RPC.
    expect(tab).not.toMatch(/\.rpc\(/);
  });

  it('My Sites surfaces never trigger contract creation', () => {
    const sites = read('src/pages/dashboard/DashboardSites.tsx');
    const siteDetail = read('src/pages/dashboard/DashboardSiteDetail.tsx');
    for (const src of [sites, siteDetail]) {
      expect(src).not.toMatch(/create_contract_from_workspace_as_client/);
      expect(src).not.toMatch(/create_contract_from_template/);
      expect(src).not.toMatch(/workspace-create-contract['"]/);
      // Only navigation to contracts pages is allowed — no mutations.
      expect(src).not.toMatch(/useMutation\([^)]*createContractFromWorkspace/);
    }
  });

  it('detail page tabs wrap on mobile (h-auto + flex-wrap)', () => {
    const detail = read('src/pages/dashboard/DashboardWorkspaceDetail.tsx');
    expect(detail).toMatch(/flex-wrap/);
    expect(detail).toMatch(/h-auto/);
  });

  it('list page renders an EmptyState when there are no workspaces', () => {
    const list = read('src/pages/dashboard/DashboardWorkspaces.tsx');
    expect(list).toMatch(/workspaces\.length\s*===\s*0/);
    expect(list).toMatch(/<EmptyState/);
  });
});