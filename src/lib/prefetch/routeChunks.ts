/**
 * Route-chunk prefetch registry — kicks off the JS chunk for a target route
 * on hover/focus/touchstart so the click→open sequence skips the download
 * stage. Complements React Query's data prefetch.
 *
 * Each entry is a bare dynamic import; the browser adds it to its module
 * graph and warms the HTTP cache. Idempotent — resolved promises are
 * memoized so hover-spam is free.
 */

const prefetched = new Map<string, Promise<unknown>>();

const run = (name: string, importer: () => Promise<unknown>): Promise<unknown> => {
  const existing = prefetched.get(name);
  if (existing) return existing;
  const p = importer().catch((err) => {
    // Opportunistic — real navigation still uses lazyRetry.
    prefetched.delete(name);
    throw err;
  });
  prefetched.set(name, p);
  return p;
};

/** Prefetch the BusinessProfile route chunk (`/:username` targets). */
export const prefetchBusinessProfile = () =>
  run('business-profile', () => import('@/pages/BusinessProfile'));

/** Prefetch the Search route chunk (hero search + category CTAs). */
export const prefetchSearchPage = () =>
  run('search', () => import('@/pages/Search'));

/**
 * Handler set to spread onto a link that navigates to `/:username`. Warms
 * both the code chunk AND the React Query cache for the target profile so
 * the destination screen renders on the first paint after click.
 *
 * `prefetchData` is optional — callers on the homepage do not always have
 * a query client wired at the point of use; when omitted, we still prefetch
 * the JS chunk (the biggest win).
 */
export const businessProfileHoverProps = (
  prefetchData?: () => void,
): {
  onMouseEnter: () => void;
  onFocus: () => void;
  onTouchStart: () => void;
  onPointerDown: () => void;
} => {
  const trigger = () => {
    void prefetchBusinessProfile();
    prefetchData?.();
  };
  return {
    onMouseEnter: trigger,
    onFocus: trigger,
    onTouchStart: trigger,
    onPointerDown: trigger,
  };
};