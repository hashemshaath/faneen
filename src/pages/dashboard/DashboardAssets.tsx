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
import { Loader2, Plus, Boxes, Wrench, ShieldAlert, Package, Info, Search, Hash, Trash2, ChevronDown, ChevronUp, ImageOff, Filter, X, CheckCircle2, AlertCircle } from 'lucide-react';
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
    return items.filter(it => {
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
  }, [items, categoryFilter, query, statusFilter, unitsByItem]);

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
        <AssetOpsCard />

        {/* Category pills */}
        <Card className="p-3 md:p-4 space-y-3">
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
          <div className="relative">
            <Search className={`size-4 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-muted-foreground`} />
            <Input
              dir="auto"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={bi('ابحث باسم الصنف أو الماركة أو المعرف…','Search by item, brand or ref…')}
              className={isRTL ? 'pr-9' : 'pl-9'}
            />
          </div>
        </Card>

        {/* Items grid */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">
            <Bi ar="أصنافك المُفعّلة" en="Your activated items" />{' '}
            <span className="text-muted-foreground text-sm tech-content">({visibleItems.length})</span>
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span className="tech-content"><Bi ar={`${totalUnits} وحدة`} en={`${totalUnits} units`} /></span>
            </span>
            {attentionUnits > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-rose-600" />
                <span className="tech-content"><Bi ar={`${attentionUnits} تحتاج انتباه`} en={`${attentionUnits} need attention`} /></span>
              </span>
            )}
          </div>
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
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            {visibleItems.map(it => (
              <RentalItemCard
                key={it.id}
                item={it}
                category={categories.find(c => c.id === it.category_id) ?? null}
                units={unitsByItem.get(it.id) ?? []}
                expanded={expandedItemId === it.id}
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
  onToggle: () => void;
  onSelectAsset: (id: string) => void;
  onChanged: () => void | Promise<void>;
}> = ({ item, category, units, expanded, businessId, onToggle, onSelectAsset, onChanged }) => {
  const { isRTL } = useLanguage();
  const cover = item.cover_image_url || item.images?.[0] || null;
  const name = isRTL ? item.name_ar : (item.name_en || item.name_ar);
  const catName = category ? (isRTL ? category.name_ar : category.name_en) : null;

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
  const [count, setCount] = useState(1);
  const [serials, setSerials] = useState<string[]>(['']);
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

  const submit = async () => {
    const cleaned = serials.map(s => s.trim());
    setSaving(true);
    let created = 0;
    let failed = 0;
    for (const sn of cleaned) {
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
    setSerials(['']); setCount(1);
    await onAdded();
  };

  return (
    <div className="rounded-xl border bg-background p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Plus className="size-4 text-primary" />
        <Bi ar="إضافة وحدات لهذا الصنف" en="Add units for this item" />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        <Bi
          ar="الاسم والتصنيف مأخوذان من الصنف في مركز التأجير. أدخل عدد القطع ثم الأرقام التسلسلية (اختيارية)."
          en="Name & category are inherited from the rental item. Set the quantity, then enter serial numbers (optional)."
        />
      </p>
      <div className="flex items-end gap-2">
        <div className="w-32">
          <label className="text-[11px] text-muted-foreground"><Bi ar="عدد القطع" en="Quantity" /></label>
          <Input
            type="number" min={1} max={50} value={count}
            onChange={e => setCountSafe(Number(e.target.value))}
            className="tech-content h-10"
          />
        </div>
        <div className="text-[11px] text-muted-foreground pb-2.5">
          <Bi ar={`الموجود حاليًا: ${existingCount}`} en={`Currently: ${existingCount}`} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {serials.map((s, i) => (
          <div key={i} className="relative">
            <Hash className="size-3.5 absolute top-1/2 -translate-y-1/2 start-2.5 text-muted-foreground" />
            <Input
              dir="ltr"
              value={s}
              onChange={e => setSerials(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
              placeholder={`SN-${i + 1}`}
              className="tech-content ps-8 h-10"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={saving} className="gap-2">
          {saving && <Loader2 className="size-4 animate-spin" />}
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
