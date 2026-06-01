/**
 * SERVICE-ACTIVATION-GOVERNANCE-2 — Phase F
 *
 * Verifies the admin mutation wrappers produce the right update payloads
 * and stamp `reviewed_by` / `reviewed_at` where appropriate. Uses a
 * thenable builder stub so we can assert the exact patch object.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Patch = Record<string, unknown>;

let lastTable: string | null = null;
let lastPatch: Patch | null = null;
let lastEq: { col: string; val: unknown } | null = null;

function makeBuilder() {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown;
  b.update = vi.fn((p: Patch) => {
    lastPatch = p;
    return chain();
  });
  b.eq = vi.fn((col: string, val: unknown) => {
    lastEq = { col, val };
    return chain();
  });
  b.select = vi.fn(chain);
  b.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  b.then = (cb: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(cb);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((t: string) => {
      lastTable = t;
      return makeBuilder();
    }),
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'admin-1' } } })) },
  },
}));

import {
  adminApproveProviderService,
  adminRejectProviderService,
  adminSuspendProviderService,
  adminRestoreProviderService,
  adminSetRequiredPlanTier,
  adminClearRequiredPlanTier,
  adminSetRequiresReview,
  adminSetPremiumService,
  adminSetFeaturedService,
  adminUpdateServiceActivationNote,
} from '../services/admin';

beforeEach(() => {
  lastTable = null;
  lastPatch = null;
  lastEq = null;
});

describe('providerServices admin mutations', () => {
  it('approve sets allowed, clears rejection, clears review, stamps reviewer', async () => {
    await adminApproveProviderService('row-1', 'looks good');
    expect(lastTable).toBe('business_services');
    expect(lastEq).toEqual({ col: 'id', val: 'row-1' });
    expect(lastPatch).toMatchObject({
      admin_status: 'allowed',
      rejection_reason: null,
      requires_admin_review: false,
      admin_note: 'looks good',
      reviewed_by: 'admin-1',
    });
    expect(typeof lastPatch?.reviewed_at).toBe('string');
  });

  it('reject stores reason and disables legacy is_active', async () => {
    await adminRejectProviderService('row-2', 'not eligible');
    expect(lastPatch).toMatchObject({
      admin_status: 'rejected',
      rejection_reason: 'not eligible',
      is_active: false,
      reviewed_by: 'admin-1',
    });
  });

  it('suspend stores reason and disables legacy is_active', async () => {
    await adminSuspendProviderService('row-3', 'policy violation');
    expect(lastPatch).toMatchObject({
      admin_status: 'suspended',
      rejection_reason: 'policy violation',
      is_active: false,
    });
  });

  it('restore clears to allowed without legacy is_active flip', async () => {
    await adminRestoreProviderService('row-4');
    expect(lastPatch).toMatchObject({
      admin_status: 'allowed',
      rejection_reason: null,
    });
    expect(lastPatch).not.toHaveProperty('is_active');
  });

  it('setRequiredPlanTier writes only the tier', async () => {
    await adminSetRequiredPlanTier('row-5', 'premium');
    expect(lastPatch).toEqual({ required_plan_tier: 'premium' });
  });

  it('clearRequiredPlanTier nulls the tier', async () => {
    await adminClearRequiredPlanTier('row-6');
    expect(lastPatch).toEqual({ required_plan_tier: null });
  });

  it('setRequiresReview true also flips admin_status to pending_review', async () => {
    await adminSetRequiresReview('row-7', true);
    expect(lastPatch).toEqual({
      requires_admin_review: true,
      admin_status: 'pending_review',
    });
  });

  it('setRequiresReview false only clears the flag', async () => {
    await adminSetRequiresReview('row-8', false);
    expect(lastPatch).toEqual({ requires_admin_review: false });
  });

  it('setPremium / setFeatured write boolean flags only', async () => {
    await adminSetPremiumService('row-9', true);
    expect(lastPatch).toEqual({ is_premium_service: true });
    await adminSetFeaturedService('row-10', false);
    expect(lastPatch).toEqual({ is_featured: false });
  });

  it('updateNote writes only admin_note', async () => {
    await adminUpdateServiceActivationNote('row-11', 'hello');
    expect(lastPatch).toEqual({ admin_note: 'hello' });
  });
});