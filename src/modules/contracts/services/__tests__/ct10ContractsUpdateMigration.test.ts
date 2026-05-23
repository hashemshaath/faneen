import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * CT-10 — Guard that no app-layer file directly calls
 * `supabase.from('contracts').update(...)`. All contract row updates
 * must go through `updateContractById` (created in CT-3) so callsites
 * share the same payload contract, eq('id', …) filter, and
 * `{ data, error }` result shape.
 *
 * Service files under `src/modules/contracts/services/**` and test
 * files are intentionally excluded — they are where the centralized
 * Supabase update lives or is verified.
 */

const ROOT = resolve(__dirname, '../../../../../');

function rgCount(pattern: string): number {
  try {
    const out = execSync(
      `rg -nU --no-heading -g '!**/__tests__/**' -g '!src/modules/contracts/services/**' -g '!src/integrations/supabase/**' "${pattern}" src/`,
      { cwd: ROOT, encoding: 'utf8' },
    );
    return out.trim() ? out.trim().split('\n').length : 0;
  } catch (e) {
    // rg exits 1 when no matches — treat as zero.
    const err = e as { status?: number; stdout?: string };
    if (err.status === 1) return 0;
    throw e;
  }
}

describe('CT-10 contracts.update migration', () => {
  it('no direct supabase.from(\'contracts\').update(…) in the app layer', () => {
    // Match `.from('contracts')` or `.from("contracts")` followed (any
    // whitespace, including newlines + chained methods) by `.update(`.
    expect(rgCount("from\\(['\\\"]contracts['\\\"]\\)[^;]*update\\(")).toBe(0);
    expect(rgCount("from\\(['\\\"]contracts['\\\"]\\)\\s*\\.update\\(")).toBe(0);
  });

  it('updateContractById service is exported from the contracts barrel', async () => {
    const mod = await import('@/modules/contracts');
    expect(typeof (mod as { updateContractById?: unknown }).updateContractById).toBe('function');
  });
});