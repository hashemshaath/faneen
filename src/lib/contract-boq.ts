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
