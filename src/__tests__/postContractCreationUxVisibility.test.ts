/**
 * POST CONTRACT CREATION UX + VISIBILITY CLOSEOUT — source guards.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const TAB = readFileSync(
  resolve(ROOT, 'src/components/workspace/WorkspaceContractsTab.tsx'),
  'utf8',
);
const WRAPPER = readFileSync(
  resolve(ROOT, 'src/modules/contracts/services/createContractFromWorkspace.ts'),
  'utf8',
);

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('WorkspaceContractsTab — post-creation UX', () => {
  it('shows explicit "draft created" success toast in both languages', () => {
    expect(TAB).toContain('تم إنشاء العقد بنجاح كمسودة');
    expect(TAB).toContain('Contract created successfully as a draft');
  });

  it('exposes a "View contract" action on the success toast', () => {
    expect(TAB).toMatch(/<ToastAction\b/);
    expect(TAB).toContain('عرض العقد');
    expect(TAB).toContain('View contract');
  });

  it('navigates to the new contract on success', () => {
    expect(TAB).toMatch(/navigate\(`\/dashboard\/contracts\?id=\$\{contractId\}`\)/);
  });

  it('disables the trigger button while the mutation is pending (no double submit)', () => {
    expect(TAB).toMatch(/disabled=\{!eligible \|\| mutation\.isPending\}/);
    expect(TAB).toMatch(/aria-disabled=\{!eligible \|\| mutation\.isPending\}/);
  });

  it('disables the submit button + marks it aria-busy while pending', () => {
    expect(TAB).toMatch(/data-testid="workspace-create-contract-submit"/);
    expect(TAB).toMatch(/aria-busy=\{mutation\.isPending\}/);
    expect(TAB).toContain('جاري إنشاء العقد...');
    expect(TAB).toContain('Creating contract');
  });

  it('invalidates every contract list surface on success', () => {
    expect(TAB).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['workspace-contracts',\s*workspace\.siteId\]\s*\}\)/);
    expect(TAB).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['dashboard-contracts'\]\s*\}\)/);
    expect(TAB).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['site-contracts',\s*workspace\.siteId\]\s*\}\)/);
    expect(TAB).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['contracts'\]\s*\}\)/);
  });

  it('never surfaces raw RPC/SQL error text on mutation failure', () => {
    const code = stripComments(TAB);
    expect(code).not.toMatch(/err\s+instanceof\s+Error\s*\?\s*err\.message/);
    expect(code).not.toMatch(/title:\s*err\.message/);
    expect(TAB).toContain('تعذّر إنشاء العقد، حاول لاحقًا');
    expect(TAB).toContain('Could not create contract, please try again');
  });
});

describe('WorkspaceContractsTab — lifecycle + safety', () => {
  it('does not call into sign / accept / send / activate flows', () => {
    const code = stripComments(TAB);
    expect(code).not.toMatch(/\b(signContract|acceptContract|sendContract|activateContract|submitContract)\b/);
    expect(code).not.toMatch(/contract_status\s*=\s*'(active|signed|sent|accepted)'/);
  });

  it('does not contain service_role, hardcoded UUIDs, `any`, or ts-ignore', () => {
    const code = stripComments(TAB);
    expect(code).not.toMatch(/service_role/i);
    expect(code).not.toMatch(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    expect(code).not.toMatch(/\bas\s+any\b/);
    expect(code).not.toMatch(/@ts-ignore/);
    expect(code).not.toMatch(/eslint-disable/);
  });

  it('service wrapper still calls only the documented RPC', () => {
    expect(WRAPPER).toMatch(/supabase\.rpc\(\s*\n?\s*['"]create_contract_from_workspace_as_client['"]/);
    const code = stripComments(WRAPPER);
    expect(code).not.toMatch(/\b(sign|accept|send|activate|submit)Contract\b/i);
    expect(code).not.toMatch(/service_role/i);
  });
});
