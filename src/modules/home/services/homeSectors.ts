/**
 * homeSectors service — sole owner of Supabase calls for `primary_activity`
 * taxonomy rows used by HomeSectorGrid.
 *
 * Storage model: we DON'T add a schema column. Instead we piggyback on the
 * existing `taxonomy_categories.metadata jsonb` and namespace our keys
 * under `home_grid`:
 *
 *   metadata.home_grid = {
 *     show?: boolean         // appears on homepage grid
 *     position?: number      // 1..N sort order on the grid
 *     icon?: string          // Lucide icon name (whitelisted in sectorIconRegistry)
 *     title_ar?: string      // override tile title
 *     title_en?: string
 *     body_ar?: string       // tile descriptor (≤140 chars)
 *     body_en?: string
 *   }
 *
 * Admin updates flow through `updateHomeSectorOverride()` which performs
 * a read-modify-write to preserve sibling metadata keys.
 */
import { supabase } from '@/integrations/supabase/client';

const TABLE = 'taxonomy_categories';
const PRIMARY_ACTIVITY_TYPE_ID = 'a1ceab06-2824-453a-b8c7-6fa1e1fe1a12';

export interface HomeSectorOverride {
  show?: boolean;
  position?: number;
  icon?: string;
  title_ar?: string;
  title_en?: string;
  body_ar?: string;
  body_en?: string;
}

export interface HomeSectorRow {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  short_description_ar: string | null;
  short_description_en: string | null;
  sort_order: number;
  icon: string | null;
  is_active: boolean;
  override: HomeSectorOverride;
}

interface RawRow {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  short_description_ar: string | null;
  short_description_en: string | null;
  sort_order: number;
  icon: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
}

function extractOverride(metadata: Record<string, unknown> | null | undefined): HomeSectorOverride {
  if (!metadata || typeof metadata !== 'object') return {};
  const raw = (metadata as Record<string, unknown>).home_grid;
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const out: HomeSectorOverride = {};
  if (typeof o.show === 'boolean') out.show = o.show;
  if (typeof o.position === 'number' && Number.isFinite(o.position)) out.position = o.position;
  if (typeof o.icon === 'string') out.icon = o.icon;
  if (typeof o.title_ar === 'string') out.title_ar = o.title_ar;
  if (typeof o.title_en === 'string') out.title_en = o.title_en;
  if (typeof o.body_ar === 'string') out.body_ar = o.body_ar;
  if (typeof o.body_en === 'string') out.body_en = o.body_en;
  return out;
}

function mapRow(r: RawRow): HomeSectorRow {
  return {
    id: r.id,
    slug: r.slug,
    name_ar: r.name_ar,
    name_en: r.name_en,
    short_description_ar: r.short_description_ar,
    short_description_en: r.short_description_en,
    sort_order: r.sort_order,
    icon: r.icon,
    is_active: r.is_active,
    override: extractOverride(r.metadata),
  };
}

/**
 * Public fetch — every active primary_activity row at the top level
 * (no parent). Consumer filters/orders by override.
 */
export async function fetchPrimaryActivities(): Promise<HomeSectorRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, slug, name_ar, name_en, short_description_ar, short_description_en, sort_order, icon, is_active, metadata')
    .eq('taxonomy_type_id', PRIMARY_ACTIVITY_TYPE_ID)
    .is('parent_id', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RawRow[]).map(mapRow);
}

/** Admin fetch — includes inactive rows. */
export async function fetchAllPrimaryActivities(): Promise<HomeSectorRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, slug, name_ar, name_en, short_description_ar, short_description_en, sort_order, icon, is_active, metadata')
    .eq('taxonomy_type_id', PRIMARY_ACTIVITY_TYPE_ID)
    .is('parent_id', null)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RawRow[]).map(mapRow);
}

/**
 * Read-modify-write of `metadata.home_grid`. Preserves siblings under
 * `metadata.*` so we don't trample other features that may use this field.
 */
export async function updateHomeSectorOverride(
  id: string,
  patch: HomeSectorOverride,
): Promise<HomeSectorRow> {
  const { data: current, error: readErr } = await supabase
    .from(TABLE)
    .select('metadata')
    .eq('id', id)
    .single();
  if (readErr) throw readErr;

  const baseMeta = (current?.metadata && typeof current.metadata === 'object'
    ? (current.metadata as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const baseHome = (baseMeta.home_grid && typeof baseMeta.home_grid === 'object'
    ? (baseMeta.home_grid as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const merged = { ...baseMeta, home_grid: { ...baseHome, ...patch } };

  const { data, error } = await supabase
    .from(TABLE)
    .update({ metadata: merged })
    .eq('id', id)
    .select('id, slug, name_ar, name_en, short_description_ar, short_description_en, sort_order, icon, is_active, metadata')
    .single();
  if (error) throw error;
  return mapRow(data as RawRow);
}