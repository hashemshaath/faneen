import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { FolderTree, AlertTriangle, Database, Activity } from 'lucide-react';
import { toast } from 'sonner';

import {
  getTaxonomyAliases,
  getTaxonomyCategories,
  getTaxonomyRelations,
  getTaxonomyTypes,
  updateTaxonomySortOrder,
} from '../services';
import {
  getTaxonomyFallbackReport,
  getTaxonomyUsageCounts,
} from '../usage-services';
import { buildTaxonomyTree, evaluateTaxonomyQuality, normalizeTaxonomyLabel, toCsv } from '../utils';
import type { TaxonomyCategory, TaxonomyViewMode } from '../types';

import { TaxonomySummaryCards } from './TaxonomySummaryCards';
import { TaxonomyFilters, defaultTaxonomyFilters, type TaxonomyFilterState } from './TaxonomyFilters';
import { TaxonomyTreeView } from './TaxonomyTreeView';
import { TaxonomyTableView } from './TaxonomyTableView';
import { TaxonomyCardView } from './TaxonomyCardView';
import { TaxonomyEditorPanel } from './TaxonomyEditorPanel';
import { TaxonomyQualityPanel } from './TaxonomyQualityPanel';
import { TaxonomyFallbackReportCard } from './TaxonomyFallbackReportCard';

const QK = {
  types: ['taxonomy', 'types'] as const,
  cats: ['taxonomy', 'categories'] as const,
  aliases: ['taxonomy', 'aliases'] as const,
  rels: ['taxonomy', 'relations'] as const,
  usage: ['taxonomy', 'usage'] as const,
  fallback: ['taxonomy', 'fallback-report'] as const,
};

export const TaxonomyAdminPage: React.FC = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  const qc = useQueryClient();

  const typesQ = useQuery({ queryKey: QK.types, queryFn: getTaxonomyTypes });
  const catsQ = useQuery({ queryKey: QK.cats, queryFn: getTaxonomyCategories });
  const aliasesQ = useQuery({ queryKey: QK.aliases, queryFn: getTaxonomyAliases });
  const relsQ = useQuery({ queryKey: QK.rels, queryFn: getTaxonomyRelations });

  const [filters, setFilters] = useState<TaxonomyFilterState>(defaultTaxonomyFilters);
  const [view, setView] = useState<TaxonomyViewMode>('tree');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const types = typesQ.data ?? [];
  const categories = catsQ.data ?? [];
  const aliases = aliasesQ.data ?? [];
  const relations = relsQ.data ?? [];

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
  }, [categories, filters, aliases]);

  const trees = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildTaxonomyTree>>();
    const allowed = new Set(filtered.map((c) => c.id));
    types.forEach((t) => {
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
  }, [filtered, categories, types]);

  const issues = useMemo(() => evaluateTaxonomyQuality(categories, aliases), [categories, aliases]);

  const editingCategory = editId ? categories.find((c) => c.id === editId) ?? null : null;

  const handleEdit = (id: string) => { setEditId(id); setEditorOpen(true); };
  const handleNew = () => { setEditId(null); setEditorOpen(true); };
  const handleClose = () => { setEditorOpen(false); setEditId(null); };
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
    try { await archiveTaxonomyCategory(id); toast.success(isRTL ? 'تمت الأرشفة' : 'Archived'); refetchAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
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
        <header className="space-y-1">
          <div className="inline-flex items-center gap-2 text-primary">
            <Database className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wide uppercase">{isRTL ? 'لوحة الأدمن' : 'Admin'}</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl md:text-3xl">{isRTL ? 'مركز التصنيفات والقوائم المرجعية' : 'Taxonomy & Reference Data Center'}</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">{isRTL ? 'إدارة مركزية للتصنيفات، الأنشطة، المنتجات، العقود، الدفعات، الكلمات البحثية، والروابط داخل منصة قطاعات.' : 'Central management for classifications, activities, products, contracts, payments, search terms, and relations across Qitaat.'}</p>
        </header>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        ) : (
          <>
            <TaxonomySummaryCards types={types} categories={categories} aliases={aliases} />

            <Tabs defaultValue="manage" className="w-full">
              <TabsList className="rounded-xl">
                <TabsTrigger value="manage" className="rounded-lg gap-1.5"><FolderTree className="w-3.5 h-3.5" />{isRTL ? 'إدارة' : 'Manage'}</TabsTrigger>
                <TabsTrigger value="quality" className="rounded-lg gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{isRTL ? 'مراجعة الجودة' : 'Quality'} <span className="text-[10px] tech-content opacity-70">({issues.length})</span></TabsTrigger>
                <TabsTrigger value="usage" className="rounded-lg gap-1.5"><Activity className="w-3.5 h-3.5" />{isRTL ? 'الاستخدام' : 'Usage'}</TabsTrigger>
              </TabsList>

              <TabsContent value="manage" className="space-y-4 mt-4">
                <TaxonomyFilters
                  types={types}
                  value={filters}
                  onChange={setFilters}
                  view={view}
                  onViewChange={setView}
                  onExportCsv={handleExportCsv}
                  onNew={handleNew}
                />
                {view === 'tree' && (
                  <TaxonomyTreeView types={types} trees={trees} onEdit={handleEdit} onMove={handleMove} onArchive={handleArchive} />
                )}
                {view === 'table' && (
                  <TaxonomyTableView rows={filtered} types={types} categories={categories} onEdit={handleEdit} onArchive={handleArchive} />
                )}
                {view === 'cards' && (
                  <TaxonomyCardView rows={filtered} types={types} onEdit={handleEdit} onArchive={handleArchive} />
                )}
              </TabsContent>

              <TabsContent value="quality" className="mt-4">
                <TaxonomyQualityPanel issues={issues} onOpen={handleEdit} />
              </TabsContent>

              <TabsContent value="usage" className="mt-4 space-y-4">
                <TaxonomyFallbackReportCard report={fallbackQ.data} loading={fallbackQ.isLoading} />
                {usage && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="text-sm font-heading font-bold mb-3">
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
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <TaxonomyEditorPanel
        open={editorOpen}
        category={editingCategory}
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