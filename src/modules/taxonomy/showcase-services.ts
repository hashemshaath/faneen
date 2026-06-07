/**
 * Showcase-specific taxonomy helpers.
 * Loads the categories flagged for showcase use, plus a small helper for
 * legacy sector display names (so DashboardShowcase / AdminShowcase don't
 * duplicate the legacy mapping inline).
 */
import { supabase } from '@/integrations/supabase/client';

export interface ShowcaseTaxonomyOption {
  id: string;
  slug: string;
  name_ar: string;
  parent_id: string | null;
  /** "Parent / Child" label when nested, otherwise just the name. */
  display_ar: string;
}

export async function getShowcaseTaxonomyCategories(): Promise<ShowcaseTaxonomyOption[]> {
  const { data, error } = await supabase
    .from('taxonomy_categories')
    .select('id, slug, name_ar, parent_id, sort_order, is_featured, show_in_showcase, is_active, is_public, is_archived')
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .eq('show_in_showcase', true)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('name_ar', { ascending: true });
  if (error) return [];
  const rows = data ?? [];
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  return rows.map((r) => {
    const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
    return {
      id: r.id,
      slug: r.slug,
      name_ar: r.name_ar,
      parent_id: r.parent_id,
      display_ar: parent ? `${parent.name_ar} / ${r.name_ar}` : r.name_ar,
    };
  });
}

/** Public-friendly Arabic name for the old `sector_slug` column. */
const LEGACY_SECTOR_DISPLAY_AR: Record<string, string> = {
  aluminum: 'ألمنيوم',
  iron: 'حديد',
  steel: 'حديد',
  wood: 'خشب',
  glass: 'زجاج',
  stainless: 'ستانلس ستيل',
  'stainless-steel': 'ستانلس ستيل',
  'fabrication-installation': 'تصنيع وتركيب',
  fabrication: 'تصنيع وتركيب',
  construction: 'مقاولات',
};

export function getLegacySectorDisplayName(sectorSlug: string | null | undefined): string | null {
  if (!sectorSlug) return null;
  return LEGACY_SECTOR_DISPLAY_AR[sectorSlug] ?? sectorSlug;
}