/**
 * Pure orchestrator for bulk Approve/Reject runs. The actual per-item
 * mutation is dependency-injected so the page can pass the real
 * `reviewEntityAccessRequest`, while tests can inject a fake. This keeps
 * audit-trail behaviour (one DB write + one notification per item) fully
 * preserved — we just iterate the same single-item action.
 */

export interface BulkReviewItem {
  id: string;
  category: string;
}

export interface BulkReviewResult {
  id: string;
  ok: boolean;
  error: unknown;
}

export interface BulkReviewSummary {
  ok: number;
  fail: number;
  results: BulkReviewResult[];
  /** Wall-clock duration in ms, useful for perf logging in dev. */
  durationMs: number;
}

export type ReviewFn = (input: {
  requestId: string;
  reviewerUserId: string;
  action: 'approve' | 'reject';
}) => Promise<{ ok: boolean; error: unknown }>;

/**
 * Sequentially review a batch of entity-access items. Sequential (not
 * parallel) on purpose: matches what a human would do and avoids hammering
 * the audit log / notification triggers with a burst.
 *
 * Only items with `category === 'entity_access'` are processed — other
 * categories don't have an inline approve action and are silently skipped.
 */
export async function runBulkReview(args: {
  items: BulkReviewItem[];
  action: 'approve' | 'reject';
  reviewerUserId: string;
  /**
   * Backwards-compatible: when provided, `reviewFn` is used for every
   * `entity_access` item (legacy single-category mode). Prefer the new
   * `getReviewer` resolver to support every actionable category.
   */
  reviewFn?: ReviewFn;
  /** Resolver that returns the right mutation per category, or null to skip. */
  getReviewer?: (category: string) => ReviewFn | null;
}): Promise<BulkReviewSummary> {
  const { items, action, reviewerUserId, reviewFn, getReviewer } = args;
  const start = Date.now();
  const results: BulkReviewResult[] = [];
  let ok = 0, fail = 0;
  for (const it of items) {
    const fn = getReviewer
      ? getReviewer(it.category)
      : it.category === 'entity_access' ? (reviewFn ?? null) : null;
    if (!fn) continue;
    const res = await fn({ requestId: it.id, reviewerUserId, action });
    results.push({ id: it.id, ok: res.ok, error: res.error });
    if (res.ok) ok += 1; else fail += 1;
  }
  return { ok, fail, results, durationMs: Date.now() - start };
}