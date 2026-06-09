/**
 * useHomeSectorTiles — single read API for HomeSectorGrid.
 *
 * Strategy:
 *  1. Always start from `DEFAULT_TILES` (the 10 hardcoded tiles in
 *     HomeSectorGrid). This guarantees the homepage renders even when
 *     the DB call fails or no overrides exist.
 *  2. Fetch all active primary_activity rows. For each slug present in
 *     DEFAULT_TILES, layer the DB override on top (icon, title, body).
 *  3. Build the final visible list:
 *       - If ANY row has `metadata.home_grid.show` set explicitly,
 *         use that as the source of truth (admin took control).
 *       - Otherwise fall back to the hardcoded HOME_SECTOR_GRID_SLUGS
 *         order (current production behaviour).
 *  4. Order by `override.position` ASC, then by hardcoded default order.
 *  5. Cap at 10 tiles (HomeSectorGrid is a fixed 5×2 grid).
 *
 * Guard: every slug returned MUST be in `HOME_ALLOWED_SLUGS`. Anything
 * else is dropped (defensive — DB should never have other slugs at the
 * primary_activity top level, but admins could in theory create one).
 */
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  fetchPrimaryActivities, fetchAllPrimaryActivities,
  type HomeSectorRow, type HomeSectorOverride,
} from '../services/homeSectors';
import { resolveSectorIcon } from '../data/sectorIconRegistry';
import {
  HOME_ALLOWED_SLUGS, HOME_SECTOR_GRID_SLUGS,
} from '@/components/home/v2/data/homeTaxonomy';

export const HOME_SECTOR_TILES_KEY = ['home', 'sector-tiles'] as const;
export const HOME_SECTOR_TILES_ADMIN_KEY = ['home', 'sector-tiles', 'admin'] as const;

export interface SectorTile {
  slug: string;
  Icon: LucideIcon;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

export interface DefaultTile {
  slug: string;
  Icon: LucideIcon;
  iconName: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

function buildTile(def: DefaultTile, row: HomeSectorRow | undefined): SectorTile {
  const o: HomeSectorOverride = row?.override ?? {};
  return {
    slug: def.slug,
    Icon: resolveSectorIcon(o.icon, def.Icon),
    titleAr: o.title_ar?.trim() || def.titleAr,
    titleEn: o.title_en?.trim() || def.titleEn,
    bodyAr: o.body_ar?.trim() || def.bodyAr,
    bodyEn: o.body_en?.trim() || def.bodyEn,
  };
}

/**
 * PUBLIC hook — consumed by HomeSectorGrid. Never throws; falls back to
 * defaults on any failure.
 */
export function useHomeSectorTiles(defaults: DefaultTile[]) {
  const q = useQuery<HomeSectorRow[]>({
    queryKey: HOME_SECTOR_TILES_KEY,
    queryFn: fetchPrimaryActivities,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  const rows = q.data ?? [];
  const rowBySlug = new Map(rows.map((r) => [r.slug, r]));
  const defaultBySlug = new Map(defaults.map((d) => [d.slug, d]));

  // Does ANY row carry an explicit show override?
  const adminTookOver = rows.some((r) => typeof r.override.show === 'boolean');

  let orderedSlugs: string[];
  if (adminTookOver) {
    // Use rows where show !== false. Unknown slugs (not in defaults) are
    // skipped — we can't render a tile without default icon + copy.
    orderedSlugs = rows
      .filter((r) => r.override.show !== false && defaultBySlug.has(r.slug) && HOME_ALLOWED_SLUGS.has(r.slug))
      .sort((a, b) => {
        const pa = a.override.position ?? 9999;
        const pb = b.override.position ?? 9999;
        if (pa !== pb) return pa - pb;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      })
      .map((r) => r.slug);
  } else {
    orderedSlugs = [...HOME_SECTOR_GRID_SLUGS];
  }

  const tiles: SectorTile[] = orderedSlugs
    .slice(0, 10)
    .map((slug) => {
      const def = defaultBySlug.get(slug);
      if (!def) return null;
      return buildTile(def, rowBySlug.get(slug));
    })
    .filter((t): t is SectorTile => t !== null);

  // Final safety net: if for any reason we ended up with <10 tiles and the
  // admin hasn't taken over, top up from defaults in original order.
  if (!adminTookOver && tiles.length < defaults.length) {
    const have = new Set(tiles.map((t) => t.slug));
    for (const d of defaults) {
      if (!have.has(d.slug)) tiles.push(buildTile(d, rowBySlug.get(d.slug)));
      if (tiles.length >= 10) break;
    }
  }

  return {
    tiles,
    isLoading: q.isLoading,
    usingDefaults: !adminTookOver,
  };
}

/** Admin hook — full list including inactive, no fallback munging. */
export function useAdminHomeSectors() {
  return useQuery<HomeSectorRow[]>({
    queryKey: HOME_SECTOR_TILES_ADMIN_KEY,
    queryFn: fetchAllPrimaryActivities,
    staleTime: 30_000,
  });
}