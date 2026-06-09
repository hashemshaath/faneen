import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  FolderTree, AlertTriangle, Activity, Plus, Download, LayoutList, TreePine,
  ArrowRightLeft, Building2, Factory, Wrench as WrenchIcon, Tag as TagIcon, Settings,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  getTaxonomyAliases,
  getTaxonomyCategories,
  getTaxonomyRelations,
  getTaxonomyTypes,
  updateTaxonomyCategory,
  updateTaxonomySortOrder,
} from '../services';
import {
  getTaxonomyFallbackReport,
  getTaxonomyUsageCounts,
} from '../usage-services';
import { buildTaxonomyTree, evaluateTaxonomyQuality, normalizeTaxonomyLabel, toCsv } from '../utils';
import type { TaxonomyCategory } from '../types';

import { TaxonomySummaryCards } from './TaxonomySummaryCards';
import { defaultTaxonomyFilters, type TaxonomyFilterState } from './TaxonomyFilters';
import { TaxonomySearchBar } from './TaxonomySearchBar';
import { classifyTaxonomyType } from './TaxonomyTypeChips';
import { TaxonomyCategoryList } from './TaxonomyCategoryList';
import { TaxonomyCategoryDetails } from './TaxonomyCategoryDetails';
import { TaxonomyTreeView } from './TaxonomyTreeView';
import { TaxonomyEditorPanel } from './TaxonomyEditorPanel';
import { TaxonomyQualityPanel } from './TaxonomyQualityPanel';
import { TaxonomyFallbackReportCard } from './TaxonomyFallbackReportCard';
import { TaxonomyMigrationPanel } from './TaxonomyMigrationPanel';
import { IndustrialSectorsHub } from './IndustrialSectorsHub';

const QK = {
  types: ['taxonomy', 'types'] as const,
  cats: ['taxonomy', 'categories'] as const,
  aliases: ['taxonomy', 'aliases'] as const,
  rels: ['taxonomy', 'relations'] as const,
  usage: ['taxonomy', 'usage'] as const,
  fallback: ['taxonomy', 'fallback-report'] as const,
};

/**
 * Phase 21 — Taxonomy Center redesigned around the platform's industrial
 * specialty. Replaces the old horizontal tabs (Manage/Quality/Usage/Migration)
 * with a vertical sidebar of 5 conceptually-distinct sections so each domain
 * is fully independent and easier to scan:
 *
 *   1. Foundation         — account/entity/membership types
 *   2. Industrial sectors — the new visual hub (Aluminum, Glass, …)
 *   3. Specializations    — primary/secondary activities + services
 *   4. Brands & materials — product categories, material types, brand links
 *   5. Operations         — quality, usage, migration tools
 *
 * Foundation/Specializations/Brands reuse the existing filtered list + tree
 * view. The new Industrial Sectors hub uses a dedicated card-grid component.
 */
type SectionKey = 'foundation' | 'sectors' | 'specializations' | 'brands' | 'operations';

interface SectionDef {
  key: SectionKey;
  ar: string;
  en: string;
  desc_ar: string;
  desc_en: string;
  icon: React.ElementType;
  color: string;
  typeCodes: string[]; // type-codes this section scopes to (empty = special)
}

const SECTIONS: readonly SectionDef[] = [
  {
    key: 'foundation',
    ar: 'الجهات والتأسيس', en: 'Entities & foundation',
    desc_ar: 'أنواع الحسابات والجهات والعضويات — كل ما يخص تأسيس الشركة على المنصة.',
    desc_en: 'Account, entity and membership types — everything about establishing on the platform.',
    icon: Building2, color: '#0F766E',
    typeCodes: ['account_type', 'entity_type', 'membership_type'],
  },
  {
    key: 'sectors',
    ar: 'القطاعات الصناعية', en: 'Industrial sectors',
    desc_ar: 'الألمنيوم، الزجاج، الحديد، الستانلس، الخشب، المطابخ، الواجهات، أبواب الحريق…',
    desc_en: 'Aluminum, glass, steel, stainless, wood, kitchens, façades, fire doors…',
    icon: Factory, color: '#3B82F6',
    typeCodes: ['sector'],
  },
  {
    key: 'specializations',
    ar: 'التخصصات والخدمات', en: 'Specializations & services',
    desc_ar: 'الأنشطة الرئيسية والفرعية والخدمات الفنية داخل كل قطاع.',
    desc_en: 'Primary/secondary activities and technical services within each sector.',
    icon: WrenchIcon, color: '#F97316',
    typeCodes: ['primary_activity', 'secondary_activity', 'service'],
  },
  {
    key: 'brands',
    ar: 'الماركات والمواد', en: 'Brands & materials',
    desc_ar: 'تصنيفات المنتجات والمواد الخام والعلامات التجارية المرتبطة بكل قطاع.',
    desc_en: 'Product categories, raw materials and brands linked to each sector.',
    icon: TagIcon, color: '#A855F7',
    typeCodes: ['product_category', 'product_type', 'material_type'],
  },
  {
    key: 'operations',
    ar: 'الجودة والصيانة', en: 'Operations',
    desc_ar: 'مراجعة الجودة، الاستخدام، الهجرة وأدوات الصيانة.',
    desc_en: 'Quality review, usage analytics, migration and maintenance tools.',
    icon: Settings, color: '#64748B',
    typeCodes: [],
  },
] as const;

export const TaxonomyAdminPage: React.FC = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  const qc = useQueryClient();

  const typesQ = useQuery({ queryKey: QK.types, queryFn: getTaxonomyTypes });
  const catsQ = useQuery({ queryKey: QK.cats, queryFn: getTaxonomyCategories });
  const aliasesQ = useQuery({ queryKey: QK.aliases, queryFn: getTaxonomyAliases });
  const relsQ = useQuery({ queryKey: QK.rels, queryFn: getTaxonomyRelations });

  const [filters, setFilters] = useState<TaxonomyFilterState>(defaultTaxonomyFilters);
  const [section, setSection] = useState<SectionKey>('sectors');
  const [view, setView] = useState<'list' | 'tree'>('list');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presetParentId, setPresetParentId] = useState<string | null>(null);

  const types = typesQ.data ?? [];
  const categories = catsQ.data ?? [];
  const aliases = aliasesQ.data ?? [];
  const relations = relsQ.data ?? [];

  const activeSection = SECTIONS.find((s) => s.key === section) ?? SECTIONS[1];
  const allowedTypeIds = useMemo(() => {
    if (activeSection.typeCodes.length === 0) return null; // operations
    const set = new Set(types.filter((t) => activeSection.typeCodes.includes(t.code)).map((t) => t.id));
    return set;
  }, [types, activeSection]);

  // Usage indicators — batched (one SELECT per source), safe-fail to empty maps.
  const usageQ = useQuery({
    queryKey: [...QK.usage, categories.length],
    queryFn: () => getTaxonomyUsageCounts(categories),
    enabled: categories.length > 0,
    staleTime: 60_000,
  });
  const fallbackQ = useQuery({
    queryKey: QK.fallback,
    queryFn: getTaxonomyFallbackReport,
    staleTime: 60_000,
  });
  const usage = usageQ.data;

  const groupByTypeId = useMemo(
    () => new Map(types.map((t) => [t.id, classifyTaxonomyType(t.code)] as const)),
    [types],
  );

  const filtered = useMemo<TaxonomyCategory[]>(() => {
    const q = normalizeTaxonomyLabel(filters.query);
    const aliasNorm = new Map<string, string[]>();
    aliases.forEach((a) => {
      const arr = aliasNorm.get(a.category_id) ?? [];
      arr.push(normalizeTaxonomyLabel(a.alias_ar));
      if (a.alias_en) arr.push(a.alias_en.toLowerCase());
      aliasNorm.set(a.category_id, arr);
    });
    return categories.filter((c) => {
      if (allowedTypeIds && !allowedTypeIds.has(c.taxonomy_type_id)) return false;
      if (filters.typeId !== 'all' && c.taxonomy_type_id !== filters.typeId) return false;
      if (filters.status === 'active' && (!c.is_active || c.is_archived)) return false;
      if (filters.status === 'hidden' && (c.is_active || c.is_archived)) return false;
      if (filters.status === 'archived' && !c.is_archived) return false;
      if (filters.visibility && !c[filters.visibility]) return false;
      if (filters.missing === 'description' && (c.description_ar || c.description_en)) return false;
      if (filters.missing === 'seo' && c.seo_title_ar && c.seo_description_ar) return false;
      if (q) {
        const hay = [
          c.name_ar, c.name_en, c.slug, c.description_ar, c.short_description_ar,
          ...(c.keywords_ar ?? []), ...(c.keywords_en ?? []),
          ...((aliasNorm.get(c.id) ?? [])),
        ].filter(Boolean).map((s) => normalizeTaxonomyLabel(String(s))).join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [categories, filters, aliases, allowedTypeIds]);

  // direct child counts (used by the list)
  const childrenCount = useMemo(() => {
    const m = new Map<string, number>();
    categories.forEach((c) => { if (c.parent_id) m.set(c.parent_id, (m.get(c.parent_id) ?? 0) + 1); });
    return m;
  }, [categories]);

  // ensure selection stays valid
  const selectedCategory = selectedId ? categories.find((c) => c.id === selectedId) ?? null : null;
  const visibleSelected =
    selectedCategory && filtered.some((c) => c.id === selectedCategory.id) ? selectedCategory : null;

  const trees = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildTaxonomyTree>>();
    const allowed = new Set(filtered.map((c) => c.id));
    const scopedTypes = allowedTypeIds ? types.filter((t) => allowedTypeIds.has(t.id)) : types;
    scopedTypes.forEach((t) => {
      const inType = categories.filter((c) => c.taxonomy_type_id === t.id && allowed.has(c.id));
      // include ancestors so the tree paths remain intact
      const byId = new Map(categories.map((c) => [c.id, c]));
      const expanded = new Set(inType.map((c) => c.id));
      inType.forEach((c) => {
        let p = c.parent_id;
        while (p) {
          if (expanded.has(p)) break;
          expanded.add(p);
          p = byId.get(p)?.parent_id ?? null;
        }
      });
      const subset = categories.filter((c) => c.taxonomy_type_id === t.id && expanded.has(c.id));
      map.set(t.id, buildTaxonomyTree(subset));
    });
    return map;
  }, [filtered, categories, types, allowedTypeIds]);

  const scopedTypes = allowedTypeIds ? types.filter((t) => allowedTypeIds.has(t.id)) : types;

  const issues = useMemo(() => evaluateTaxonomyQuality(categories, aliases), [categories, aliases]);

  const editingCategory = editId ? categories.find((c) => c.id === editId) ?? null : null;

  const handleEdit = (id: string) => { setEditId(id); setPresetParentId(null); setEditorOpen(true); };
  const handleNew = () => { setEditId(null); setPresetParentId(null); setEditorOpen(true); };
  const handleAddChild = (parentId: string) => { setEditId(null); setPresetParentId(parentId); setEditorOpen(true); };
  const handleClose = () => { setEditorOpen(false); setEditId(null); setPresetParentId(null); };
  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ['taxonomy'] });
  };
  const onSaved = () => { refetchAll(); };

  const handleMove = async (id: string, dir: 'up' | 'down') => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const peers = categories
      .filter((c) => c.taxonomy_type_id === cat.taxonomy_type_id && c.parent_id === cat.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = peers.findIndex((p) => p.id === id);
    const swap = dir === 'up' ? peers[idx - 1] : peers[idx + 1];
    if (!swap) return;
    try {
      await Promise.all([
        updateTaxonomySortOrder(cat.id, swap.sort_order),
        updateTaxonomySortOrder(swap.id, cat.sort_order),
      ]);
      refetchAll();
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const handleArchive = async (id: string) => {
    const { archiveTaxonomyCategory } = await import('../services');
    const cat = categories.find((c) => c.id === id);
    const usedBiz = (usage?.businesses.get(id) ?? 0) + (usage?.showcase.get(id) ?? 0);
    if (usedBiz > 0) {
      const ok = window.confirm(isRTL
        ? `هذا التصنيف مستخدم في ${usedBiz} منشآت/أعمال. أرشفته قد تؤثر على الظهور والفلترة. هل تريد المتابعة؟`
        : `This category is used in ${usedBiz} businesses/works. Archiving may affect visibility and filtering. Continue?`);
      if (!ok) return;
    }
    if (!cat) return;
    try { await archiveTaxonomyCategory(id); toast.success(isRTL ? 'تمت الأرشفة' : 'Archived'); refetchAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const handleToggleActive = async (id: string, next: boolean) => {
    try {
      await updateTaxonomyCategory(id, { is_active: next });
      toast.success(next ? (isRTL ? 'تم التفعيل' : 'Activated') : (isRTL ? 'تم الإخفاء' : 'Hidden'));
      refetchAll();
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const handleExportCsv = () => {
    const typeById = new Map(types.map((t) => [t.id, t]));
    const catById = new Map(categories.map((c) => [c.id, c]));
    const aliasByCat = new Map<string, string[]>();
    aliases.forEach((a) => {
      const arr = aliasByCat.get(a.category_id) ?? [];
      arr.push(a.alias_ar);
      aliasByCat.set(a.category_id, arr);
    });
    const rows = filtered.map((c) => ({
      id: c.id,
      taxonomy_type_code: typeById.get(c.taxonomy_type_id)?.code ?? '',
      parent_slug: c.parent_id ? catById.get(c.parent_id)?.slug ?? '' : '',
      slug: c.slug,
      name_ar: c.name_ar,
      name_en: c.name_en ?? '',
      description_ar: c.description_ar ?? '',
      short_description_ar: c.short_description_ar ?? '',
      seo_title_ar: c.seo_title_ar ?? '',
      seo_description_ar: c.seo_description_ar ?? '',
      keywords_ar: (c.keywords_ar ?? []).join('|'),
      aliases_ar: (aliasByCat.get(c.id) ?? []).join('|'),
      sort_order: c.sort_order,
      is_active: c.is_active,
      is_public: c.is_public,
      is_searchable: c.is_searchable,
      is_archived: c.is_archived,
      show_in_registration: c.show_in_registration,
      show_in_search: c.show_in_search,
      show_in_seo: c.show_in_seo,
      show_in_showcase: c.show_in_showcase,
      show_in_products: c.show_in_products,
      show_in_contracts: c.show_in_contracts,
      show_in_quotes: c.show_in_quotes,
      updated_at: c.updated_at,
    }));
    const csv = toCsv(rows as unknown as Record<string, unknown>[], [
      'id','taxonomy_type_code','parent_slug','slug','name_ar','name_en','description_ar','short_description_ar',
      'seo_title_ar','seo_description_ar','keywords_ar','aliases_ar','sort_order','is_active','is_public',
      'is_searchable','is_archived','show_in_registration','show_in_search','show_in_seo','show_in_showcase',
      'show_in_products','show_in_contracts','show_in_quotes','updated_at',
    ]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `taxonomy-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    // TODO: Import CSV will be added after taxonomy review workflow is stabilized.
  };

  const loading = typesQ.isLoading || catsQ.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {/* Calm header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h1 className="font-heading font-extrabold text-2xl md:text-3xl">
              {isRTL ? 'مركز التصنيفات' : 'Taxonomy center'}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {isRTL
                ? 'مركز قطاعي احترافي — كل قطاع صناعي مستقل بمحتواه وتخصصاته وماركاته.'
                : 'A professional sector-first center — each industrial sector is independent with its own content, specialties and brands.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-10 rounded-xl gap-1.5" onClick={handleExportCsv}>
              <Download className="w-4 h-4" /> {isRTL ? 'تصدير CSV' : 'Export CSV'}
            </Button>
            <Button className="h-10 rounded-xl gap-1.5" onClick={handleNew}>
              <Plus className="w-4 h-4" /> {isRTL ? 'إضافة تصنيف' : 'New category'}
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        ) : (
          <>
            <TaxonomySummaryCards categories={categories} issuesCount={issues.length} />

            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
              {/* Vertical sidebar — 5 conceptual groups */}
              <nav aria-label={isRTL ? 'أقسام مركز التصنيفات' : 'Taxonomy center sections'} className="space-y-1.5 lg:sticky lg:top-4 self-start">
                {SECTIONS.map((s) => {
                  const active = s.key === section;
                  const Icon = s.icon;
                  const count = s.typeCodes.length
                    ? categories.filter((c) => {
                        const t = types.find((x) => x.id === c.taxonomy_type_id);
                        return t && s.typeCodes.includes(t.code);
                      }).length
                    : issues.length;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSection(s.key)}
                      className={`w-full text-start rounded-xl border p-3 transition-colors flex items-start gap-3 ${
                        active
                          ? 'border-primary/40 bg-primary/5 shadow-sm'
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: s.color + '1F', color: s.color }}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading font-bold text-sm truncate">{isRTL ? s.ar : s.en}</span>
                          <span className="tech-content text-[10px] text-muted-foreground">{count}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5" dir="auto">
                          {isRTL ? s.desc_ar : s.desc_en}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>

              <section className="min-w-0">
                {section === 'sectors' && (
                  <IndustrialSectorsHub
                    types={types}
                    categories={categories}
                    onEdit={handleEdit}
                    onAddChild={handleAddChild}
                    onNewRoot={handleNew}
                  />
                )}

                {section === 'operations' && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        {isRTL ? `مراجعة الجودة (${issues.length})` : `Quality review (${issues.length})`}
                      </div>
                      <TaxonomyQualityPanel issues={issues} onOpen={handleEdit} />
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                      <div className="text-sm font-heading font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        {isRTL ? 'الاستخدام' : 'Usage'}
                      </div>
                      <TaxonomyFallbackReportCard report={fallbackQ.data} loading={fallbackQ.isLoading} />
                      {usage && (
                        <div>
                          <div className="text-xs font-bold mb-2">
                            {isRTL ? 'أكثر التصنيفات استخدامًا (المنشآت)' : 'Most-used categories (businesses)'}
                          </div>
                          <ul className="text-xs space-y-1">
                            {Array.from(usage.businesses.entries())
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 15)
                              .map(([id, n]) => {
                                const c = categories.find((x) => x.id === id);
                                if (!c) return null;
                                return (
                                  <li key={id} className="flex justify-between gap-2 border-b border-border/50 py-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(id)}
                                      className="truncate text-start hover:text-primary"
                                      dir="auto"
                                    >
                                      {c.name_ar} <span className="opacity-60 tech-content">/{c.slug}</span>
                                    </button>
                                    <span className="tech-content font-bold">{n}</span>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-primary" />
                        {isRTL ? 'الهجرة والتوحيد' : 'Migration & consolidation'}
                      </div>
                      <TaxonomyMigrationPanel />
                    </div>
                  </div>
                )}

                {(section === 'foundation' || section === 'specializations' || section === 'brands') && (
                  <div className="space-y-4">
                    {/* Section header banner */}
                    <div
                      className="rounded-2xl border border-border p-5 flex items-start gap-4"
                      style={{ background: `linear-gradient(135deg, ${activeSection.color}14, transparent 60%)` }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: activeSection.color + '22', color: activeSection.color }}
                      >
                        <activeSection.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-heading font-extrabold text-xl">
                          {isRTL ? activeSection.ar : activeSection.en}
                        </h2>
                        <p className="text-sm text-muted-foreground max-w-3xl" dir="auto">
                          {isRTL ? activeSection.desc_ar : activeSection.desc_en}
                        </p>
                      </div>
                    </div>

                    <TaxonomySearchBar value={filters} onChange={setFilters} />

                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        {isRTL ? `${filtered.length} تصنيف` : `${filtered.length} categories`}
                      </div>
                      <div className="inline-flex rounded-xl border border-border bg-muted/30 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setView('list')}
                          className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors ${view==='list' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <LayoutList className="w-3.5 h-3.5" /> {isRTL ? 'قائمة' : 'List'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setView('tree')}
                          className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors ${view==='tree' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <TreePine className="w-3.5 h-3.5" /> {isRTL ? 'شجرة' : 'Tree'}
                        </button>
                      </div>
                    </div>

                    {view === 'list' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-4">
                        <div className="max-h-[72vh] overflow-y-auto pe-1">
                          <TaxonomyCategoryList
                            rows={filtered}
                            types={scopedTypes}
                            childrenCount={childrenCount}
                            selectedId={visibleSelected?.id ?? null}
                            onSelect={setSelectedId}
                          />
                        </div>
                        <div>
                          <TaxonomyCategoryDetails
                            category={visibleSelected}
                            types={types}
                            categories={categories}
                            usage={usage}
                            onEdit={handleEdit}
                            onAddChild={handleAddChild}
                            onArchive={handleArchive}
                            onToggleActive={handleToggleActive}
                            onMove={handleMove}
                            onSelect={setSelectedId}
                          />
                        </div>
                      </div>
                    ) : (
                      <TaxonomyTreeView types={scopedTypes} trees={trees} onEdit={handleEdit} onMove={handleMove} onArchive={handleArchive} />
                    )}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>

      <TaxonomyEditorPanel
        open={editorOpen}
        category={editingCategory}
        presetParentId={presetParentId}
        types={types}
        categories={categories}
        aliases={aliases}
        relations={relations}
        onClose={handleClose}
        onSaved={onSaved}
      />
    </div>
  );
};

export default TaxonomyAdminPage;