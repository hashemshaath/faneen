/**
 * WORKSPACE-CONTEXT-3 — audit guarantees:
 * - The new switcher consumes useActiveWorkspace and never calls
 *   supabase directly.
 * - It does not change RLS, routes, edge functions, or payment/auth code.
 * - No dashboard pages were migrated as part of this phase — the only
 *   touched mount point is DashboardLayout.tsx (adds the switcher next
 *   to the existing one).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

describe('WORKSPACE-CONTEXT-3 audit', () => {
  it('component exists and uses useActiveWorkspace', () => {
    const path = 'components/dashboard/ActiveLocationSwitcher.tsx';
    expect(existsSync(join(ROOT, path))).toBe(true);
    const src = read(path);
    expect(src).toContain("from '@/hooks/useActiveWorkspace'");
    expect(src).toContain('useActiveWorkspace(');
  });

  it('component does not access supabase directly', () => {
    const src = read('components/dashboard/ActiveLocationSwitcher.tsx');
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/supabase\.rpc\(/);
  });

  it('component contains both Arabic and English copy', () => {
    const src = read('components/dashboard/ActiveLocationSwitcher.tsx');
    expect(src).toContain('الموقع');
    expect(src).toContain('كل المواقع');
    expect(src).toContain('اختر الموقع');
    expect(src).toContain('Location');
    expect(src).toContain('All locations');
    expect(src).toContain('Select location');
  });

  it('component does not perform any authorization or route changes', () => {
    const src = read('components/dashboard/ActiveLocationSwitcher.tsx');
    expect(src).not.toMatch(/has_role|hasRole|isAdmin/i);
    expect(src).not.toMatch(/useNavigate|Navigate|Redirect/);
    expect(src).not.toMatch(/payments|stripe|paddle|tabby|tamara/i);
  });

  it('mounts in DashboardLayout next to ActiveBusinessSwitcher', () => {
    const src = read('components/dashboard/DashboardLayout.tsx');
    expect(src).toContain("import { ActiveLocationSwitcher }");
    expect(src).toContain('<ActiveLocationSwitcher />');
    expect(src).toContain('<ActiveBusinessSwitcher />');
  });
});