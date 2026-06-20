/**
 * Saved-views shape + persistence helpers for `/admin/businesses`.
 *
 * Extracted from `AdminBusinesses.tsx` as a behavior-preserving refactor.
 * Pure URL helpers — no React, no I/O.
 */

export interface BizViewFilters extends Record<string, unknown> {
  q: string;
  status: string;
  tier: string;
  translation: string;
  origin: string;
  sort: string;
}

/**
 * Build a URLSearchParams instance for a saved view, dropping the
 * default values that the page would otherwise omit from the URL.
 * Keeps URL semantics identical to the original inline implementation.
 */
export function toSavedViewParams(f: BizViewFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set('q', f.q);
  if (f.status && f.status !== 'all') sp.set('status', f.status);
  if (f.tier && f.tier !== 'all') sp.set('tier', f.tier);
  if (f.translation && f.translation !== 'all') sp.set('translation', f.translation);
  if (f.origin && f.origin !== 'all') sp.set('origin', f.origin);
  if (f.sort && f.sort !== 'recent') sp.set('sort', f.sort);
  return sp;
}