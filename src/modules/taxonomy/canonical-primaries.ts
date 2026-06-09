/**
 * Safe Batch 3 — Canonical primary-activity taxonomy slugs.
 *
 * These are the 13 authoritative top-level activities that the public UI
 * (search filters, RFQ form) is allowed to render as a primary choice.
 *
 * Other primaries that still exist in `taxonomy_categories` for legacy /
 * back-compat reasons (`aluminum-glass-facades`, `technology-systems`,
 * `heavy-equipment-rental`, `stainless-steel-fabrication`,
 * `iron-steel`, `aluminum`, `glass-securit`, `kitchens`, `wood-sector`,
 * `stainless-steel`, `building-materials-supply`, `operations-maintenance`,
 * `construction-building`, …) MUST NOT appear in user-facing pickers — they
 * are only accepted as *inputs* via `LEGACY_SECTOR_TO_TAXONOMY_SLUG`.
 */

export const CANONICAL_PRIMARY_SLUGS = [
  'aluminum-works',
  'glass-securit-works',
  'steel-metal-works',
  'stainless-steel-works',
  'wood-carpentry',
  'kitchens-works',
  'facades-cladding',
  'contracting-finishing',
  'elevators-maintenance',
  'energy-sustainability',
  'technology-networks',
  'security-control-systems',
  'equipment-rental',
] as const;

export type CanonicalPrimarySlug = (typeof CANONICAL_PRIMARY_SLUGS)[number];

const PRIMARY_SET: Set<string> = new Set(CANONICAL_PRIMARY_SLUGS);

export function isCanonicalPrimarySlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return PRIMARY_SET.has(slug.trim().toLowerCase());
}

/**
 * Localized Arabic labels for the 13 primaries — used by the RFQ picker
 * where we don't want to rely on a network round-trip for the first step.
 * Keep in sync with `taxonomy_categories.name_ar` for the same slugs.
 */
export const CANONICAL_PRIMARY_LABELS: Record<CanonicalPrimarySlug, { ar: string; en: string }> = {
  'aluminum-works': { ar: 'أعمال الألمنيوم', en: 'Aluminum works' },
  'glass-securit-works': { ar: 'أعمال الزجاج والسيكوريت', en: 'Glass & securit works' },
  'steel-metal-works': { ar: 'أعمال الحديد والمعادن', en: 'Steel & metal works' },
  'stainless-steel-works': { ar: 'أعمال الستانلس ستيل', en: 'Stainless steel works' },
  'wood-carpentry': { ar: 'أعمال الخشب والنجارة', en: 'Wood & carpentry' },
  'kitchens-works': { ar: 'المطابخ', en: 'Kitchens' },
  'facades-cladding': { ar: 'الواجهات والكلادينج', en: 'Facades & cladding' },
  'contracting-finishing': { ar: 'المقاولات والتشطيبات', en: 'Contracting & finishing' },
  'elevators-maintenance': { ar: 'المصاعد والصيانة', en: 'Elevators & maintenance' },
  'energy-sustainability': { ar: 'الطاقة والاستدامة', en: 'Energy & sustainability' },
  'technology-networks': { ar: 'التقنية والشبكات', en: 'Technology & networks' },
  'security-control-systems': { ar: 'الأمن وأنظمة التحكم', en: 'Security & control systems' },
  'equipment-rental': { ar: 'تأجير المعدات', en: 'Equipment rental' },
};

/** Slugs that MUST NOT be displayed as primary options in the UI. */
export const UI_FORBIDDEN_PRIMARY_SLUGS = [
  'aluminum-glass-facades',
  'technology-systems',
  'heavy-equipment-rental',
  'stainless-steel-fabrication',
  'iron-steel',
  'aluminum',
  'glass-securit',
  'kitchens',
  'wood-sector',
  'stainless-steel',
  'operations-maintenance',
  'construction-building',
  'building-materials-supply',
] as const;