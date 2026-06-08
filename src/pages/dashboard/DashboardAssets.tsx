import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Bi, useBi } from '@/components/common/Bilingual';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus, Boxes, Wrench, ShieldAlert, Package, Info, Search, Hash, Trash2, ChevronDown, ChevronUp, ImageOff, Filter, X, AlertCircle, LayoutGrid, List, ArrowUpDown, Sparkles, Activity, Wand2, ClipboardPaste, Minus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AssetsApi, AssetMaintenanceApi, AssetInspectionsApi, AssetRentalLinksApi,
  AssetStatusBadge, AssetOpsCard,
  AssetUtilizationSummary, AssetQrIdentity, AssetMaintenanceAlerts,
  MAINTENANCE_STATUS_LABELS, INSPECTION_FREQUENCY_LABELS,
} from '@/modules/assets';
import type { Asset, AssetMaintenance, AssetInspection, AssetInspectionFrequency } from '@/modules/assets';
import { RentalItems as RentalItemsApi, RentalCategories as RentalCategoriesApi } from '@/modules/rentals';
import type { RentalItem, RentalCategory } from '@/modules/rentals';

/** Provider asset hub — units of activated rental items, with serial numbers, maintenance & inspections. */
const DashboardAssets: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const bi = useBi();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [links, setLinks] = useState<{ asset_id: string; rental_item_id: string }[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_units' | 'without_units' | 'needs_attention'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'most_units' | 'least_units'>('recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const refresh = useCallback(async (bizId: string) => {
    const [its, cats, asts] = await Promise.all([
      RentalItemsApi.listProviderItems(bizId),
      RentalCategoriesApi.listCategories(),
      AssetsApi.listAssetsForBusiness(bizId),
    ]);
    const itemList = its.data ?? [];
    setItems(itemList);
    setCategories(cats.data ?? []);
    setAssets(asts.data ?? []);
    const lk = await AssetRentalLinksApi.listLinksForRentalItems(itemList.map(i => i.id));
    setLinks((lk.data ?? []).map(l => ({ asset_id: l.asset_id, rental_item_id: l.rental_item_id })));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: biz } = await supabase
        .from('businesses').select('id').eq('user_id', user.id).limit(1).maybeSingle();
      const bizId = biz?.id ?? null;
      setBusinessId(bizId);
      if (bizId) await refresh(bizId);
      setLoading(false);
    })();
  }, [user?.id, refresh]);

  const unitsByItem = useMemo(() => {
    const map = new Map<string, Asset[]>();
    const assetById = new Map(assets.map(a => [a.id, a]));
    for (const l of links) {
      const a = assetById.get(l.asset_id);
      if (!a) continue;
      const arr = map.get(l.rental_item_id) ?? [];
      arr.push(a);
      map.set(l.rental_item_id, arr);
    }
    return map;
  }, [assets, links]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter(it => {
      if (categoryFilter !== 'all' && it.category_id !== categoryFilter) return false;
      const units = unitsByItem.get(it.id) ?? [];
      if (statusFilter === 'with_units' && units.length === 0) return false;
      if (statusFilter === 'without_units' && units.length > 0) return false;
      if (statusFilter === 'needs_attention') {
        const flagged = units.some(u => u.status === 'maintenance' || u.status === 'inspection');
        if (!flagged) return false;
      }
      if (!q) return true;
      return [it.name_ar, it.name_en, it.ref_id, it.brand].some(v => (v ?? '').toLowerCase().includes(q));
    });
    const sorted = [...filtered];
    if (sortBy === 'name') {
      sorted.sort((a, b) => (a.name_ar || '').localeCompare(b.name_ar || ''));
    } else if (sortBy === 'most_units') {
      sorted.sort((a, b) => (unitsByItem.get(b.id)?.length ?? 0) - (unitsByItem.get(a.id)?.length ?? 0));
    } else if (sortBy === 'least_units') {
      sorted.sort((a, b) => (unitsByItem.get(a.id)?.length ?? 0) - (unitsByItem.get(b.id)?.length ?? 0));
    }
    return sorted;
  }, [items, categoryFilter, query, statusFilter, unitsByItem, sortBy]);

  const selectedAsset = useMemo(
    () => assets.find(a => a.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin" /></div></DashboardLayout>;
  }

  if (!businessId) {
    return (
      <DashboardLayout>
        <PageHeader icon={Boxes} title={bi('إدارة الأصول','Asset Management')} subtitle={bi('يجب ربط منشأة بحسابك لإدارة الأصول.','Link a business to manage assets.')} />
        <Card className="p-8 text-center text-muted-foreground">
          <Bi ar="لا توجد منشأة مرتبطة. اربط منشأة من إعدادات المنشأة لتفعيل الأصول." en="No linked business. Link one in business settings to enable assets." />
        </Card>
      </DashboardLayout>
    );
  }

  const totalUnits = assets.length;
  const visibleCategoryIds = new Set(items.map(i => i.category_id));
  const activeCategories = categories.filter(c => visibleCategoryIds.has(c.id));
  const itemsWithUnits = items.filter(it => (unitsByItem.get(it.id)?.length ?? 0) > 0).length;
  const attentionUnits = assets.filter(a => a.status === 'maintenance' || a.status === 'inspection').length;
  const availableUnits = assets.filter(a => a.status === 'available').length;
  const rentedUnits = assets.filter(a => a.status === 'rented' || a.status === 'reserved').length;
  const coverage = items.length === 0 ? 0 : Math.round((itemsWithUnits / items.length) * 100);
  const hasActiveFilter = categoryFilter !== 'all' || statusFilter !== 'all' || query.trim().length > 0;
  const clearFilters = () => { setCategoryFilter('all'); setStatusFilter('all'); setQuery(''); };

  const STATUS_PILLS: ReadonlyArray<{ id: typeof statusFilter; ar: string; en: string; count: number; tone: string }> = [
    { id: 'all',             ar: 'الكل',                en: 'All',              count: items.length,     tone: 'bg-primary text-primary-foreground border-primary' },
    { id: 'with_units',      ar: 'بها وحدات',           en: 'With units',       count: itemsWithUnits,   tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
    { id: 'without_units',   ar: 'بدون وحدات',          en: 'No units yet',     count: items.length - itemsWithUnits, tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
    { id: 'needs_attention', ar: 'تحتاج انتباه',        en: 'Needs attention',  count: attentionUnits,   tone: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-16 md:pb-20">
        <PageHeader
          icon={Boxes}
          title={bi('إدارة الأصول','Asset Management')}
          subtitle={bi('وحدات أصنافك المنشورة في مركز التأجير: الأرقام التسلسلية، الصيانة، الفحوصات.','Units of your published rental items: serials, maintenance, inspections.')}
        />

        <AssetsIntroBanner />

        {/* Premium KPI hero strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile
            icon={Package}
            tone="primary"
            label={bi('أصناف مُفعّلة','Activated items')}
            value={items.length}
            hint={bi(`${itemsWithUnits} منها بها وحدات`, `${itemsWithUnits} have units`)}
          />
          <KpiTile
            icon={Boxes}
            tone="sky"
            label={bi('إجمالي الوحدات','Total units')}
            value={totalUnits}
            hint={bi(`${availableUnits} متاحة • ${rentedUnits} مؤجَّرة`, `${availableUnits} avail · ${rentedUnits} rented`)}
          />
          <KpiTile
            icon={Activity}
            tone="emerald"
            label={bi('تغطية الأرقام التسلسلية','Serial coverage')}
            value={`${coverage}%`}
            hint={bi('الأصناف التي أُضيفت وحداتها','Items with at least one unit')}
            progress={coverage}
          />
          <KpiTile
            icon={AlertCircle}
            tone={attentionUnits > 0 ? 'rose' : 'muted'}
            label={bi('تحتاج انتباه','Need attention')}
            value={attentionUnits}
            hint={bi('قيد الصيانة أو الفحص','In maintenance or inspection')}
          />
        </div>

        <AssetOpsCard />

        {/* Sticky filter & toolbar */}
        <Card className="sticky top-[68px] z-20 p-3 md:p-4 space-y-3 backdrop-blur supports-[backdrop-filter]:bg-card/85">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground me-1">
              <Filter className="size-3.5" />
              <Bi ar="حالة الأصناف" en="Item status" />
            </div>
            {STATUS_PILLS.map(p => {
              const active = statusFilter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setStatusFilter(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? p.tone : 'bg-background hover:bg-muted'}`}
                >
                  {isRTL ? p.ar : p.en} <span className="opacity-70 tech-content">({p.count})</span>
                </button>
              );
            })}
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="ms-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" /><Bi ar="مسح الفلاتر" en="Clear filters" />
              </button>
            )}
          </div>
          <div className="h-px bg-border/60" />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${categoryFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
            >
              <Bi ar="الكل" en="All" /> <span className="opacity-70 tech-content">({items.length})</span>
            </button>
            {activeCategories.map(c => {
              const count = items.filter(i => i.category_id === c.id).length;
              const active = categoryFilter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                >
                  {isRTL ? c.name_ar : c.name_en} <span className="opacity-70 tech-content">({count})</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className={`size-4 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-muted-foreground`} />
              <Input
                dir="auto"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={bi('ابحث باسم الصنف أو الماركة أو المعرف…','Search by item, brand or ref…')}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[170px] gap-1.5">
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">{bi('الأحدث','Recent')}</SelectItem>
                  <SelectItem value="name">{bi('الاسم','Name')}</SelectItem>
                  <SelectItem value="most_units">{bi('الأكثر وحدات','Most units')}</SelectItem>
                  <SelectItem value="least_units">{bi('الأقل وحدات','Fewest units')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="inline-flex rounded-lg border p-0.5 bg-background">
                <button
                  onClick={() => setView('grid')}
                  aria-label="grid"
                  className={`p-1.5 rounded-md transition ${view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  aria-label="list"
                  className={`p-1.5 rounded-md transition ${view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Items header */}
        <div className="flex items-center justify-between gap-3 px-0.5">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <Bi ar="أصنافك المُفعّلة" en="Your activated items" />
            <span className="text-muted-foreground text-sm tech-content">({visibleItems.length}/{items.length})</span>
          </h2>
        </div>

        {items.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <Package className="size-10 mx-auto text-muted-foreground" />
            <div className="font-medium"><Bi ar="لا توجد أصناف مُفعّلة بعد" en="No activated items yet" /></div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              <Bi ar="أضف صنفًا في مركز التأجير أولًا — ستجده هنا لإدارة وحداته وأرقامه التسلسلية." en="Add an item in the Rentals Center first — it will appear here to manage its units and serial numbers." />
            </p>
            <Button asChild className="gap-2"><Link to="/dashboard/rentals"><Plus className="size-4" /><Bi ar="إضافة صنف تأجير" en="Add a rental item" /></Link></Button>
          </Card>
        ) : visibleItems.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <Search className="size-8 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <Bi ar="لا توجد نتائج مطابقة للفلاتر الحالية." en="No items match your filters." />
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5">
              <X className="size-3.5" /><Bi ar="مسح الفلاتر" en="Clear filters" />
            </Button>
          </Card>
        ) : (
          <div className={view === 'grid'
            ? 'grid sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4'
            : 'flex flex-col gap-2'
          }>
            {visibleItems.map(it => (
              <RentalItemCard
                key={it.id}
                item={it}
                category={categories.find(c => c.id === it.category_id) ?? null}
                units={unitsByItem.get(it.id) ?? []}
                expanded={expandedItemId === it.id}
                view={view}
                onToggle={() => { setExpandedItemId(p => p === it.id ? null : it.id); setSelectedAssetId(null); }}
                onSelectAsset={setSelectedAssetId}
                onChanged={() => refresh(businessId)}
                businessId={businessId}
              />
            ))}
          </div>
        )}

        {selectedAsset && (
          <AssetDetail asset={selectedAsset} onChanged={() => refresh(businessId)} />
        )}
      </div>
    </DashboardLayout>
  );
};

/* ---------- Rental-item card with inline unit management ---------- */
const RentalItemCard: React.FC<{
  item: RentalItem;
  category: RentalCategory | null;
  units: Asset[];
  expanded: boolean;
  businessId: string;
  view?: 'grid' | 'list';
  onToggle: () => void;
  onSelectAsset: (id: string) => void;
  onChanged: () => void | Promise<void>;
}> = ({ item, category, units, expanded, businessId, view = 'grid', onToggle, onSelectAsset, onChanged }) => {
  const { isRTL } = useLanguage();
  const cover = item.cover_image_url || item.images?.[0] || null;
  const name = isRTL ? item.name_ar : (item.name_en || item.name_ar);
  const catName = category ? (isRTL ? category.name_ar : category.name_en) : null;
  const breakdown = {
    available: units.filter(u => u.status === 'available').length,
    rented:    units.filter(u => u.status === 'rented' || u.status === 'reserved').length,
    attention: units.filter(u => u.status === 'maintenance' || u.status === 'inspection').length,
    retired:   units.filter(u => u.status === 'retired').length,
  };

  if (view === 'list') {
    return (
      <Card className="overflow-hidden hover-lift">
        <button onClick={onToggle} className="w-full flex items-stretch gap-3 text-start">
          <div className="relative w-24 sm:w-32 shrink-0 bg-muted">
            {cover ? (
              <img src={cover} alt={name} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImageOff className="size-6" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 py-2.5 pe-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium leading-tight line-clamp-1">{name}</div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted tech-content shrink-0">
                {units.length} <Bi ar="وحدة" en="units" />
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              {catName && <span className="px-1.5 py-0.5 rounded-md bg-muted">{catName}</span>}
              <span className="tech-content">{item.ref_id}</span>
              {item.brand && <span>· {item.brand}</span>}
            </div>
            <UnitsBreakdown b={breakdown} />
          </div>
          <div className="flex items-center pe-2">
            {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </button>
        {expanded && (
          <div className="border-t p-3 space-y-3 bg-muted/30">
            <UnitsList units={units} onSelect={onSelectAsset} onChanged={onChanged} />
            <AddUnitsForm item={item} businessId={businessId} onAdded={onChanged} existingCount={units.length} />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover-lift">
      <button onClick={onToggle} className="w-full text-start">
        <div className="relative aspect-[16/10] bg-muted overflow-hidden">
          {cover ? (
            <img src={cover} alt={name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageOff className="size-8" />
            </div>
          )}
          <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-background/90 backdrop-blur border tech-content">
            {units.length} <Bi ar="وحدة" en="units" />
          </span>
          {units.length === 0 && (
            <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/95 text-white shadow-sm">
              <Plus className="size-3" /><Bi ar="أضف وحدات" en="Add units" />
            </span>
          )}
        </div>
        <div className="p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium leading-tight line-clamp-1">{name}</div>
            {expanded ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {catName && <span className="px-1.5 py-0.5 rounded-md bg-muted">{catName}</span>}
            <span className="tech-content">{item.ref_id}</span>
            {item.brand && <span>· {item.brand}</span>}
          </div>
          {units.length > 0 && <UnitsBreakdown b={breakdown} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t p-3 space-y-3 bg-muted/30">
          <UnitsList units={units} onSelect={onSelectAsset} onChanged={onChanged} />
          <AddUnitsForm item={item} businessId={businessId} onAdded={onChanged} existingCount={units.length} />
        </div>
      )}
    </Card>
  );
};

/* ---------- Small KPI tile for the hero strip ---------- */
const KPI_TONES: Record<string, { ring: string; icon: string; chip: string; bar: string }> = {
  primary: { ring: 'border-primary/25', icon: 'bg-primary/10 text-primary',          chip: 'text-primary',          bar: 'bg-primary' },
  sky:     { ring: 'border-sky-500/25', icon: 'bg-sky-500/10 text-sky-600 dark:text-sky-300', chip: 'text-sky-700 dark:text-sky-300', bar: 'bg-sky-500' },
  emerald: { ring: 'border-emerald-500/25', icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300', chip: 'text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500' },
  rose:    { ring: 'border-rose-500/30', icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-300', chip: 'text-rose-700 dark:text-rose-300', bar: 'bg-rose-500' },
  muted:   { ring: 'border-border/60', icon: 'bg-muted text-muted-foreground', chip: 'text-muted-foreground', bar: 'bg-muted-foreground/40' },
};
const KpiTile: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
  tone?: keyof typeof KPI_TONES;
  progress?: number;
}> = ({ icon: Icon, label, value, hint, tone = 'primary', progress }) => {
  const t = KPI_TONES[tone];
  return (
    <Card className={`relative overflow-hidden p-3.5 hover-lift transition ${t.ring}`}>
      <div className={`pointer-events-none absolute -top-10 -end-10 size-28 rounded-full opacity-[0.18] blur-2xl ${t.bar}`} />
      <div className="relative flex items-start gap-3">
        <div className={`size-11 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-white/10 shadow-sm ${t.icon}`}>
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground line-clamp-1">{label}</div>
          <div className={`text-[26px] font-bold leading-tight tech-content ${t.chip}`}>{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 tech-content">{hint}</div>}
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="relative mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${t.bar} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </Card>
  );
};

/* ---------- Units status breakdown chips on each item card ---------- */
const UnitsBreakdown: React.FC<{ b: { available: number; rented: number; attention: number; retired: number } }> = ({ b }) => {
  if (b.available + b.rented + b.attention + b.retired === 0) return null;
  const pill = (cls: string, n: number, ar: string, en: string) => n > 0 && (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium ${cls}`}>
      <span className="tech-content">{n}</span><Bi ar={ar} en={en} />
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-1 pt-0.5">
      {pill('bg-emerald-500/12 text-emerald-700 dark:text-emerald-300', b.available, 'متاح', 'avail')}
      {pill('bg-sky-500/12 text-sky-700 dark:text-sky-300',             b.rented,    'مؤجَّر', 'rented')}
      {pill('bg-amber-500/15 text-amber-700 dark:text-amber-300',       b.attention, 'انتباه', 'attn')}
      {pill('bg-muted text-muted-foreground',                            b.retired,   'مُستبعد', 'retired')}
    </div>
  );
};

/* ---------- List of existing serial-numbered units ---------- */
const UnitsList: React.FC<{
  units: Asset[];
  onSelect: (id: string) => void;
  onChanged: () => void | Promise<void>;
}> = ({ units, onSelect, onChanged }) => {
  const bi = useBi();
  if (units.length === 0) {
    return (
      <div className="text-xs text-muted-foreground rounded-lg border border-dashed p-3 text-center">
        <Bi ar="لا توجد وحدات بعد — أضف أرقامًا تسلسلية لهذا الصنف بالأسفل." en="No units yet — add serial numbers for this item below." />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground"><Bi ar="الوحدات المُسجَّلة" en="Registered units" /></div>
      <div className="space-y-1">
        {units.map(u => (
          <div key={u.id} className="flex items-center gap-2 rounded-lg border bg-background p-2">
            <Hash className="size-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium tech-content truncate">{u.serial_number || u.ref_id}</div>
              <div className="text-[11px] text-muted-foreground tech-content">{u.ref_id}</div>
            </div>
            <AssetStatusBadge status={u.status} />
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => onSelect(u.id)}>
              <Bi ar="إدارة" en="Manage" />
            </Button>
            <Button
              size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive"
              onClick={async () => {
                if (!confirm(bi('حذف هذه الوحدة؟','Delete this unit?'))) return;
                const { error } = await AssetsApi.deleteAsset(u.id);
                if (error) toast.error(error.message);
                else { toast.success(bi('تم الحذف','Deleted')); await onChanged(); }
              }}
              aria-label="delete"
            ><Trash2 className="size-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Bulk-add serial-numbered units (inherits name/category from rental item) ---------- */
const AddUnitsForm: React.FC<{
  item: RentalItem;
  businessId: string;
  existingCount: number;
  onAdded: () => void | Promise<void>;
}> = ({ item, businessId, existingCount, onAdded }) => {
  const bi = useBi();
  type Mode = 'none' | 'auto' | 'manual';
  const [mode, setMode] = useState<Mode>('manual');
  const [count, setCount] = useState(1);
  const [serials, setSerials] = useState<string[]>(['']);
  const [prefix, setPrefix] = useState(() => (item.ref_id?.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase() || 'SN'));
  const [startAt, setStartAt] = useState(existingCount + 1);
  const [pad, setPad] = useState(3);
  const [bulk, setBulk] = useState('');
  const [saving, setSaving] = useState(false);

  const setCountSafe = (n: number) => {
    const v = Math.max(1, Math.min(50, Math.floor(n) || 1));
    setCount(v);
    setSerials(prev => {
      const next = prev.slice(0, v);
      while (next.length < v) next.push('');
      return next;
    });
  };

  // Effective serials based on mode
  const effectiveSerials = useMemo<string[]>(() => {
    if (mode === 'none') return Array.from({ length: count }, () => '');
    if (mode === 'auto') {
      return Array.from({ length: count }, (_, i) => {
        const n = String(startAt + i).padStart(Math.max(1, Math.min(8, pad)), '0');
        return `${prefix}-${n}`;
      });
    }
    return serials.map(s => s.trim());
  }, [mode, count, serials, prefix, startAt, pad]);

  // Duplicate detection (within batch, ignoring empties)
  const duplicateSet = useMemo(() => {
    const seen = new Map<string, number>();
    const dups = new Set<string>();
    effectiveSerials.forEach(s => {
      if (!s) return;
      const k = s.toLowerCase();
      seen.set(k, (seen.get(k) ?? 0) + 1);
      if ((seen.get(k) ?? 0) > 1) dups.add(k);
    });
    return dups;
  }, [effectiveSerials]);

  const applyBulk = () => {
    const lines = bulk.split(/[\n,;\t]+/).map(s => s.trim()).filter(Boolean).slice(0, 50);
    if (!lines.length) return;
    setMode('manual');
    setCount(lines.length);
    setSerials(lines);
    setBulk('');
    toast.success(bi(`تمت قراءة ${lines.length} رقم تسلسلي`, `Imported ${lines.length} serials`));
  };

  const submit = async () => {
    if (duplicateSet.size > 0) {
      toast.error(bi('يوجد أرقام تسلسلية مكررة','Duplicate serial numbers detected'));
      return;
    }
    setSaving(true);
    let created = 0;
    let failed = 0;
    for (const sn of effectiveSerials) {
      const { data: asset, error } = await AssetsApi.createAsset({
        owner_business_id: businessId,
        name_ar: item.name_ar,
        name_en: item.name_en || undefined,
        serial_number: sn || undefined,
        manufacturer: item.brand || undefined,
        currency: item.currency,
      });
      if (error || !asset) { failed++; continue; }
      const { error: linkErr } = await AssetRentalLinksApi.linkAssetToRental(asset.id, item.id);
      if (linkErr) failed++;
      else created++;
    }
    setSaving(false);
    if (created) toast.success(bi(`تمت إضافة ${created} وحدة`, `${created} units added`));
    if (failed) toast.error(bi(`فشلت إضافة ${failed} وحدة`, `${failed} units failed`));
    setSerials(['']); setCount(1); setStartAt(existingCount + 1 + created);
    await onAdded();
  };

  const filledCount = effectiveSerials.filter(Boolean).length;

  const ModeBtn: React.FC<{ id: Mode; icon: React.ReactNode; ar: string; en: string }> = ({ id, icon, ar, en }) => {
    const active = mode === id;
    return (
      <button
        type="button"
        onClick={() => setMode(id)}
        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
          active
            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
            : 'bg-background hover:bg-muted border-border text-foreground'
        }`}
      >
        {icon}<Bi ar={ar} en={en} />
      </button>
    );
  };

  return (
    <div className="rounded-2xl border bg-gradient-to-b from-background to-muted/30 p-3.5 space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Plus className="size-4" />
          </span>
          <Bi ar="إضافة وحدات لهذا الصنف" en="Add units for this item" />
        </div>
        <span className="text-[10.5px] text-muted-foreground tech-content">
          <Bi ar={`الموجود: ${existingCount}`} en={`Current: ${existingCount}`} />
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        <Bi
          ar="الاسم والتصنيف مأخوذان من الصنف في مركز التأجير — فقط أضف الكمية والأرقام التسلسلية."
          en="Name & category are inherited from the rental item — just set the quantity and serials."
        />
      </p>

      {/* Quantity stepper */}
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-2.5">
        <div className="text-xs font-medium text-muted-foreground">
          <Bi ar="عدد القطع" en="Quantity" />
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCountSafe(count - 1)} aria-label="minus">
            <Minus className="size-3.5" />
          </Button>
          <Input
            type="number" min={1} max={50} value={count}
            onChange={e => setCountSafe(Number(e.target.value))}
            className="tech-content h-8 w-16 text-center font-semibold"
          />
          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCountSafe(count + 1)} aria-label="plus">
            <Plus className="size-3.5" />
          </Button>
          <div className="hidden sm:flex items-center gap-1 ms-2">
            {[5, 10, 20].map(n => (
              <button key={n} type="button" onClick={() => setCountSafe(n)}
                className="px-2 h-7 rounded-md text-[11px] border bg-background hover:bg-muted tech-content">
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex items-stretch gap-1.5">
        <ModeBtn id="manual" icon={<Hash className="size-3.5" />} ar="إدخال يدوي" en="Manual" />
        <ModeBtn id="auto" icon={<Wand2 className="size-3.5" />} ar="توليد تلقائي" en="Auto-generate" />
        <ModeBtn id="none" icon={<X className="size-3.5" />} ar="بدون أرقام" en="No serials" />
      </div>

      {/* Mode-specific UI */}
      {mode === 'auto' && (
        <div className="rounded-xl border bg-background p-3 space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground"><Bi ar="بادئة" en="Prefix" /></label>
              <Input dir="ltr" value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase().slice(0, 10))}
                className="tech-content h-9 uppercase" placeholder="SN" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground"><Bi ar="يبدأ من" en="Start at" /></label>
              <Input type="number" min={1} value={startAt}
                onChange={e => setStartAt(Math.max(1, Number(e.target.value) || 1))}
                className="tech-content h-9" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground"><Bi ar="أصفار" en="Padding" /></label>
              <Input type="number" min={1} max={8} value={pad}
                onChange={e => setPad(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                className="tech-content h-9" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            <Bi ar="معاينة:" en="Preview:" />{' '}
            <span className="tech-content text-foreground font-medium">
              {effectiveSerials.slice(0, 3).join('  •  ')}{effectiveSerials.length > 3 ? '  …' : ''}
            </span>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            {serials.map((s, i) => {
              const dup = s.trim() && duplicateSet.has(s.trim().toLowerCase());
              return (
                <div key={i} className="relative">
                  <span className="absolute top-1/2 -translate-y-1/2 start-2 text-[10px] font-medium text-muted-foreground tech-content">
                    #{i + 1}
                  </span>
                  <Hash className="size-3.5 absolute top-1/2 -translate-y-1/2 start-7 text-muted-foreground" />
                  <Input
                    dir="ltr"
                    value={s}
                    onChange={e => setSerials(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                    placeholder={`SN-${String(existingCount + i + 1).padStart(3, '0')}`}
                    className={`tech-content ps-12 h-10 ${dup ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                  />
                  {s.trim() && !dup && (
                    <CheckCircle2 className="size-3.5 absolute top-1/2 -translate-y-1/2 end-2.5 text-emerald-500" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bulk paste */}
          <details className="rounded-lg border bg-background">
            <summary className="flex items-center gap-2 cursor-pointer select-none p-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ClipboardPaste className="size-3.5" />
              <Bi ar="لصق دفعة (سطر لكل رقم)" en="Bulk paste (one per line)" />
            </summary>
            <div className="p-2.5 pt-0 space-y-2">
              <textarea
                dir="ltr"
                value={bulk}
                onChange={e => setBulk(e.target.value)}
                rows={3}
                placeholder={'SN-001\nSN-002\nSN-003'}
                className="tech-content w-full rounded-md border bg-background p-2 text-sm font-mono"
              />
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="outline" onClick={applyBulk} disabled={!bulk.trim()} className="gap-1.5">
                  <ClipboardPaste className="size-3.5" />
                  <Bi ar="استيراد" en="Import" />
                </Button>
              </div>
            </div>
          </details>
        </div>
      )}

      {mode === 'none' && (
        <div className="rounded-xl border border-dashed bg-background/60 p-3 text-[11.5px] text-muted-foreground text-center">
          <Bi
            ar="سيتم إنشاء وحدات بدون أرقام تسلسلية — يمكنك إضافتها لاحقًا من إدارة كل وحدة."
            en="Units will be created without serials — you can add them later from each unit."
          />
        </div>
      )}

      {/* Summary + submit */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t">
        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted tech-content">
            <Boxes className="size-3" />{count}
          </span>
          {mode !== 'none' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 tech-content">
              <CheckCircle2 className="size-3" />{filledCount}/{count}
            </span>
          )}
          {duplicateSet.size > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300">
              <AlertCircle className="size-3" />
              <Bi ar="مكرر" en="duplicates" />
            </span>
          )}
        </div>
        <Button onClick={submit} disabled={saving || duplicateSet.size > 0} className="gap-2" size="sm">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          <Bi ar={`حفظ ${count} وحدة`} en={`Save ${count} units`} />
        </Button>
      </div>
    </div>
  );
};

/* ---------- Asset detail (maintenance + inspections) ---------- */
const AssetDetail: React.FC<{ asset: Asset; onChanged: () => void | Promise<void> }> = ({ asset, onChanged }) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const [tab, setTab] = useState('maintenance');
  const [maint, setMaint] = useState<AssetMaintenance[]>([]);
  const [insp, setInsp] = useState<AssetInspection[]>([]);

  const reload = useCallback(async () => {
    const [m, i] = await Promise.all([
      AssetMaintenanceApi.listForAsset(asset.id),
      AssetInspectionsApi.listForAsset(asset.id),
    ]);
    setMaint(m.data ?? []);
    setInsp(i.data ?? []);
  }, [asset.id]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{isRTL ? asset.name_ar : (asset.name_en || asset.name_ar)}</div>
          <div className="text-xs text-muted-foreground tech-content">{asset.ref_id}{asset.serial_number ? ` · ${asset.serial_number}` : ''}</div>
        </div>
        <div className="flex items-center gap-2">
          <AssetStatusBadge status={asset.status} />
          <Select
            value={asset.status}
            onValueChange={async v => {
              const { error } = await AssetsApi.setAssetStatus(asset.id, v as Asset['status']);
              if (error) toast.error(error.message);
              else { toast.success(bi('تم تحديث الحالة','Status updated')); await onChanged(); }
            }}
          >
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['available','rented','reserved','maintenance','inspection','retired'] as const).map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <AssetMaintenanceAlerts asset={asset} />
      <AssetUtilizationSummary assetId={asset.id} />
      <AssetQrIdentity asset={asset} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="maintenance" className="gap-1"><Wrench className="size-3.5" /><Bi ar="الصيانة" en="Maintenance" /></TabsTrigger>
          <TabsTrigger value="inspections" className="gap-1"><ShieldAlert className="size-3.5" /><Bi ar="الفحوصات" en="Inspections" /></TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="mt-4 space-y-3">
          <MaintenanceForm assetId={asset.id} onCreated={reload} />
          {maint.length === 0 ? (
            <div className="text-sm text-muted-foreground"><Bi ar="لا توجد سجلات صيانة." en="No maintenance records." /></div>
          ) : (
            <div className="space-y-2">
              {maint.map(m => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-sm">{m.title}</div>
                    <div className="text-xs text-muted-foreground tech-content">{m.ref_id} · {m.scheduled_for ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{MAINTENANCE_STATUS_LABELS[m.status][isRTL ? 'ar' : 'en']}</span>
                    {m.status !== 'completed' && m.status !== 'cancelled' && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        const { error } = await AssetMaintenanceApi.setStatus(m.id, 'completed');
                        if (error) toast.error(error.message); else { toast.success(bi('تم الإكمال','Completed')); reload(); }
                      }}><Bi ar="إكمال" en="Complete" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inspections" className="mt-4 space-y-3">
          <InspectionForm assetId={asset.id} onCreated={reload} />
          {insp.length === 0 ? (
            <div className="text-sm text-muted-foreground"><Bi ar="لا توجد فحوصات." en="No inspections." /></div>
          ) : (
            <div className="space-y-2">
              {insp.map(i => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-sm">{INSPECTION_FREQUENCY_LABELS[i.frequency][isRTL ? 'ar' : 'en']}</div>
                    <div className="text-xs text-muted-foreground tech-content">{i.ref_id} · {i.scheduled_for ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{i.result}</span>
                    {i.result === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={async () => {
                          const { error } = await AssetInspectionsApi.recordResult(i.id, 'passed');
                          if (error) toast.error(error.message); else reload();
                        }}><Bi ar="مطابق" en="Pass" /></Button>
                        <Button size="sm" variant="outline" onClick={async () => {
                          const { error } = await AssetInspectionsApi.recordResult(i.id, 'failed');
                          if (error) toast.error(error.message); else reload();
                        }}><Bi ar="غير مطابق" en="Fail" /></Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

const MaintenanceForm: React.FC<{ assetId: string; onCreated: () => void }> = ({ assetId, onCreated }) => {
  const bi = useBi();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs text-muted-foreground"><Bi ar="عنوان الصيانة" en="Maintenance title" /></label>
        <Input dir="auto" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground"><Bi ar="التاريخ" en="Scheduled" /></label>
        <Input type="date" className="tech-content" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <Button onClick={async () => {
        if (!title.trim()) return;
        const { error } = await AssetMaintenanceApi.createRecord({ asset_id: assetId, title: title.trim(), scheduled_for: date || undefined });
        if (error) toast.error(error.message);
        else { toast.success(bi('تمت الإضافة','Added')); setTitle(''); setDate(''); onCreated(); }
      }} className="gap-2"><Plus className="size-4" /><Bi ar="إضافة" en="Add" /></Button>
    </div>
  );
};

const InspectionForm: React.FC<{ assetId: string; onCreated: () => void }> = ({ assetId, onCreated }) => {
  const bi = useBi();
  const [freq, setFreq] = useState<AssetInspectionFrequency>('monthly');
  const [date, setDate] = useState('');
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs text-muted-foreground"><Bi ar="التكرار" en="Frequency" /></label>
        <Select value={freq} onValueChange={v => setFreq(v as AssetInspectionFrequency)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['daily','weekly','monthly','quarterly','annual'] as const).map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground"><Bi ar="التاريخ" en="Scheduled" /></label>
        <Input type="date" className="tech-content" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <Button onClick={async () => {
        const { error } = await AssetInspectionsApi.createRecord({ asset_id: assetId, frequency: freq, scheduled_for: date || undefined });
        if (error) toast.error(error.message);
        else { toast.success(bi('تمت الإضافة','Added')); setDate(''); onCreated(); }
      }} className="gap-2"><Plus className="size-4" /><Bi ar="إضافة" en="Add" /></Button>
    </div>
  );
};

export default DashboardAssets;

/* ---------- Intro banner ---------- */
const AssetsIntroBanner: React.FC = () => (
  <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-sky-500/[0.05] p-5 md:p-6">
    <div className="absolute -top-10 -end-10 size-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" aria-hidden />
    <div className="relative flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
      <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Boxes className="size-6" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <h2 className="text-lg md:text-xl font-semibold">
          <Bi ar="وحدات أصنافك (داخلي)" en="Your item units (internal)" />
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <Bi
            ar="هنا تظهر الأصناف التي فعّلتها في مركز التأجير. اختر صنفًا لإضافة الأرقام التسلسلية لكل قطعة — وعند التأجير ستظهر هذه الأرقام لاختيارها مباشرة. الاسم والتصنيف لا يُضافان هنا — يجب تفعيلهما أولًا من مركز التأجير."
            en="Items you activated in the Rentals Center appear here. Pick one to add serial numbers for each physical unit — these serials become selectable when renting. Name & category are not added here; activate them first in the Rentals Center."
          />
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link to="/dashboard/rentals" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4">
            <Package className="size-3.5" />
            <Bi ar="الانتقال إلى مركز التأجير" en="Go to Rentals Center" />
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="size-3" />
            <Bi ar="كل وحدة = رقم تسلسلي مستقل قابل للصيانة والفحص." en="Each unit = an independent serial — maintained and inspected separately." />
          </span>
        </div>
      </div>
    </div>
  </Card>
);
