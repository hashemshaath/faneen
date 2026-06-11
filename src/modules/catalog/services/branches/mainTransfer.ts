/**
 * Pure helpers for the "set main branch" flow used by the dashboard
 * confirmation panel. Keeping the logic outside React makes it easy to
 * unit-test the rules that mirror the DB triggers:
 *   - exactly one main branch per business
 *   - moving "main" demotes the previous main
 *   - branch_type stays in sync with is_main
 */

export interface BranchLike {
  id: string;
  business_id?: string;
  name_ar: string;
  is_main: boolean;
  branch_type?: string | null;
}

export interface MainBranchTransferPlan {
  /** The branch that will become main after the transfer. */
  next: BranchLike;
  /** The branch that is currently main, if any (will be demoted). */
  previous: BranchLike | null;
  /** True when the target is already the main branch — no-op. */
  noop: boolean;
  /** Human-readable list of mutations, in order. */
  steps: Array<{
    branchId: string;
    field: 'is_main' | 'branch_type';
    from: string;
    to: string;
  }>;
}

/**
 * Compute the deterministic plan for promoting `targetId` to main. Throws
 * when the target does not belong to the supplied list — mirrors the DB
 * `set_main_branch` "Branch not found" guard.
 */
export function computeMainBranchTransferPlan(
  branches: BranchLike[],
  targetId: string,
): MainBranchTransferPlan {
  const next = branches.find((b) => b.id === targetId);
  if (!next) throw new Error('Branch not found');

  const previous = branches.find((b) => b.is_main && b.id !== targetId) ?? null;

  if (next.is_main && !previous) {
    return { next, previous: null, noop: true, steps: [] };
  }

  const steps: MainBranchTransferPlan['steps'] = [];
  if (previous) {
    steps.push({ branchId: previous.id, field: 'is_main', from: 'true', to: 'false' });
    if ((previous.branch_type ?? 'main') === 'main') {
      steps.push({ branchId: previous.id, field: 'branch_type', from: 'main', to: 'branch' });
    }
  }
  steps.push({ branchId: next.id, field: 'is_main', from: String(next.is_main), to: 'true' });
  if ((next.branch_type ?? 'branch') !== 'main') {
    steps.push({
      branchId: next.id,
      field: 'branch_type',
      from: next.branch_type ?? 'branch',
      to: 'main',
    });
  }
  return { next, previous, noop: false, steps };
}

/**
 * Validate that a list of branches respects the "single main" invariant.
 * Used by automated tests and admin tooling.
 */
export function validateSingleMainInvariant(branches: BranchLike[]): {
  ok: boolean;
  mainCount: number;
  mismatched: BranchLike[];
} {
  const mains = branches.filter((b) => b.is_main);
  const mismatched = branches.filter((b) =>
    (b.is_main && (b.branch_type ?? 'main') !== 'main')
    || (!b.is_main && b.branch_type === 'main'),
  );
  return { ok: mains.length <= 1 && mismatched.length === 0, mainCount: mains.length, mismatched };
}