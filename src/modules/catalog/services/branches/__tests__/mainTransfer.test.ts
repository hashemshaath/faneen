import { describe, it, expect } from 'vitest';
import {
  computeMainBranchTransferPlan,
  validateSingleMainInvariant,
  type BranchLike,
} from '../mainTransfer';

const make = (id: string, is_main: boolean, branch_type: string | null = is_main ? 'main' : 'branch'): BranchLike => ({
  id, business_id: 'b1', name_ar: `فرع ${id}`, is_main, branch_type,
});

describe('computeMainBranchTransferPlan', () => {
  it('throws when the target branch is not in the list', () => {
    expect(() => computeMainBranchTransferPlan([make('a', true)], 'missing'))
      .toThrow(/Branch not found/);
  });

  it('is a no-op when target is already the only main', () => {
    const plan = computeMainBranchTransferPlan([make('a', true)], 'a');
    expect(plan.noop).toBe(true);
    expect(plan.steps).toEqual([]);
  });

  it('demotes the previous main and promotes the target with type sync', () => {
    const plan = computeMainBranchTransferPlan(
      [make('a', true, 'main'), make('b', false, 'branch')],
      'b',
    );
    expect(plan.noop).toBe(false);
    expect(plan.previous?.id).toBe('a');
    expect(plan.next.id).toBe('b');
    // Order matters: demote first, then promote.
    expect(plan.steps).toEqual([
      { branchId: 'a', field: 'is_main', from: 'true', to: 'false' },
      { branchId: 'a', field: 'branch_type', from: 'main', to: 'branch' },
      { branchId: 'b', field: 'is_main', from: 'false', to: 'true' },
      { branchId: 'b', field: 'branch_type', from: 'branch', to: 'main' },
    ]);
  });

  it('promotes a target when there is no current main', () => {
    const plan = computeMainBranchTransferPlan(
      [make('a', false, 'branch'), make('b', false, 'warehouse')],
      'b',
    );
    expect(plan.previous).toBeNull();
    expect(plan.steps).toEqual([
      { branchId: 'b', field: 'is_main', from: 'false', to: 'true' },
      { branchId: 'b', field: 'branch_type', from: 'warehouse', to: 'main' },
    ]);
  });
});

describe('validateSingleMainInvariant — mirrors DB triggers', () => {
  it('passes for one main with type=main', () => {
    const r = validateSingleMainInvariant([make('a', true), make('b', false)]);
    expect(r.ok).toBe(true);
    expect(r.mainCount).toBe(1);
  });

  it('passes for zero mains (transient state)', () => {
    const r = validateSingleMainInvariant([make('a', false), make('b', false)]);
    expect(r.ok).toBe(true);
    expect(r.mainCount).toBe(0);
  });

  it('fails when two branches are marked main', () => {
    const r = validateSingleMainInvariant([make('a', true), make('b', true)]);
    expect(r.ok).toBe(false);
    expect(r.mainCount).toBe(2);
  });

  it('fails when is_main=true but branch_type<>main', () => {
    const r = validateSingleMainInvariant([make('a', true, 'branch')]);
    expect(r.ok).toBe(false);
    expect(r.mismatched.map(b => b.id)).toEqual(['a']);
  });

  it('fails when is_main=false but branch_type=main', () => {
    const r = validateSingleMainInvariant([make('a', false, 'main')]);
    expect(r.ok).toBe(false);
    expect(r.mismatched.map(b => b.id)).toEqual(['a']);
  });

  it('replaying a planned transfer keeps the invariant valid', () => {
    const initial = [make('a', true, 'main'), make('b', false, 'branch')];
    const plan = computeMainBranchTransferPlan(initial, 'b');
    const after = initial.map(br => {
      let copy = { ...br };
      for (const s of plan.steps) {
        if (s.branchId !== br.id) continue;
        if (s.field === 'is_main') copy.is_main = s.to === 'true';
        else copy.branch_type = s.to;
      }
      return copy;
    });
    const r = validateSingleMainInvariant(after);
    expect(r.ok).toBe(true);
    expect(after.find(b => b.id === 'b')?.is_main).toBe(true);
    expect(after.find(b => b.id === 'b')?.branch_type).toBe('main');
    expect(after.find(b => b.id === 'a')?.is_main).toBe(false);
    expect(after.find(b => b.id === 'a')?.branch_type).toBe('branch');
  });
});