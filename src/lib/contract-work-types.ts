/**
 * CT4B — Contract work types.
 *
 * Light registry mapping a user-friendly "work type" to the contract template
 * `category` slug (already used by the published template versions). Used in
 * the contract creation flow to:
 *   1. let the provider/admin pick what kind of job they're contracting,
 *   2. auto-suggest the matching published template version, and
 *   3. seed default BOQ groups for the BOQ step.
 *
 * NOTE: This is presentation/wiring metadata only. It does NOT change DB
 * schema or pricing rules — those still come from `contract_templates` and
 * `contract_template_pricing_rules` (CT5D/CT5E).
 */
import type { BoqGroupKey } from './contract-boq';

export type WorkTypeKey =
  | 'kitchens'
  | 'aluminum_doors_windows'
  | 'glass_securit'
  | 'facades'
  | 'upvc'
  | 'wood_doors'
  | 'iron_doors_windows'
  | 'fire_doors'
  | 'gates_structures'
  | 'wardrobes_closets'
  | 'general';

export interface WorkTypeMeta {
  key: WorkTypeKey;
  ar: string;
  en: string;
  /** Template `category` slug to match against published versions. */
  templateCategory: string;
  /** Default BOQ groups suggested when starting this work type. */
  defaultBoqGroups: BoqGroupKey[];
}

export const WORK_TYPES: WorkTypeMeta[] = [
  { key: 'kitchens',              ar: 'مطابخ',                 en: 'Kitchens',                 templateCategory: 'kitchens',              defaultBoqGroups: ['cabinets','countertops','accessories','appliances','installation'] },
  { key: 'aluminum_doors_windows', ar: 'ألمنيوم أبواب وشبابيك', en: 'Aluminum Doors & Windows', templateCategory: 'aluminum_doors_windows', defaultBoqGroups: ['materials','accessories','installation'] },
  { key: 'glass_securit',         ar: 'زجاج وسيكوريت',         en: 'Glass & Securit',          templateCategory: 'glass_securit',         defaultBoqGroups: ['materials','accessories','installation'] },
  { key: 'facades',               ar: 'واجهات وكلادينج',       en: 'Facades / Cladding',       templateCategory: 'facades',               defaultBoqGroups: ['materials','labor','installation'] },
  { key: 'upvc',                  ar: 'UPVC أبواب وشبابيك',    en: 'UPVC Doors & Windows',     templateCategory: 'upvc',                  defaultBoqGroups: ['materials','accessories','installation'] },
  { key: 'wood_doors',            ar: 'أبواب خشبية',           en: 'Wood Doors',               templateCategory: 'wood_doors',            defaultBoqGroups: ['materials','accessories','installation'] },
  { key: 'iron_doors_windows',    ar: 'حديد أبواب وشبابيك',    en: 'Iron Doors & Windows',     templateCategory: 'iron_doors_windows',    defaultBoqGroups: ['materials','labor','installation'] },
  { key: 'fire_doors',            ar: 'أبواب مقاومة للحريق',   en: 'Fire-Rated Doors',         templateCategory: 'fire_doors',            defaultBoqGroups: ['materials','accessories','installation'] },
  { key: 'gates_structures',      ar: 'بوابات ومظلات وهناجر',  en: 'Gates & Structures',       templateCategory: 'gates_structures',      defaultBoqGroups: ['materials','labor','installation'] },
  { key: 'wardrobes_closets',     ar: 'خزائن ودواليب',         en: 'Wardrobes & Closets',      templateCategory: 'wardrobes_closets',     defaultBoqGroups: ['cabinets','accessories','installation'] },
  { key: 'general',               ar: 'عام / مخصص',            en: 'General / Custom',         templateCategory: 'general',               defaultBoqGroups: ['materials','labor','other'] },
];

const INDEX: Record<string, WorkTypeMeta> = WORK_TYPES.reduce(
  (a, w) => { a[w.key] = w; return a; },
  {} as Record<string, WorkTypeMeta>,
);

export function getWorkType(key: string | null | undefined): WorkTypeMeta | undefined {
  return key ? INDEX[key] : undefined;
}

export function getWorkTypeLabel(key: string | null | undefined, isRTL: boolean): string {
  const w = getWorkType(key);
  if (!w) return isRTL ? 'عام / مخصص' : 'General / Custom';
  return isRTL ? w.ar : w.en;
}

/**
 * Pick the best published template version for a work type. Returns the
 * exact-category match, or the first 'general' template, or null.
 */
export function pickTemplateForWorkType<T extends { category: string; status?: string }>(
  workType: WorkTypeKey | null | undefined,
  publishedVersions: T[],
): T | null {
  if (publishedVersions.length === 0) return null;
  const w = getWorkType(workType ?? 'general');
  const wantedCat = w?.templateCategory ?? 'general';
  const exact = publishedVersions.find(v => v.category === wantedCat);
  if (exact) return exact;
  return publishedVersions.find(v => v.category === 'general') ?? publishedVersions[0];
}