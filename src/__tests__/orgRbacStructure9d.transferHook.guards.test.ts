/**
 * ORG-RBAC-STRUCTURE-9D — Guard tests for the client wrapper + hook.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const ALL = walk(SRC);
const PAGES = ALL.filter((p) => p.includes(`${SRC}/pages/`));

const HOOK = readFileSync(join(SRC, 'hooks/useTransferPrimaryManagerMutation.ts'), 'utf8');
const SERVICE = readFileSync(join(SRC, 'modules/businesses/services/transferPrimaryManager.ts'), 'utf8');

describe('ORG-RBAC-STRUCTURE-9D guards', () => {
  it('no page calls transfer_primary_manager RPC directly', () => {
    const offenders = PAGES.filter((p) => /transfer_primary_manager/.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('only the service file references the RPC string', () => {
    const offenders = ALL.filter((p) => {
      if (p.endsWith('transferPrimaryManager.ts')) return false;
      if (p.includes('/__tests__/')) return false;
      if (p.endsWith('integrations/supabase/types.ts')) return false;
      return /['"]transfer_primary_manager['"]/.test(readFileSync(p, 'utf8'));
    });
    expect(offenders).toEqual([]);
  });

  it('hook uses the service wrapper, not supabase.rpc directly', () => {
    expect(HOOK).toMatch(/from '@\/modules\/businesses\/services\/transferPrimaryManager'/);
    expect(HOOK).not.toMatch(/supabase\.rpc/);
  });

  it('hook does not import pages, UI components, toasts, or navigation', () => {
    expect(HOOK).not.toMatch(/from '@\/pages/);
    expect(HOOK).not.toMatch(/from '@\/components/);
    expect(HOOK).not.toMatch(/use-toast|useToast|sonner/);
    expect(HOOK).not.toMatch(/useNavigate|react-router/);
  });

  it('hook invalidates the documented query keys on success', () => {
    expect(HOOK).toMatch(/invalidateQueries/);
    expect(HOOK).toMatch(/business-staff/);
    expect(HOOK).toMatch(/workspace/);
  });

  it('service does not mutate ownership / auth / payments / memberships', () => {
    expect(SERVICE).not.toMatch(/auth\.users/i);
    expect(SERVICE).not.toMatch(/from\(\s*['"]businesses['"]\s*\)/);
    expect(SERVICE).not.toMatch(/payments|memberships/i);
    expect(SERVICE).not.toMatch(/\.update\(/);
  });

  it('service does not enforce owner-is-primary-manager', () => {
    expect(SERVICE).not.toMatch(/owner.*must.*primary/i);
  });
});
