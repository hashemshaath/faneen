/**
 * Phase 7 — Search ↔ Taxonomy integration layer.
 *
 * "taxonomy-first, legacy-fallback":
 * - Resolve the user's input (sector / category / service / q) to a central
 *   `taxonomy_categories` row when possible.
 * - Look up `business_taxonomy_categories` (plus the resolved category's
 *   direct children, when it's a parent) to get the set of business IDs that
 *   should be augmented into the result set.
 * - The legacy `businesses.sectors` / `businesses.sub_services` / category_id
 *   filters remain in place untouched — taxonomy is purely additive at this
 *   stage so URLs and existing flows never regress.
 *
 * All Supabase reads are batched (no N+1) and cached via React Query.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaxonomyCategory } from './types';
import {
  LEGACY_SECTOR_TO_TAXONOMY_SLUG,
  resolveLegacySectorToTaxonomy,
} from './legacy-mapping';
import { getRuntimeLegacyMapCached } from './migration-services';
import {
  CANONICAL_PRIMARY_LABELS,
  UI_FORBIDDEN_PRIMARY_SLUGS,
  isCanonicalPrimarySlug,
  type CanonicalPrimarySlug,
} from './canonical-primaries';

export interface SearchTaxonomyParams {
  q?: string | null;
  sector?: string | null;
  category?: string | null;
  service?: string | null;
}

export interface SearchTaxonomyContext {
  resolvedCategory: TaxonomyCategory | null;
  /** Set of business ids that match the resolved category (or its children). */
  taxonomyBusinessIds: Set<string>;
  /** True when no taxonomy match was produced and callers should rely on legacy fields only. */
  shouldUseLegacyFallback: boolean;
  /** Localized label for debug / chips. */
  activeFilterLabel: string | null;
}

export interface PublicTaxonomyBusiness {
  id: string;
  username: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  logo_image_variants: unknown | null;
  cover_url: string | null;
  cover_image_variants: unknown | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean | null;
  cities: { name_ar: string | null; name_en: string | null } | null;
}

export type TaxonomySlugBusinessMap = Record<string, PublicTaxonomyBusiness[]>;

interface LightweightTaxonomyCategory {
  id: string;
  slug: string;
  parent_id: string | null;
}

interface TaxonomyBusinessLink {
  category_id: string | null;
  business_id: string | null;
}

function norm(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

/**
 * Collect all candidate slugs from a raw input. Prefers the runtime
 * `taxonomy_legacy_mappings` registry; static map is always merged as
 * a safety fallback so tests and offline flows never regress.
 */
async function collectCandidateSlugs(input: string): Promise<string[]> {
  const raw = input.trim();
  const n = norm(raw);
  let mapped = LEGACY_SECTOR_TO_TAXONOMY_SLUG[n];
  try {
    const runtime = await getRuntimeLegacyMapCached();
    if (runtime[n]) mapped = runtime[n];
  } catch {
    /* static fallback already applied */
  }
  // Safe Batch 3 — When a legacy → canonical mapping exists AND it points
  // to a *different* slug than the raw input, prefer the mapped slug
  // exclusively. This guarantees `?category=aluminum-glass-facades` resolves
  // to the new `aluminum-works` row instead of accidentally matching the
  // obsolete `aluminum-glass-facades` row that still exists in DB for
  // back-compat.
  if (mapped && mapped !== n && mapped !== raw) {
    return [mapped];
  }
  return Array.from(new Set([raw, n, mapped].filter(Boolean) as string[]));
}

/**
 * Resolve a single input string to a public taxonomy category via:
 *   1. slug / legacy-mapped slug
 *   2. exact Arabic / English name
 *   3. alias (normalized) lookup
 * Returns `null` when nothing matches. Cheap queries first, bails early.
 */
export async function resolveSearchCategory(
  input: string | null | undefined,
): Promise<TaxonomyCategory | null> {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1) slug / legacy mapping (runtime override + static fallback)
  const slugs = await collectCandidateSlugs(raw);
  const { data: bySlug } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .in('slug', slugs)
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .limit(1);
  if (bySlug && bySlug.length > 0) return bySlug[0] as TaxonomyCategory;

  // 2) name match
  const { data: byName } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .or(`name_ar.eq.${raw},name_en.eq.${raw}`)
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .limit(1);
  if (byName && byName.length > 0) return byName[0] as TaxonomyCategory;

  // 3) alias (normalized)
  const n = norm(raw);
  const { data: aliasRows } = await supabase
    .from('taxonomy_aliases')
    .select('category_id')
    .or(`normalized_alias.eq.${n},alias_ar.eq.${raw}`)
    .limit(1);
  if (aliasRows && aliasRows.length > 0) {
    const { data: cat } = await supabase
      .from('taxonomy_categories')
      .select('*')
      .eq('id', aliasRows[0].category_id)
      .eq('is_active', true)
      .eq('is_public', true)
      .eq('is_archived', false)
      .maybeSingle();
    if (cat) return cat as TaxonomyCategory;
  }

  return null;
}

/**
 * Returns the set of business ids linked to the given category id (and its
 * direct children when the category is a parent). Performed in 2 round-trips
 * total regardless of the number of children — no N+1.
 */
export async function getTaxonomyBusinessIdsForCategory(
  categoryId: string,
): Promise<string[]> {
  if (!categoryId) return [];

  // Discover children (active+public only) in one query.
  const { data: children } = await supabase
    .from('taxonomy_categories')
    .select('id')
    .eq('parent_id', categoryId)
    .eq('is_active', true)
    .eq('is_archived', false);

  const ids = [categoryId, ...((children ?? []).map((c) => c.id))];

  const { data: links } = await supabase
    .from('business_taxonomy_categories')
    .select('business_id')
    .in('category_id', ids);

  const unique = new Set<string>();
  (links ?? []).forEach((l) => {
    if (l.business_id) unique.add(l.business_id);
  });
  return Array.from(unique);
}

/**
 * Homepage/search shared taxonomy loader.
 * Resolves real taxonomy slugs to provider ids through
 * `business_taxonomy_categories`, then reads display-safe rows from
 * `businesses_public`. It never reads legacy `businesses.category_id`.
 */
export async function listPublicBusinessesByTaxonomySlugs(
  slugs: readonly string[],
  limitPerSlug = 6,
): Promise<TaxonomySlugBusinessMap> {
  const uniqueSlugs = Array.from(new Set(slugs.map((s) => s.trim()).filter(Boolean)));
  const empty: TaxonomySlugBusinessMap = {};
  uniqueSlugs.forEach((slug) => { empty[slug] = []; });
  if (uniqueSlugs.length === 0) return empty;

  const { data: categories, error: categoryError } = await supabase
    .from('taxonomy_categories')
    .select('id, slug, parent_id')
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false);
  if (categoryError) return empty;

  const taxonomyRows = (categories ?? []) as LightweightTaxonomyCategory[];
  const directBySlug = new Map(taxonomyRows.map((category) => [category.slug, category]));
  const categoryIdsBySlug = new Map<string, Set<string>>();

  for (const slug of uniqueSlugs) {
    const direct = directBySlug.get(slug);
    if (!direct) continue;
    const ids = new Set<string>([direct.id]);
    taxonomyRows.forEach((category) => {
      if (category.parent_id === direct.id) ids.add(category.id);
    });
    categoryIdsBySlug.set(slug, ids);
  }

  const allCategoryIds = Array.from(
    new Set(Array.from(categoryIdsBySlug.values()).flatMap((ids) => Array.from(ids))),
  );
  if (allCategoryIds.length === 0) return empty;

  const { data: links, error: linksError } = await supabase
    .from('business_taxonomy_categories')
    .select('business_id, category_id')
    .in('category_id', allCategoryIds);
  if (linksError) return empty;

  const linkRows = (links ?? []) as TaxonomyBusinessLink[];
  const candidateIdsBySlug = new Map<string, string[]>();
  const candidateLimit = Math.max(limitPerSlug * 10, 30);
  for (const [slug, categoryIds] of categoryIdsBySlug.entries()) {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const link of linkRows) {
      if (!link.category_id || !link.business_id || !categoryIds.has(link.category_id)) continue;
      if (seen.has(link.business_id)) continue;
      seen.add(link.business_id);
      ids.push(link.business_id);
      if (ids.length >= candidateLimit) break;
    }
    candidateIdsBySlug.set(slug, ids);
  }

  const selectedBusinessIds = Array.from(
    new Set(Array.from(candidateIdsBySlug.values()).flat()),
  );
  if (selectedBusinessIds.length === 0) return empty;

  const { data: businesses, error: businessesError } = await supabase
    .from('businesses_public')
    .select('id, username, name_ar, name_en, logo_url, logo_image_variants, cover_url, cover_image_variants, rating_avg, rating_count, is_verified, cities(name_ar, name_en)')
    .eq('is_active', true)
    .in('id', selectedBusinessIds)
    .order('rating_avg', { ascending: false })
    .order('rating_count', { ascending: false });
  if (businessesError) return empty;

  const businessRows = ((businesses ?? []) as unknown as PublicTaxonomyBusiness[])
    .filter((business) => Boolean(business.id));
  const businessById = new Map(businessRows.map((business) => [business.id, business]));
  const out: TaxonomySlugBusinessMap = { ...empty };

  for (const [slug, candidateIds] of candidateIdsBySlug.entries()) {
    out[slug] = candidateIds
      .map((id) => businessById.get(id))
      .filter((business): business is PublicTaxonomyBusiness => Boolean(business))
      .sort((a, b) => {
        const ratingDiff = Number(b.rating_avg ?? 0) - Number(a.rating_avg ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        return Number(b.rating_count ?? 0) - Number(a.rating_count ?? 0);
      })
      .slice(0, limitPerSlug);
  }

  return out;
}

/** Merge two id collections preserving order of the first, no duplicates. */
export function mergeTaxonomyAndLegacyBusinessIds(
  taxonomyIds: Iterable<string>,
  legacyIds: Iterable<string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of taxonomyIds) {
    if (id && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  for (const id of legacyIds) {
    if (id && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

export interface BusinessDisplayTaxonomy {
  /** Preferred display label — taxonomy name if available, else legacy first sector. */
  label: string | null;
  source: 'taxonomy' | 'legacy' | 'none';
}

export function getBusinessDisplayTaxonomy(
  business: {
    sectors?: string[] | null;
    taxonomy_primary_name_ar?: string | null;
    taxonomy_primary_name_en?: string | null;
  },
  language: 'ar' | 'en',
): BusinessDisplayTaxonomy {
  const tax = language === 'ar'
    ? business.taxonomy_primary_name_ar
    : (business.taxonomy_primary_name_en || business.taxonomy_primary_name_ar);
  if (tax && tax.trim()) return { label: tax, source: 'taxonomy' };
  const legacy = (business.sectors ?? []).find((s) => s && s.trim());
  if (legacy) return { label: legacy, source: 'legacy' };
  return { label: null, source: 'none' };
}

/**
 * Build a unified search context from URL params. Prefers an explicit
 * category/sector/service param; falls back to attempting a resolve on `q`
 * only when no other signal exists (so free-text queries still narrow).
 */
export async function buildSearchTaxonomyContext(
  params: SearchTaxonomyParams,
): Promise<SearchTaxonomyContext> {
  const candidates = [params.category, params.sector, params.service]
    .map((v) => (v ?? '').trim())
    .filter((v) => v && v !== 'all');

  let resolved: TaxonomyCategory | null = null;
  for (const c of candidates) {
    resolved = await resolveSearchCategory(c);
    if (resolved) break;
  }

  // Only try query resolution when no explicit category/sector matched.
  if (!resolved && params.q && params.q.trim().length >= 3) {
    resolved = await resolveSearchCategory(params.q);
  }

  if (!resolved) {
    // Legacy-only path: pass back the mapped slug for label, if any.
    const legacyMapped = candidates
      .map((c) => resolveLegacySectorToTaxonomy(c))
      .find(Boolean) ?? null;
    return {
      resolvedCategory: null,
      taxonomyBusinessIds: new Set<string>(),
      shouldUseLegacyFallback: true,
      activeFilterLabel: legacyMapped,
    };
  }

  const ids = await getTaxonomyBusinessIdsForCategory(resolved.id);
  return {
    resolvedCategory: resolved,
    taxonomyBusinessIds: new Set(ids),
    shouldUseLegacyFallback: ids.length === 0,
    activeFilterLabel: resolved.name_ar ?? resolved.slug,
  };
}

/** React Query hook — cached per (q, sector, category, service) tuple. */
export function useSearchTaxonomyContext(params: SearchTaxonomyParams) {
  return useQuery<SearchTaxonomyContext>({
    queryKey: [
      'search-taxonomy-context',
      params.q ?? '',
      params.sector ?? '',
      params.category ?? '',
      params.service ?? '',
    ],
    queryFn: () => buildSearchTaxonomyContext(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // Don't block the page on this — search must work even if taxonomy is slow.
    retry: 1,
    enabled: Boolean(
      (params.q && params.q.trim().length >= 3) ||
      (params.sector && params.sector !== 'all') ||
      (params.category && params.category !== 'all') ||
      (params.service && params.service !== 'all'),
    ),
  });
}

/**
 * Fetch the list of public taxonomy categories that are flagged to show in
 * search filters. Sorted by featured + sort_order. Used by SearchFilters to
 * replace / supplement the legacy sector list.
 */
export function useSearchableTaxonomyCategories() {
  return useQuery<TaxonomyCategory[]>({
    queryKey: ['search-taxonomy-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_categories')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .eq('is_archived', false)
        .eq('show_in_search', true)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaxonomyCategory[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────────
// Phase 10 — Bulk taxonomy display for business cards (no N+1).
// ────────────────────────────────────────────────────────────────

/** A single taxonomy chip used by the public business UI. */
export interface TaxonomyChip {
  /** Stable id from `taxonomy_categories` (may be the legacy row id). */
  id: string;
  /** Canonical slug when known; falls back to the row's own slug otherwise. */
  slug: string;
  /** Localized display label (legacy → canonical normalization applied). */
  label: string;
}

/**
 * Safe Batch 4 — grouped display: one entry per primary the business
 * selected, with its secondaries / services nested below. Businesses that
 * only have a secondary linked surface that secondary's parent as an
 * "inferred" primary so the public UI never shows orphan chips.
 */
export interface TaxonomyGroup {
  primary: TaxonomyChip | null;
  /** True when `primary` was inferred from a child's `parent_id`. */
  inferred: boolean;
  secondaries: TaxonomyChip[];
  services: TaxonomyChip[];
}

export interface BusinessTaxonomyDisplay {
  /** All primary activity chips (multi-primary aware). */
  primaries: TaxonomyChip[];
  /** Grouped view used by Profile + Card UIs. */
  groups: TaxonomyGroup[];
  /** Back-compat — first primary's label (or null). */
  primaryLabel: string | null;
  /** Back-compat — first primary's slug (or null). */
  primarySlug: string | null;
  /** Back-compat — flattened secondary labels across all primaries. */
  secondaryLabels: string[];
  /** Back-compat — flattened service labels across all primaries. */
  serviceLabels: string[];
  hasModernTaxonomy: boolean;
}

export const EMPTY_TAXONOMY_DISPLAY: BusinessTaxonomyDisplay = {
  primaries: [],
  groups: [],
  primaryLabel: null,
  primarySlug: null,
  secondaryLabels: [],
  serviceLabels: [],
  hasModernTaxonomy: false,
};

interface RawLinkRow {
  business_id: string;
  category_id: string;
  role: string | null;
  is_primary: boolean | null;
  taxonomy_categories: {
    id: string;
    slug: string;
    name_ar: string;
    name_en: string | null;
    taxonomy_type_id: string | null;
    parent_id?: string | null;
  } | null;
}

/** Lightweight parent-category lookup used to infer primary groups. */
export interface ParentCategoryRow {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string | null;
}

function pickLabel(
  cat: { name_ar: string; name_en: string | null } | null,
  language: 'ar' | 'en',
): string | null {
  if (!cat) return null;
  if (language === 'ar') return cat.name_ar?.trim() || cat.name_en?.trim() || null;
  return cat.name_en?.trim() || cat.name_ar?.trim() || null;
}

/**
 * Safe Batch 4 — replace legacy / forbidden primary slugs with their
 * canonical equivalent for display ONLY. The DB row id is preserved so
 * downstream filters keep working; the slug + label switch to the
 * canonical primary the user is supposed to see.
 *
 * Returns the original (or canonicalized) slug + a possibly overridden
 * label. When no canonical mapping exists, the inputs pass through.
 */
function canonicalizePrimary(
  slug: string | null | undefined,
  fallbackLabel: string | null,
  language: 'ar' | 'en',
): { slug: string; label: string } | null {
  const raw = (slug ?? '').trim().toLowerCase();
  if (!raw) {
    if (!fallbackLabel) return null;
    return { slug: '', label: fallbackLabel };
  }
  const forbidden = UI_FORBIDDEN_PRIMARY_SLUGS.includes(raw);
  const canonical = LEGACY_SECTOR_TO_TAXONOMY_SLUG[raw];
  if (forbidden || canonical) {
    const target = (canonical ?? raw) as string;
    const labels = (CANONICAL_PRIMARY_LABELS as Record<string, { ar: string; en: string }>)[target];
    if (labels) return { slug: target, label: labels[language] };
    // Forbidden but no canonical mapping — fall back to original label but hide the slug.
    if (fallbackLabel) return { slug: target, label: fallbackLabel };
    return null;
  }
  if (!fallbackLabel) {
    const labels = (CANONICAL_PRIMARY_LABELS as Record<string, { ar: string; en: string }>)[raw];
    if (labels) return { slug: raw, label: labels[language] };
    return null;
  }
  return { slug: raw, label: fallbackLabel };
}

/**
 * Build the display map from a list of joined rows. Pure — easy to test
 * and reuse from other batched callers (e.g. SSR or showcase later).
 *
 * Safe Batch 4 — produces a multi-primary, grouped view while keeping the
 * legacy flat fields (primaryLabel / secondaryLabels / serviceLabels)
 * populated for back-compat with older consumers.
 */
export function formatBusinessTaxonomyDisplayMap(
  rows: RawLinkRow[],
  language: 'ar' | 'en',
  parentLookup?: Map<string, ParentCategoryRow> | null,
): Map<string, BusinessTaxonomyDisplay> {
  // Phase A — partition rows per business so each business is built in one pass.
  const perBiz = new Map<string, RawLinkRow[]>();
  for (const row of rows) {
    const bucket = perBiz.get(row.business_id) ?? [];
    bucket.push(row);
    perBiz.set(row.business_id, bucket);
  }

  const out = new Map<string, BusinessTaxonomyDisplay>();

  for (const [businessId, bizRows] of perBiz) {
    // primaryById indexes EXPLICIT primary groups by the original DB row id
    // so secondaries with `parent_id` matching that id can attach in O(1).
    const primaryById = new Map<string, TaxonomyGroup>();
    // inferredByParentId hosts groups created from a secondary's parent_id
    // when no explicit primary row was linked.
    const inferredByParentId = new Map<string, TaxonomyGroup>();
    const orphan: TaxonomyGroup = {
      primary: null,
      inferred: false,
      secondaries: [],
      services: [],
    };
    const primariesOrder: TaxonomyGroup[] = [];

    // Pass 1 — explicit primary rows.
    for (const row of bizRows) {
      const cat = row.taxonomy_categories;
      if (!cat) continue;
      const isPrimary =
        row.is_primary === true ||
        row.role === 'primary_activity' ||
        row.role === 'entity_type';
      if (!isPrimary) continue;
      const fallback = pickLabel(cat, language);
      const canon = canonicalizePrimary(cat.slug, fallback, language);
      if (!canon) continue;
      if (primaryById.has(cat.id)) continue;
      const group: TaxonomyGroup = {
        primary: { id: cat.id, slug: canon.slug, label: canon.label },
        inferred: false,
        secondaries: [],
        services: [],
      };
      primaryById.set(cat.id, group);
      primariesOrder.push(group);
    }

    // Pass 2 — secondaries / services, with parent-aware grouping.
    for (const row of bizRows) {
      const cat = row.taxonomy_categories;
      if (!cat) continue;
      const isPrimary =
        row.is_primary === true ||
        row.role === 'primary_activity' ||
        row.role === 'entity_type';
      if (isPrimary) continue;
      const label = pickLabel(cat, language);
      if (!label) continue;
      const chip: TaxonomyChip = { id: cat.id, slug: cat.slug, label };
      const parentId = cat.parent_id ?? null;

      // Pick the group to attach to.
      let target: TaxonomyGroup | null = null;
      if (parentId && primaryById.has(parentId)) {
        target = primaryById.get(parentId)!;
      } else if (parentId) {
        // No explicit primary linked for this parent — infer a group.
        let inferred = inferredByParentId.get(parentId);
        if (!inferred) {
          const parent = parentLookup?.get(parentId) ?? null;
          const parentFallback = parent
            ? pickLabel(
                { name_ar: parent.name_ar ?? '', name_en: parent.name_en ?? null },
                language,
              )
            : null;
          const canon = canonicalizePrimary(parent?.slug ?? null, parentFallback, language);
          inferred = {
            primary: canon
              ? { id: parent?.id ?? parentId, slug: canon.slug, label: canon.label }
              : null,
            inferred: true,
            secondaries: [],
            services: [],
          };
          inferredByParentId.set(parentId, inferred);
          primariesOrder.push(inferred);
        }
        target = inferred;
      } else {
        target = orphan;
      }

      const list = row.role === 'service' ? target.services : target.secondaries;
      if (!list.some((c) => c.id === chip.id)) list.push(chip);
    }

    // Assemble final groups: explicit + inferred (in insertion order), then orphan if any.
    const groups = [...primariesOrder];
    if (orphan.secondaries.length || orphan.services.length) groups.push(orphan);

    const primaries: TaxonomyChip[] = groups
      .map((g) => g.primary)
      .filter((p): p is TaxonomyChip => p !== null);
    const secondaryLabels = groups.flatMap((g) => g.secondaries.map((c) => c.label));
    const serviceLabels = groups.flatMap((g) => g.services.map((c) => c.label));
    const firstPrimary = primaries[0] ?? null;

    out.set(businessId, {
      primaries,
      groups,
      primaryLabel: firstPrimary?.label ?? null,
      primarySlug: firstPrimary?.slug ?? null,
      secondaryLabels,
      serviceLabels,
      hasModernTaxonomy: groups.length > 0,
    });
  }

  return out;
}

/**
 * Batched, cached fetch of taxonomy display info for a set of business IDs.
 * Two queries total (links + categories joined in one go via PostgREST embed),
 * regardless of N. Returns a Map keyed by business_id.
 */
export function useBusinessTaxonomyDisplayBatch(
  businessIds: string[],
  language: 'ar' | 'en',
) {
  const sortedKey = [...new Set(businessIds.filter(Boolean))].sort().join(',');
  return useQuery<Map<string, BusinessTaxonomyDisplay>>({
    queryKey: ['business-taxonomy-display-batch', language, sortedKey],
    enabled: sortedKey.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const ids = sortedKey.split(',').filter(Boolean);
      if (ids.length === 0) return new Map();
      const { data, error } = await supabase
        .from('business_taxonomy_categories')
        .select(
          'business_id, category_id, role, is_primary, taxonomy_categories!inner(id, slug, name_ar, name_en, taxonomy_type_id, parent_id)',
        )
        .in('business_id', ids);
      if (error) throw error;
      const rows = (data ?? []) as unknown as RawLinkRow[];

      // Safe Batch 4 — second batched query to resolve "inferred" primaries:
      // collect parent_ids whose parent category is NOT already loaded as a
      // primary link for the same business. One query, no N+1.
      const linkedIds = new Set<string>();
      for (const r of rows) if (r.taxonomy_categories?.id) linkedIds.add(r.taxonomy_categories.id);
      const missingParentIds = new Set<string>();
      for (const r of rows) {
        const parentId = r.taxonomy_categories?.parent_id ?? null;
        if (!parentId) continue;
        if (linkedIds.has(parentId)) continue;
        missingParentIds.add(parentId);
      }
      let parentLookup: Map<string, ParentCategoryRow> | null = null;
      if (missingParentIds.size > 0) {
        const { data: parents } = await supabase
          .from('taxonomy_categories')
          .select('id, slug, name_ar, name_en')
          .in('id', Array.from(missingParentIds));
        if (parents) {
          parentLookup = new Map(
            (parents as ParentCategoryRow[]).map((p) => [p.id, p]),
          );
        }
      }

      return formatBusinessTaxonomyDisplayMap(rows, language, parentLookup);
    },
  });
}

/**
 * Phase 13.a — Single-business taxonomy display hook. Thin wrapper around
 * the batch hook so individual profile/detail pages share the same cache
 * key family ('business-taxonomy-display-batch') as the search list.
 * Display-only; legacy `businesses.categories` remains untouched.
 */
export function useBusinessTaxonomyDisplay(
  businessId: string | null | undefined,
  language: 'ar' | 'en',
): BusinessTaxonomyDisplay {
  const ids = businessId ? [businessId] : [];
  const { data } = useBusinessTaxonomyDisplayBatch(ids, language);
  if (!businessId || !data) return EMPTY_TAXONOMY_DISPLAY;
  return data.get(businessId) ?? EMPTY_TAXONOMY_DISPLAY;
}