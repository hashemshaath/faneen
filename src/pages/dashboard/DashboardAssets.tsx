import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Bi, useBi } from '@/components/common/Bilingual';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus, Boxes, Wrench, ShieldAlert, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AssetCategoriesApi, AssetsApi, AssetMaintenanceApi, AssetInspectionsApi,
  AssetStatusBadge, AssetOpsCard, AssetRentalPanel,
  MAINTENANCE_STATUS_LABELS, INSPECTION_FREQUENCY_LABELS,
} from '@/modules/assets';
import type { Asset, AssetCategory, AssetMaintenance, AssetInspection, AssetInspectionFrequency } from '@/modules/assets';

/** Provider asset hub — inventory + maintenance + inspections. No popups. */
const DashboardAssets: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const bi = useBi();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const refresh = async (bizId: string) => {
    const [a, c] = await Promise.all([
      AssetsApi.listAssetsForBusiness(bizId),
      AssetCategoriesApi.listCategories(),
    ]);
    setAssets(a.data ?? []);
    setCategories(c.data ?? []);
  };

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
  }, [user?.id]);

  const selected = useMemo(() => assets.find(a => a.id === selectedId) ?? null, [assets, selectedId]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16 md:pb-20">
        <PageHeader
          icon={Boxes}
          title={bi('إدارة الأصول','Asset Management')}
          subtitle={bi('أسطول المعدات: الحالة، الصيانة، الفحوصات، الاستغلال والربط بالتأجير.','Fleet: status, maintenance, inspections, utilization & rental linkage.')}
        />

        <AssetOpsCard />

        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold"><Bi ar="الأصول لديك" en="Your assets" /> <span className="text-muted-foreground text-sm tech-content">({assets.length})</span></h2>
          <Button onClick={() => { setShowAdd(s => !s); setSelectedId(null); }} className="gap-2">
            {showAdd ? <X className="size-4" /> : <Plus className="size-4" />}
            <Bi ar={showAdd ? 'إغلاق' : 'إضافة أصل'} en={showAdd ? 'Close' : 'Add asset'} />
          </Button>
        </div>

        {showAdd && (
          <AssetCreateForm
            businessId={businessId}
            categories={categories}
            onCreated={async () => { await refresh(businessId); setShowAdd(false); }}
          />
        )}

        {assets.length === 0 && !showAdd ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Bi ar="لا توجد أصول بعد. أضف أصلًا للبدء." en="No assets yet. Add one to get started." />
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {assets.map(a => (
              <button
                key={a.id} onClick={() => setSelectedId(s => s === a.id ? null : a.id)}
                className="text-start"
              >
                <Card className={`p-4 hover-lift ${selectedId === a.id ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{isRTL ? a.name_ar : (a.name_en || a.name_ar)}</div>
                      <div className="text-xs text-muted-foreground tech-content">{a.ref_id}{a.serial_number ? ` · ${a.serial_number}` : ''}</div>
                      {a.manufacturer && <div className="text-xs text-muted-foreground">{a.manufacturer}{a.model ? ` · ${a.model}` : ''}</div>}
                    </div>
                    <AssetStatusBadge status={a.status} />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <AssetDetail asset={selected} onChanged={() => refresh(businessId)} />
        )}
      </div>
    </DashboardLayout>
  );
};

const AssetCreateForm: React.FC<{
  businessId: string;
  categories: AssetCategory[];
  onCreated: () => void | Promise<void>;
}> = ({ businessId, categories, onCreated }) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const [form, setForm] = useState({
    name_ar: '', name_en: '', serial_number: '', manufacturer: '', model: '',
    category_id: '', currency: 'SAR',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name_ar.trim()) { toast.error(bi('اسم الأصل مطلوب','Asset name required')); return; }
    setSaving(true);
    const { error } = await AssetsApi.createAsset({
      owner_business_id: businessId,
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || undefined,
      serial_number: form.serial_number.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
      model: form.model.trim() || undefined,
      category_id: form.category_id || undefined,
      currency: form.currency,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تمت إضافة الأصل','Asset created'));
    await onCreated();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="font-semibold"><Bi ar="أصل جديد" en="New asset" /></div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground"><Bi ar="الاسم (عربي) *" en="Name (Arabic) *" /></label>
          <Input dir="auto" value={form.name_ar} onChange={e => setForm(f => ({...f, name_ar: e.target.value}))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground"><Bi ar="الاسم (إنجليزي)" en="Name (English)" /></label>
          <Input dir="auto" value={form.name_en} onChange={e => setForm(f => ({...f, name_en: e.target.value}))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground"><Bi ar="الرقم التسلسلي" en="Serial number" /></label>
          <Input className="tech-content" value={form.serial_number} onChange={e => setForm(f => ({...f, serial_number: e.target.value}))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground"><Bi ar="التصنيف" en="Category" /></label>
          <Select value={form.category_id} onValueChange={v => setForm(f => ({...f, category_id: v}))}>
            <SelectTrigger><SelectValue placeholder={bi('اختر التصنيف','Select category')} /></SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground"><Bi ar="الصانع" en="Manufacturer" /></label>
          <Input dir="auto" value={form.manufacturer} onChange={e => setForm(f => ({...f, manufacturer: e.target.value}))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground"><Bi ar="الموديل" en="Model" /></label>
          <Input dir="auto" value={form.model} onChange={e => setForm(f => ({...f, model: e.target.value}))} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={saving} className="gap-2">
          {saving && <Loader2 className="size-4 animate-spin" />}
          <Bi ar="حفظ" en="Save" />
        </Button>
      </div>
    </Card>
  );
};

const AssetDetail: React.FC<{ asset: Asset; onChanged: () => void | Promise<void> }> = ({ asset, onChanged }) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const [tab, setTab] = useState('maintenance');
  const [maint, setMaint] = useState<AssetMaintenance[]>([]);
  const [insp, setInsp] = useState<AssetInspection[]>([]);

  const reload = async () => {
    const [m, i] = await Promise.all([
      AssetMaintenanceApi.listForAsset(asset.id),
      AssetInspectionsApi.listForAsset(asset.id),
    ]);
    setMaint(m.data ?? []);
    setInsp(i.data ?? []);
  };

  useEffect(() => { reload(); }, [asset.id]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{isRTL ? asset.name_ar : (asset.name_en || asset.name_ar)}</div>
          <div className="text-xs text-muted-foreground tech-content">{asset.ref_id}</div>
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