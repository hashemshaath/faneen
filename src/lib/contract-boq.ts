/**
 * CT5C — BOQ Groups & Mixed Pricing Foundation.
 *
 * Pure helpers for grouping contract_line_items by boq_group_key and
 * computing per-group / grand totals. No DB schema is added — uses the
 * existing `contract_line_items.boq_group_key` column.
 */

export type BoqGroupKey =
  | 'cabinets'
  | 'countertops'
  | 'accessories'
  | 'appliances'
  | 'installation'
  | 'materials'
  | 'labor'
  | 'delivery'
  | 'other';

export interface BoqGroupMeta {
  key: BoqGroupKey;
  ar: string;
  en: string;
  /** Suggested default pricing method for this group (UX hint only). */
  suggestedMethod?: string;
}

export const BOQ_GROUPS: BoqGroupMeta[] = [
  { key: 'cabinets',     ar: 'الخزائن',          en: 'Cabinets',     suggestedMethod: 'linear_meter' },
  { key: 'countertops',  ar: 'أسطح العمل',       en: 'Countertops',  suggestedMethod: 'square_meter' },
  { key: 'accessories',  ar: 'الإكسسوارات',      en: 'Accessories',  suggestedMethod: 'unit' },
  { key: 'appliances',   ar: 'الأجهزة',          en: 'Appliances',   suggestedMethod: 'unit' },
  { key: 'installation', ar: 'التركيب',          en: 'Installation', suggestedMethod: 'lump_sum' },
  { key: 'materials',    ar: 'المواد',           en: 'Materials',    suggestedMethod: 'unit' },
  { key: 'labor',        ar: 'العمالة',          en: 'Labor',        suggestedMethod: 'lump_sum' },
  { key: 'delivery',     ar: 'التوصيل',          en: 'Delivery',     suggestedMethod: 'lump_sum' },
  { key: 'other',        ar: 'أخرى',             en: 'Other' },
];

const BOQ_GROUP_INDEX: Record<string, BoqGroupMeta> =
  BOQ_GROUPS.reduce((acc, g) => { acc[g.key] = g; return acc; }, {} as Record<string, BoqGroupMeta>);

/** Stable display order used by groupLineItemsByBoqGroup. */
const BOQ_DISPLAY_ORDER: BoqGroupKey[] = BOQ_GROUPS.map(g => g.key);

export function getBoqGroupLabel(key: string | null | undefined, locale: 'ar' | 'en' = 'ar'): string {
  const k = (key || 'other') as string;
  const meta = BOQ_GROUP_INDEX[k];
  if (meta) return locale === 'ar' ? meta.ar : meta.en;
  return locale === 'ar' ? 'أخرى' : 'Other';
}

export function getSuggestedPricingMethod(key: string | null | undefined): string | undefined {
  const k = (key || 'other') as string;
  return BOQ_GROUP_INDEX[k]?.suggestedMethod;
}

/** Suggested groups when contract template is kitchens-related. */
export const KITCHEN_SUGGESTED_GROUPS: BoqGroupKey[] = [
  'cabinets', 'countertops', 'accessories', 'appliances', 'installation',
];

/** True when the supplied template/category slug looks kitchens-related. */
export function isKitchenTemplate(category: string | null | undefined, slug?: string | null): boolean {
  const c = (category || '').toLowerCase();
  const s = (slug || '').toLowerCase();
  return c.includes('kitchen') || s.includes('kitchen') || c === 'kitchens' || c === 'مطابخ';
}

export interface BoqLineItemLike {
  id: string;
  boq_group_key?: string | null;
  pricing_method?: string | null;
  total_cost?: number | string | null;
}

export interface BoqGroup<T extends BoqLineItemLike> {
  key: BoqGroupKey;
  label_ar: string;
  label_en: string;
  items: T[];
  subtotal: number;
  methods: string[];
}

export function groupLineItemsByBoqGroup<T extends BoqLineItemLike>(items: T[]): BoqGroup<T>[] {
  const buckets = new Map<BoqGroupKey, T[]>();
  for (const it of items) {
    const raw = (it.boq_group_key || 'other').toLowerCase();
    const key = (BOQ_GROUP_INDEX[raw] ? raw : 'other') as BoqGroupKey;
    const list = buckets.get(key) ?? [];
    list.push(it);
    buckets.set(key, list);
  }
  const out: BoqGroup<T>[] = [];
  for (const key of BOQ_DISPLAY_ORDER) {
    const list = buckets.get(key);
    if (!list || list.length === 0) continue;
    const meta = BOQ_GROUP_INDEX[key];
    const methods = Array.from(new Set(list.map(i => (i.pricing_method || 'unit')).filter(Boolean)));
    out.push({
      key,
      label_ar: meta.ar,
      label_en: meta.en,
      items: list,
      subtotal: list.reduce((sum, i) => sum + (Number(i.total_cost) || 0), 0),
      methods,
    });
  }
  return out;
}

export function calculateGroupTotals<T extends BoqLineItemLike>(items: T[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const g of groupLineItemsByBoqGroup(items)) {
    totals[g.key] = g.subtotal;
  }
  return totals;
}

export function calculateBoqGrandTotal<T extends BoqLineItemLike>(groupsOrItems: BoqGroup<T>[] | T[]): number {
  if (groupsOrItems.length === 0) return 0;
  const first = groupsOrItems[0] as BoqGroup<T> | T;
  if (first && typeof (first as BoqGroup<T>).subtotal === 'number' && Array.isArray((first as BoqGroup<T>).items)) {
    return (groupsOrItems as BoqGroup<T>[]).reduce((sum, g) => sum + g.subtotal, 0);
  }
  return (groupsOrItems as T[]).reduce((sum, i) => sum + (Number(i.total_cost) || 0), 0);
}

/** True when a contract uses two or more distinct pricing methods. */
export function hasMixedPricing<T extends BoqLineItemLike>(items: T[]): boolean {
  const set = new Set<string>();
  for (const i of items) set.add((i.pricing_method || 'unit'));
  return set.size > 1;
}

export function listPricingMethodsUsed<T extends BoqLineItemLike>(items: T[]): string[] {
  const set = new Set<string>();
  for (const i of items) set.add((i.pricing_method || 'unit'));
  return Array.from(set);
}

/* ── CT5G — Work-type starter BOQ presets ─────────────────────────────
 *
 * Pure metadata. Maps a contract template `category` (a.k.a. work type) to
 * a set of starter BOQ rows so providers can populate a contract's BOQ in
 * one click instead of typing each row manually.
 *
 * Each preset row only carries:
 *   - boq_group_key
 *   - suggested pricing_method
 *   - bilingual placeholder name
 *
 * No quantities / prices / dimensions are seeded — the UI inserts the rows
 * as empty placeholders and the provider fills the financial values. This
 * keeps `contracts.total_amount` and stored `total_cost` semantics unchanged
 * until the provider explicitly enters values.
 */

import type { PricingMethod } from './contract-pricing';

export interface BoqStarterRow {
  /** Stable client-side key — used for de-duplication. */
  preset_key: string;
  boq_group_key: BoqGroupKey;
  pricing_method: PricingMethod;
  name_ar: string;
  name_en: string;
}

/** Keyed by template `category`. */
export const WORK_TYPE_BOQ_PRESETS: Record<string, BoqStarterRow[]> = {
  kitchens: [
    { preset_key: 'kitchens.cabinets',     boq_group_key: 'cabinets',     pricing_method: 'linear_meter', name_ar: 'خزائن المطبخ',      name_en: 'Cabinets' },
    { preset_key: 'kitchens.countertops',  boq_group_key: 'countertops',  pricing_method: 'square_meter', name_ar: 'أسطح العمل',        name_en: 'Countertops' },
    { preset_key: 'kitchens.accessories',  boq_group_key: 'accessories',  pricing_method: 'unit',         name_ar: 'إكسسوارات',          name_en: 'Accessories' },
    { preset_key: 'kitchens.appliances',   boq_group_key: 'appliances',   pricing_method: 'unit',         name_ar: 'أجهزة',              name_en: 'Appliances' },
    { preset_key: 'kitchens.installation', boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب وتجهيز',       name_en: 'Installation' },
  ],
  aluminum_doors_windows: [
    { preset_key: 'alum.frames',       boq_group_key: 'materials',    pricing_method: 'linear_meter', name_ar: 'إطارات ألمنيوم',   name_en: 'Aluminum frames' },
    { preset_key: 'alum.glass',        boq_group_key: 'materials',    pricing_method: 'square_meter', name_ar: 'ألواح زجاج',        name_en: 'Glass panels' },
    { preset_key: 'alum.accessories',  boq_group_key: 'accessories',  pricing_method: 'unit',         name_ar: 'إكسسوارات',         name_en: 'Accessories' },
    { preset_key: 'alum.installation', boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب',              name_en: 'Installation' },
  ],
  upvc: [
    { preset_key: 'upvc.frames',       boq_group_key: 'materials',    pricing_method: 'linear_meter', name_ar: 'إطارات UPVC',       name_en: 'UPVC frames' },
    { preset_key: 'upvc.glass',        boq_group_key: 'materials',    pricing_method: 'square_meter', name_ar: 'ألواح زجاج',        name_en: 'Glass panels' },
    { preset_key: 'upvc.accessories',  boq_group_key: 'accessories',  pricing_method: 'unit',         name_ar: 'إكسسوارات',         name_en: 'Accessories' },
    { preset_key: 'upvc.installation', boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب',              name_en: 'Installation' },
  ],
  facades: [
    { preset_key: 'facade.panels',       boq_group_key: 'materials',    pricing_method: 'square_meter', name_ar: 'ألواح الواجهة',   name_en: 'Facade panels' },
    { preset_key: 'facade.structure',    boq_group_key: 'materials',    pricing_method: 'linear_meter', name_ar: 'هيكل حامل',        name_en: 'Support structure' },
    { preset_key: 'facade.installation', boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب',             name_en: 'Installation' },
    { preset_key: 'facade.access',       boq_group_key: 'labor',        pricing_method: 'lump_sum',     name_ar: 'سقالات ووصول',     name_en: 'Access / scaffolding' },
  ],
  glass_securit: [
    { preset_key: 'glass.panels',       boq_group_key: 'materials',    pricing_method: 'square_meter', name_ar: 'ألواح زجاج',        name_en: 'Glass panels' },
    { preset_key: 'glass.fittings',     boq_group_key: 'accessories',  pricing_method: 'unit',         name_ar: 'إكسسوارات وقواعد',  name_en: 'Fittings & accessories' },
    { preset_key: 'glass.installation', boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب',              name_en: 'Installation' },
  ],
  wood_doors: [
    { preset_key: 'wood.doors',         boq_group_key: 'materials',    pricing_method: 'unit',         name_ar: 'أبواب خشبية',       name_en: 'Wood doors' },
    { preset_key: 'wood.accessories',   boq_group_key: 'accessories',  pricing_method: 'unit',         name_ar: 'إكسسوارات',         name_en: 'Accessories' },
    { preset_key: 'wood.installation',  boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب',              name_en: 'Installation' },
  ],
  fire_doors: [
    { preset_key: 'fire.doors',         boq_group_key: 'materials',    pricing_method: 'unit',         name_ar: 'أبواب مقاومة للحريق', name_en: 'Fire-rated doors' },
    { preset_key: 'fire.accessories',   boq_group_key: 'accessories',  pricing_method: 'unit',         name_ar: 'إكسسوارات',         name_en: 'Accessories' },
    { preset_key: 'fire.installation',  boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب',              name_en: 'Installation' },
  ],
  iron_doors_windows: [
    { preset_key: 'iron.material',      boq_group_key: 'materials',    pricing_method: 'kilogram',     name_ar: 'حديد (وزن)',         name_en: 'Iron material (weight)' },
    { preset_key: 'iron.fabrication',   boq_group_key: 'labor',        pricing_method: 'lump_sum',     name_ar: 'تصنيع',              name_en: 'Fabrication' },
    { preset_key: 'iron.installation',  boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب',              name_en: 'Installation' },
  ],
  gates_structures: [
    { preset_key: 'gates.material',     boq_group_key: 'materials',    pricing_method: 'kilogram',     name_ar: 'مادة حديدية (وزن)',  name_en: 'Steel material (weight)' },
    { preset_key: 'gates.fabrication',  boq_group_key: 'labor',        pricing_method: 'lump_sum',     name_ar: 'تصنيع',              name_en: 'Fabrication' },
    { preset_key: 'gates.installation', boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب',              name_en: 'Installation' },
  ],
  wardrobes_closets: [
    { preset_key: 'wardrobe.cabinets',     boq_group_key: 'cabinets',     pricing_method: 'linear_meter', name_ar: 'دواليب',          name_en: 'Wardrobes' },
    { preset_key: 'wardrobe.accessories',  boq_group_key: 'accessories',  pricing_method: 'unit',         name_ar: 'إكسسوارات',       name_en: 'Accessories' },
    { preset_key: 'wardrobe.installation', boq_group_key: 'installation', pricing_method: 'lump_sum',     name_ar: 'تركيب',            name_en: 'Installation' },
  ],
  general: [
    { preset_key: 'general.materials',    boq_group_key: 'materials',    pricing_method: 'unit',     name_ar: 'مواد',         name_en: 'Materials' },
    { preset_key: 'general.labor',        boq_group_key: 'labor',        pricing_method: 'lump_sum', name_ar: 'عمالة',        name_en: 'Labor' },
    { preset_key: 'general.installation', boq_group_key: 'installation', pricing_method: 'lump_sum', name_ar: 'تركيب',         name_en: 'Installation' },
  ],
};

/** Return the starter rows for a template category, or general fallback. */
export function getWorkTypeBoqPresets(category: string | null | undefined): BoqStarterRow[] {
  const key = (category || 'general').toLowerCase();
  return WORK_TYPE_BOQ_PRESETS[key] || WORK_TYPE_BOQ_PRESETS.general;
}

/** Filter starter rows so we don't duplicate ones already present (matched by name). */
export function dedupeStarterRows<T extends { name_ar?: string | null; name_en?: string | null }>(
  starters: BoqStarterRow[],
  existing: T[],
): BoqStarterRow[] {
  const seen = new Set(
    existing
      .map((e) => (e.name_ar || e.name_en || '').trim().toLowerCase())
      .filter(Boolean),
  );
  return starters.filter((s) => {
    const ar = s.name_ar.trim().toLowerCase();
    const en = s.name_en.trim().toLowerCase();
    return !seen.has(ar) && !seen.has(en);
  });
}
