/**
 * Taxonomy & Reference Data Center — pure helpers.
 */
import type {
  TaxonomyAlias,
  TaxonomyCategory,
  TaxonomyCategoryWithChildren,
  TaxonomyQualityIssue,
} from './types';

export function normalizeTaxonomyLabel(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '') // strip Arabic diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function generateSlugFromEnglishName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function generateSlugFallback(_nameAr: string): string {
  const stamp = Date.now().toString(36);
  return `category-${stamp}`;
}

export function validateTaxonomySlug(slug: string): { valid: boolean; reason?: string } {
  if (!slug) return { valid: false, reason: 'empty' };
  if (!/^[a-z0-9-]+$/.test(slug)) return { valid: false, reason: 'invalid_chars' };
  if (slug.startsWith('-') || slug.endsWith('-')) return { valid: false, reason: 'dash_edges' };
  if (slug.length < 2) return { valid: false, reason: 'too_short' };
  if (slug.length > 80) return { valid: false, reason: 'too_long' };
  return { valid: true };
}

export function buildTaxonomyTree(
  categories: TaxonomyCategory[],
): TaxonomyCategoryWithChildren[] {
  const map = new Map<string, TaxonomyCategoryWithChildren>();
  categories.forEach((c) => map.set(c.id, { ...c, children: [], depth: 0 }));
  const roots: TaxonomyCategoryWithChildren[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      const parent = map.get(node.parent_id)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr: TaxonomyCategoryWithChildren[]) => {
    arr.sort((a, b) => a.sort_order - b.sort_order || a.name_ar.localeCompare(b.name_ar, 'ar'));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function flattenTaxonomyTree(
  tree: TaxonomyCategoryWithChildren[],
): TaxonomyCategoryWithChildren[] {
  const out: TaxonomyCategoryWithChildren[] = [];
  const walk = (nodes: TaxonomyCategoryWithChildren[]) => {
    nodes.forEach((n) => {
      out.push(n);
      walk(n.children);
    });
  };
  walk(tree);
  return out;
}

export function isDescendantCategory(
  candidateParentId: string,
  childId: string,
  categories: TaxonomyCategory[],
): boolean {
  // returns true if candidateParentId is the same as childId or one of its descendants
  if (candidateParentId === childId) return true;
  const byParent = new Map<string, TaxonomyCategory[]>();
  categories.forEach((c) => {
    if (!c.parent_id) return;
    const arr = byParent.get(c.parent_id) ?? [];
    arr.push(c);
    byParent.set(c.parent_id, arr);
  });
  const stack = [childId];
  while (stack.length) {
    const cur = stack.pop()!;
    const kids = byParent.get(cur) ?? [];
    for (const k of kids) {
      if (k.id === candidateParentId) return true;
      stack.push(k.id);
    }
  }
  return false;
}

export function getCategoryBreadcrumb(
  category: TaxonomyCategory,
  categories: TaxonomyCategory[],
): TaxonomyCategory[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const chain: TaxonomyCategory[] = [];
  let cur: TaxonomyCategory | undefined = category;
  let guard = 0;
  while (cur && guard < 32) {
    chain.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    guard += 1;
  }
  return chain;
}

export function getTaxonomyOptionsByType(
  categories: TaxonomyCategory[],
  typeId: string,
): TaxonomyCategory[] {
  return categories
    .filter((c) => c.taxonomy_type_id === typeId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function detectTaxonomyDuplicates(
  categories: TaxonomyCategory[],
  aliases: TaxonomyAlias[],
): { duplicateNames: TaxonomyCategory[][]; duplicateSlugs: TaxonomyCategory[][] } {
  const byName = new Map<string, TaxonomyCategory[]>();
  const bySlug = new Map<string, TaxonomyCategory[]>();
  categories.forEach((c) => {
    const k = `${c.taxonomy_type_id}::${normalizeTaxonomyLabel(c.name_ar)}`;
    const arr = byName.get(k) ?? [];
    arr.push(c);
    byName.set(k, arr);

    const s = c.slug?.toLowerCase() ?? '';
    if (s) {
      const sArr = bySlug.get(s) ?? [];
      sArr.push(c);
      bySlug.set(s, sArr);
    }
  });
  // alias-name collision: aliases that match another category's name in the same type
  // (lightweight signal — not blocking)
  const aliasNorm = new Set(aliases.map((a) => normalizeTaxonomyLabel(a.alias_ar)));
  categories.forEach((c) => {
    if (aliasNorm.has(normalizeTaxonomyLabel(c.name_ar))) {
      const k = `${c.taxonomy_type_id}::${normalizeTaxonomyLabel(c.name_ar)}`;
      const arr = byName.get(k) ?? [];
      if (!arr.includes(c)) {
        arr.push(c);
        byName.set(k, arr);
      }
    }
  });
  return {
    duplicateNames: Array.from(byName.values()).filter((g) => g.length > 1),
    duplicateSlugs: Array.from(bySlug.values()).filter((g) => g.length > 1),
  };
}

const WEAK_SLUGS = new Set(['other', 'misc', 'unknown', 'general', 'default']);

export function evaluateTaxonomyQuality(
  categories: TaxonomyCategory[],
  aliases: TaxonomyAlias[],
): TaxonomyQualityIssue[] {
  const issues: TaxonomyQualityIssue[] = [];
  const push = (
    code: TaxonomyQualityIssue['code'],
    cat: TaxonomyCategory,
    ar: string,
    en: string,
  ) => {
    issues.push({ code, category: cat, message_ar: ar, message_en: en });
  };

  const byId = new Map(categories.map((c) => [c.id, c]));

  categories.forEach((c) => {
    if (!c.description_ar && !c.description_en) {
      push('missing_description', c, 'لا يوجد وصف كامل.', 'Missing full description.');
    }
    if (!c.short_description_ar && !c.short_description_en) {
      push('missing_short_description', c, 'لا يوجد وصف مختصر.', 'Missing short description.');
    }
    if (!c.icon || c.icon.trim() === '') {
      push('missing_icon', c, 'لا توجد أيقونة معرّفة.', 'No icon assigned.');
    }
    const arKeywords = Array.isArray(c.keywords_ar) ? c.keywords_ar.length : 0;
    const enKeywords = Array.isArray(c.keywords_en) ? c.keywords_en.length : 0;
    if (arKeywords === 0 && enKeywords === 0) {
      push('missing_keywords', c, 'لا توجد كلمات مفتاحية.', 'No keywords set.');
    }
    if (c.show_in_seo && !c.seo_title_ar && !c.seo_title_en) {
      push('missing_seo_title', c, 'مطلوب عنوان SEO.', 'SEO title is required.');
    }
    if (c.show_in_seo && !c.seo_description_ar && !c.seo_description_en) {
      push('missing_seo_description', c, 'مطلوب وصف SEO.', 'SEO description is required.');
    }
    if (c.name_ar && c.name_ar.length > 80) {
      push('too_long_name', c, 'الاسم العربي طويل جدًا.', 'Arabic name is too long.');
    }
    if (c.slug && WEAK_SLUGS.has(c.slug)) {
      push('weak_slug', c, 'slug ضعيف أو عام.', 'Slug is generic.');
    }
    if (c.parent_id && !byId.has(c.parent_id)) {
      push('orphan_category', c, 'الأب غير موجود.', 'Parent missing.');
    }
    if (
      (!c.is_active || !c.is_public) &&
      (c.show_in_registration || c.show_in_search || c.show_in_seo)
    ) {
      push(
        'hidden_but_used',
        c,
        'التصنيف مخفي لكنه مفعّل في مكان عام.',
        'Hidden but enabled in a public surface.',
      );
    }
    if (c.is_archived && (c.show_in_search || c.show_in_seo || c.show_in_registration)) {
      push(
        'archived_but_visible',
        c,
        'مؤرشف لكنه ظاهر في مكان عام.',
        'Archived but still visible publicly.',
      );
    }
  });

  const dups = detectTaxonomyDuplicates(categories, aliases);
  dups.duplicateNames.forEach((g) =>
    g.forEach((c) =>
      push('duplicate_name', c, 'يوجد تصنيف بنفس الاسم.', 'Duplicate Arabic name within type.'),
    ),
  );
  dups.duplicateSlugs.forEach((g) =>
    g.forEach((c) => push('duplicate_slug', c, 'slug مكرر.', 'Duplicate slug.')),
  );

  return issues;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const s = Array.isArray(val) ? val.join('|') : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => escape(r[c])).join(',')).join('\n');
  return `\uFEFF${header}\n${body}`;
}