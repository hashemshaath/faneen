/**
 * P1.2 — React Query persistence for public directory data.
 *
 * Persists ONLY explicitly-allowlisted public query keys to localStorage so
 * returning visitors see instant content (kills the "empty then pop" flash).
 * Never persists authenticated, dashboard, admin, or per-user queries —
 * that would leak data across accounts on shared devices.
 *
 * Buster is tied to __BUILD_ID__ so deploys invalidate the cache cleanly.
 */
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { Query } from '@tanstack/react-query';

declare const __BUILD_ID__: string;

/**
 * Exact first-segment allowlist. Every entry must be a query-key first
 * element that is ONLY used by unauthenticated public reads across the
 * whole codebase. Ambiguous first-segments that are shared between public
 * and dashboard/admin queries (e.g. 'branches', 'services', 'reviews',
 * 'awards', 'certifications', 'portfolio') are intentionally excluded —
 * caching them would leak business-scoped data another account fetched
 * on the same device.
 */
export const PUBLIC_PERSIST_FIRST_SEGMENTS: ReadonlySet<string> = new Set([
  'businesses-all-with-services',
  'search:taxonomy-categories',
  'search-taxonomy-context',
  'search:service-category-business-ids',
  'business-taxonomy-display-batch',
  'cities',
  'home-category-row-businesses',
  'home',
  'blog:public',
  'projects:public',
  'offers:public',
  'sectors:public',
  'business',                 // public business-profile headline only; dashboard uses 'business-edit', 'business-recent-activity', etc.
  'business-projects',        // public portfolio-projects only
  'promotions-active-count',
]);

/**
 * Any-segment denylist. If ANY segment of the query key matches one of
 * these tokens (case-insensitive substring), the query is never persisted,
 * even if its first segment is allowlisted. Belt-and-braces protection.
 */
const DENY_ANY_SEGMENT_SUBSTRINGS: ReadonlyArray<string> = [
  'auth', 'user', 'me:', 'admin', 'dashboard', 'membership',
  'contract', 'workspace', 'staff', 'invitation', 'notification',
  'credit', 'billing', 'quote-request', 'rfq', 'lead',
  'edit', 'draft', 'private', 'internal', 'inbox', 'my-',
];

const segmentToString = (seg: unknown): string =>
  typeof seg === 'string' ? seg : JSON.stringify(seg);

export const shouldPersistQuery = (q: Query): boolean => {
  const key = q.queryKey;
  if (!Array.isArray(key) || key.length === 0) return false;
  const first = segmentToString(key[0]).toLowerCase();
  if (!PUBLIC_PERSIST_FIRST_SEGMENTS.has(first)) return false;
  for (const seg of key) {
    const s = segmentToString(seg).toLowerCase();
    if (DENY_ANY_SEGMENT_SUBSTRINGS.some((d) => s.includes(d))) return false;
  }
  return true;
};

export const createQueryPersister = () => {
  if (typeof window === 'undefined') return null;
  try {
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: 'qitaat_rq_cache_v2', // bumped from v1 — old cache may contain cross-account leakage
      throttleTime: 1000,
    });
  } catch {
    return null;
  }
};

/** 24h — long enough for "returning visitor" cache warmth, short enough to bound staleness. */
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const PERSIST_BUSTER = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';