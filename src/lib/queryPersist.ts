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

/** Query-key prefixes safe to persist. All are public/read-only directory data. */
export const PUBLIC_PERSIST_KEY_PREFIXES: ReadonlyArray<string> = [
  'businesses-all-with-services', // useBusinesses (search directory)
  'search:taxonomy-categories',   // useCategories
  'cities',                        // useCities
  'search-taxonomy-context',       // taxonomy context (public read)
  'business-taxonomy-display-batch',
  'search:service-category-business-ids',
  'home-category-row-businesses',
  'home',                          // home FAQ + landing content (['home','faq','public'], etc.)
  'blog:public',                   // public blog listings
  'projects:public',               // public projects
  'offers:public',                 // public offers
  'sectors:public',                // sector hub/landing
  // Public business-profile page — safe to persist because these all read
  // through `businesses_public` / RLS-scoped public views. Persisting
  // makes repeat visits render instantly from cache; live edits still
  // invalidate via the existing realtime hooks.
  'business',                      // ['business', username] — headline row
  'branches',                      // ['branches', businessId]
  'services',                      // ['services', businessId]
  'business-projects',             // ['business-projects', businessId]
  'reviews',                       // ['reviews', businessId]
  'certifications',                // ['certifications', businessId]
  'awards',                        // ['awards', businessId]
  'portfolio',                     // ['portfolio', businessId]
  'promotions-active-count',       // header offers badge count
];

/** Hard denylist — never persist these even if a prefix accidentally matches. */
const DENY_KEY_SUBSTRINGS: ReadonlyArray<string> = [
  'auth', 'user', 'me', 'admin', 'dashboard', 'membership',
  'contract', 'workspace', 'staff', 'invitation', 'notification',
  'credit', 'billing', 'quote-request', 'rfq', 'lead',
];

const keyToString = (key: unknown): string => {
  if (Array.isArray(key)) return key.map((k) => (typeof k === 'string' ? k : JSON.stringify(k))).join(':');
  return typeof key === 'string' ? key : JSON.stringify(key);
};

export const shouldPersistQuery = (q: Query): boolean => {
  const s = keyToString(q.queryKey).toLowerCase();
  if (DENY_KEY_SUBSTRINGS.some((d) => s.includes(d))) return false;
  return PUBLIC_PERSIST_KEY_PREFIXES.some((p) => s.startsWith(p.toLowerCase()));
};

export const createQueryPersister = () => {
  if (typeof window === 'undefined') return null;
  try {
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: 'qitaat_rq_cache_v1',
      throttleTime: 1000,
    });
  } catch {
    return null;
  }
};

/** 24h — long enough for "returning visitor" cache warmth, short enough to bound staleness. */
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const PERSIST_BUSTER = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';