import { describe, it, expect, vi } from 'vitest';
import { runBulkReview } from '@/pages/admin/approvalsCenter/bulkReview';

const REVIEWER = 'USR-1000017';

describe('runBulkReview — orchestration & audit-trail contract', () => {
  it('approves every entity_access item sequentially with the same reviewer', async () => {
    const calls: Array<{ requestId: string; reviewerUserId: string; action: string; at: number }> = [];
    const reviewFn = vi.fn(async (input: { requestId: string; reviewerUserId: string; action: 'approve' | 'reject' }) => {
      calls.push({ ...input, at: performance.now() });
      return { ok: true, error: null };
    });

    const items = [
      { id: 'EAR-1', category: 'entity_access' },
      { id: 'EAR-2', category: 'entity_access' },
      { id: 'EAR-3', category: 'entity_access' },
    ];
    const summary = await runBulkReview({ items, action: 'approve', reviewerUserId: REVIEWER, reviewFn });

    expect(summary.ok).toBe(3);
    expect(summary.fail).toBe(0);
    expect(summary.results.map((r) => r.id)).toEqual(['EAR-1', 'EAR-2', 'EAR-3']);
    // Sequential ordering — each call's timestamp is non-decreasing.
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i].at).toBeGreaterThanOrEqual(calls[i - 1].at);
    }
    // Audit-trail contract: exactly one mutation per item, all with reviewer attribution.
    expect(reviewFn).toHaveBeenCalledTimes(3);
    for (const c of calls) {
      expect(c.reviewerUserId).toBe(REVIEWER);
      expect(c.action).toBe('approve');
    }
  });

  it('skips non-entity_access categories so the audit log only records actionable items', async () => {
    const reviewFn = vi.fn(async () => ({ ok: true, error: null }));
    const items = [
      { id: 'EAR-1', category: 'entity_access' },
      { id: 'ENT-9', category: 'provider_review' },
      { id: 'EAR-2', category: 'entity_access' },
      { id: 'SUB-1', category: 'subscriptions' },
    ];
    const summary = await runBulkReview({ items, action: 'reject', reviewerUserId: REVIEWER, reviewFn });
    expect(reviewFn).toHaveBeenCalledTimes(2);
    expect(summary.ok).toBe(2);
    expect(summary.results.map((r) => r.id)).toEqual(['EAR-1', 'EAR-2']);
    // Rejected actions must propagate through unchanged.
    expect(reviewFn).toHaveBeenNthCalledWith(1, { requestId: 'EAR-1', reviewerUserId: REVIEWER, action: 'reject' });
    expect(reviewFn).toHaveBeenNthCalledWith(2, { requestId: 'EAR-2', reviewerUserId: REVIEWER, action: 'reject' });
  });

  it('records partial failures without aborting the batch', async () => {
    const reviewFn = vi.fn(async ({ requestId }) => {
      if (requestId === 'EAR-2') return { ok: false, error: new Error('request_not_pending') };
      return { ok: true, error: null };
    });
    const summary = await runBulkReview({
      items: [
        { id: 'EAR-1', category: 'entity_access' },
        { id: 'EAR-2', category: 'entity_access' },
        { id: 'EAR-3', category: 'entity_access' },
      ],
      action: 'approve', reviewerUserId: REVIEWER, reviewFn,
    });
    expect(summary.ok).toBe(2);
    expect(summary.fail).toBe(1);
    expect(summary.results.find((r) => r.id === 'EAR-2')?.ok).toBe(false);
    expect((summary.results.find((r) => r.id === 'EAR-2')?.error as Error).message).toBe('request_not_pending');
  });

  it('returns a duration measurement (perf signal for dev/CI dashboards)', async () => {
    const reviewFn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 2));
      return { ok: true, error: null };
    });
    const summary = await runBulkReview({
      items: Array.from({ length: 10 }, (_, i) => ({ id: `EAR-${i}`, category: 'entity_access' })),
      action: 'approve', reviewerUserId: REVIEWER, reviewFn,
    });
    expect(summary.ok).toBe(10);
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('no-ops cleanly when nothing actionable is selected', async () => {
    const reviewFn = vi.fn(async () => ({ ok: true, error: null }));
    const summary = await runBulkReview({
      items: [
        { id: 'ENT-1', category: 'provider_review' },
        { id: 'SUB-1', category: 'subscriptions' },
      ],
      action: 'approve', reviewerUserId: REVIEWER, reviewFn,
    });
    expect(reviewFn).not.toHaveBeenCalled();
    expect(summary.ok).toBe(0);
    expect(summary.fail).toBe(0);
  });
});