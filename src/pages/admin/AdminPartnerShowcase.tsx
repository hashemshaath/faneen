/**
 * AdminPartnerShowcase — full management UI for the Home "Related Partners"
 * (مواقع ذات صلة) showcase. Inline forms only (no popups), per project UX
 * rules. Wrapped in DashboardLayout via AdminRoute pattern in App.tsx.
 */
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2, Plus, Save, Trash2, ImageIcon, ArrowUp, ArrowDown,
  Eye, EyeOff, Building2, Link as LinkIcon, Search as SearchIcon, X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useBi } from '@/components/common/Bilingual';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Settings = {
  id: string;
  is_enabled: boolean;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  display_mode: 'marquee' | 'grid' | 'static';
  speed: number;
  direction: 'ltr' | 'rtl';
  pause_on_hover: boolean;
  show_arrows: boolean;
  logo_size: 'sm' | 'md' | 'lg';
  gap_size: 'sm' | 'md' | 'lg';
  grayscale: boolean;
  open_in_new_tab: boolean;
  style_variant: 'default' | 'muted' | 'bordered' | 'glass';
};

type Item = {
  id: string;
  source_type: 'business' | 'external';
  business_id: string | null;
  name_ar: string;
  name_en: string;
  logo_url: string;
  target_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type BusinessLite = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  logo_url: string | null;
};

const SETTINGS_KEY = ['admin', 'partner-showcase', 'settings'];
const ITEMS_KEY = ['admin', 'partner-showcase', 'items'];

const AdminPartnerShowcase: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const qc = useQueryClient();

  // --------------------------------------------------------------
  // Settings
  // --------------------------------------------------------------
  const { data: settings, isLoading: settingsLoading } = useQuery<Settings | null>({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_showcase_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  const [draft, setDraft] = useState<Settings | null>(null);
  const current = draft ?? settings ?? null;

  const saveSettings = useMutation({
    mutationFn: async (next: Settings) => {
      const { error } = await supabase
        .from('partner_showcase_settings')
        .update({
          is_enabled: next.is_enabled,
          title_ar: next.title_ar,
          title_en: next.title_en,
          description_ar: next.description_ar,
          description_en: next.description_en,
          display_mode: next.display_mode,
          speed: next.speed,
          direction: next.direction,
          pause_on_hover: next.pause_on_hover,
          show_arrows: next.show_arrows,
          logo_size: next.logo_size,
          gap_size: next.gap_size,
          grayscale: next.grayscale,
          open_in_new_tab: next.open_in_new_tab,
          style_variant: next.style_variant,
        })
        .eq('id', next.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bi('تم حفظ الإعدادات', 'Settings saved'));
      setDraft(null);
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      qc.invalidateQueries({ queryKey: ['partner-showcase-settings'] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : bi('فشل الحفظ', 'Save failed')),
  });

  // --------------------------------------------------------------
  // Items
  // --------------------------------------------------------------
  const { data: items = [], isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ITEMS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_showcase_items')
        .select('id,source_type,business_id,name_ar,name_en,logo_url,target_url,sort_order,is_active')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const linkedBusinessIds = useMemo(
    () => new Set(items.filter((i) => i.business_id).map((i) => i.business_id as string)),
    [items],
  );

  const upsertItem = useMutation({
    mutationFn: async (row: Partial<Item> & { id?: string }) => {
      if (row.id) {
        const { error } = await supabase
          .from('partner_showcase_items')
          .update({
            source_type: row.source_type,
            business_id: row.business_id,
            name_ar: row.name_ar,
            name_en: row.name_en,
            logo_url: row.logo_url,
            target_url: row.target_url,
            sort_order: row.sort_order,
            is_active: row.is_active,
          })
          .eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partner_showcase_items').insert({
          source_type: row.source_type ?? 'external',
          business_id: row.business_id ?? null,
          name_ar: row.name_ar ?? '',
          name_en: row.name_en ?? '',
          logo_url: row.logo_url ?? '',
          target_url: row.target_url ?? null,
          sort_order: row.sort_order ?? (items.length + 1) * 10,
          is_active: row.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ITEMS_KEY });
      qc.invalidateQueries({ queryKey: ['partner-showcase-items'] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : bi('فشل', 'Failed')),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partner_showcase_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bi('تم الحذف', 'Deleted'));
      qc.invalidateQueries({ queryKey: ITEMS_KEY });
      qc.invalidateQueries({ queryKey: ['partner-showcase-items'] });
    },
  });

  // --------------------------------------------------------------
  // Business picker
  // --------------------------------------------------------------
  const [bizQuery, setBizQuery] = useState('');
  const { data: bizResults = [] } = useQuery<BusinessLite[]>({
    queryKey: ['admin', 'partner-showcase', 'businesses', bizQuery],
    queryFn: async () => {
      if (bizQuery.trim().length < 2) return [];
      const { data, error } = await supabase
        .from('businesses')
        .select('id,name_ar,name_en,username,logo_url')
        .or(`name_ar.ilike.%${bizQuery}%,name_en.ilike.%${bizQuery}%,username.ilike.%${bizQuery}%`)
        .limit(8);
      if (error) throw error;
      return (data ?? []) as BusinessLite[];
    },
    enabled: bizQuery.trim().length >= 2,
  });

  // --------------------------------------------------------------
  // New item draft
  // --------------------------------------------------------------
  const emptyDraft: Partial<Item> = {
    source_type: 'external',
    business_id: null,
    name_ar: '',
    name_en: '',
    logo_url: '',
    target_url: '',
    is_active: true,
  };
  const [newDraft, setNewDraft] = useState<Partial<Item>>(emptyDraft);

  const addFromBusiness = (b: BusinessLite) => {
    if (linkedBusinessIds.has(b.id)) {
      toast.error(bi('هذه الشركة مضافة مسبقًا', 'This business is already added'));
      return;
    }
    setNewDraft({
      source_type: 'business',
      business_id: b.id,
      name_ar: b.name_ar ?? b.name_en ?? '',
      name_en: b.name_en ?? b.name_ar ?? '',
      logo_url: b.logo_url ?? '',
      target_url: b.username ? `/${b.username}` : `/${b.id}`,
      is_active: true,
    });
    setBizQuery('');
  };

  const submitNew = async () => {
    if (!newDraft.name_ar || !newDraft.name_en || !newDraft.logo_url) {
      toast.error(bi('الاسم والشعار مطلوبان', 'Name and logo are required'));
      return;
    }
    await upsertItem.mutateAsync({ ...newDraft, sort_order: (items.length + 1) * 10 });
    toast.success(bi('تمت الإضافة', 'Added'));
    setNewDraft(emptyDraft);
  };

  const move = async (id: string, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((i) => i.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      upsertItem.mutateAsync({ id: a.id, sort_order: b.sort_order }),
      upsertItem.mutateAsync({ id: b.id, sort_order: a.sort_order }),
    ]);
  };

  // --------------------------------------------------------------
  // Render
  // --------------------------------------------------------------
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {bi('شركاؤنا — مواقع ذات صلة', 'Related Partners Showcase')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bi(
              'إدارة قسم شعارات الشركاء الذي يظهر في الصفحة الرئيسية.',
              'Manage the partner-logo strip shown on the home page.',
            )}
          </p>
        </div>

        {/* SETTINGS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{bi('إعدادات القسم', 'Section Settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {settingsLoading || !current ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    {current.is_enabled ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    <div>
                      <Label className="font-medium">{bi('تفعيل القسم', 'Enable section')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {bi('عند الإيقاف لن يظهر القسم للزوار.', 'When disabled the section is hidden from visitors.')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={current.is_enabled}
                    onCheckedChange={(v) => setDraft({ ...current, is_enabled: v })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{bi('العنوان (عربي)', 'Title (Arabic)')}</Label>
                    <Input dir="auto" value={current.title_ar} onChange={(e) => setDraft({ ...current, title_ar: e.target.value })} />
                  </div>
                  <div>
                    <Label>{bi('العنوان (إنجليزي)', 'Title (English)')}</Label>
                    <Input dir="auto" value={current.title_en} onChange={(e) => setDraft({ ...current, title_en: e.target.value })} />
                  </div>
                  <div>
                    <Label>{bi('الوصف (عربي)', 'Description (Arabic)')}</Label>
                    <Textarea dir="auto" rows={2} value={current.description_ar} onChange={(e) => setDraft({ ...current, description_ar: e.target.value })} />
                  </div>
                  <div>
                    <Label>{bi('الوصف (إنجليزي)', 'Description (English)')}</Label>
                    <Textarea dir="auto" rows={2} value={current.description_en} onChange={(e) => setDraft({ ...current, description_en: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>{bi('السرعة (ثوانٍ/دورة)', 'Speed (s/loop)')}</Label>
                    <Input
                      type="number"
                      min={10}
                      max={200}
                      value={current.speed}
                      onChange={(e) => setDraft({ ...current, speed: Math.max(10, Math.min(200, Number(e.target.value) || 40)) })}
                    />
                  </div>
                  <div>
                    <Label>{bi('اتجاه الحركة', 'Direction')}</Label>
                    <Select value={current.direction} onValueChange={(v) => setDraft({ ...current, direction: v as Settings['direction'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rtl">RTL ←</SelectItem>
                        <SelectItem value="ltr">LTR →</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{bi('حجم الشعار', 'Logo size')}</Label>
                    <Select value={current.logo_size} onValueChange={(v) => setDraft({ ...current, logo_size: v as Settings['logo_size'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">SM</SelectItem>
                        <SelectItem value="md">MD</SelectItem>
                        <SelectItem value="lg">LG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{bi('المسافة بين الشعارات', 'Gap')}</Label>
                    <Select value={current.gap_size} onValueChange={(v) => setDraft({ ...current, gap_size: v as Settings['gap_size'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">SM</SelectItem>
                        <SelectItem value="md">MD</SelectItem>
                        <SelectItem value="lg">LG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{bi('نمط الخلفية', 'Style variant')}</Label>
                    <Select value={current.style_variant} onValueChange={(v) => setDraft({ ...current, style_variant: v as Settings['style_variant'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="muted">Muted</SelectItem>
                        <SelectItem value="bordered">Bordered</SelectItem>
                        <SelectItem value="glass">Glass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ToggleRow label={bi('إيقاف عند المرور', 'Pause on hover')} checked={current.pause_on_hover}
                    onChange={(v) => setDraft({ ...current, pause_on_hover: v })} />
                  <ToggleRow label={bi('إظهار الأسهم', 'Show arrows')} checked={current.show_arrows}
                    onChange={(v) => setDraft({ ...current, show_arrows: v })} />
                  <ToggleRow label={bi('Grayscale', 'Grayscale')} checked={current.grayscale}
                    onChange={(v) => setDraft({ ...current, grayscale: v })} />
                  <ToggleRow label={bi('فتح بتبويب جديد', 'Open in new tab')} checked={current.open_in_new_tab}
                    onChange={(v) => setDraft({ ...current, open_in_new_tab: v })} />
                </div>

                <div className="flex items-center justify-end gap-2">
                  {draft && (
                    <Button variant="ghost" onClick={() => setDraft(null)}>
                      {bi('إلغاء', 'Cancel')}
                    </Button>
                  )}
                  <Button
                    disabled={!draft || saveSettings.isPending}
                    onClick={() => draft && saveSettings.mutate(draft)}
                  >
                    {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                    {bi('حفظ الإعدادات', 'Save settings')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ADD NEW ITEM */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{bi('إضافة شريك جديد', 'Add a partner')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* From system business */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> {bi('اختيار شركة من النظام', 'Pick a business from the system')}
              </Label>
              <div className="relative">
                <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  dir="auto"
                  placeholder={bi('ابحث بالاسم أو اسم المستخدم…', 'Search by name or username…')}
                  value={bizQuery}
                  onChange={(e) => setBizQuery(e.target.value)}
                  className="ps-9"
                />
              </div>
              {bizResults.length > 0 && (
                <ul className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-auto">
                  {bizResults.map((b) => {
                    const taken = linkedBusinessIds.has(b.id);
                    return (
                      <li key={b.id} className="flex items-center justify-between gap-3 p-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {b.logo_url ? (
                            <img src={b.logo_url} alt="" className="w-8 h-8 object-contain rounded bg-muted/50" />
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center rounded bg-muted/50">
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{b.name_ar || b.name_en || '—'}</div>
                            <div className="text-xs text-muted-foreground truncate">@{b.username ?? b.id.slice(0, 8)}</div>
                          </div>
                        </div>
                        <Button size="sm" variant={taken ? 'ghost' : 'outline'} disabled={taken} onClick={() => addFromBusiness(b)}>
                          {taken ? bi('مضافة', 'Added') : bi('اختيار', 'Pick')}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Manual fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>{bi('الاسم (عربي)', 'Name (Arabic)')}</Label>
                <Input dir="auto" value={newDraft.name_ar ?? ''} onChange={(e) => setNewDraft({ ...newDraft, name_ar: e.target.value })} />
              </div>
              <div>
                <Label>{bi('الاسم (إنجليزي)', 'Name (English)')}</Label>
                <Input dir="auto" value={newDraft.name_en ?? ''} onChange={(e) => setNewDraft({ ...newDraft, name_en: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> {bi('رابط الشعار', 'Logo URL')}</Label>
                <Input dir="ltr" placeholder="https://…" value={newDraft.logo_url ?? ''} onChange={(e) => setNewDraft({ ...newDraft, logo_url: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="flex items-center gap-2"><LinkIcon className="w-4 h-4" /> {bi('الرابط المستهدف', 'Target URL')}</Label>
                <Input dir="ltr" placeholder="https://… or /username" value={newDraft.target_url ?? ''} onChange={(e) => setNewDraft({ ...newDraft, target_url: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {newDraft.source_type === 'business' && newDraft.business_id ? (
                  <Badge variant="secondary">{bi('مرتبط بشركة في النظام', 'Linked to system business')}</Badge>
                ) : (
                  <Badge variant="outline">{bi('شريك خارجي', 'External partner')}</Badge>
                )}
                {newDraft.business_id && (
                  <Button variant="ghost" size="sm" onClick={() => setNewDraft({ ...newDraft, source_type: 'external', business_id: null })}>
                    <X className="w-3.5 h-3.5 me-1" /> {bi('إلغاء الربط', 'Unlink')}
                  </Button>
                )}
              </div>
              <Button onClick={submitNew} disabled={upsertItem.isPending}>
                <Plus className="w-4 h-4 me-2" /> {bi('إضافة', 'Add')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ITEMS LIST */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{bi('الشركاء الحاليون', 'Current partners')}</span>
              <Badge variant="secondary">{items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {bi('لا يوجد شركاء بعد. أضف أول شريك من الأعلى.', 'No partners yet. Add the first one above.')}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {[...items].sort((a, b) => a.sort_order - b.sort_order).map((it, idx, arr) => (
                  <li key={it.id} className="py-3 flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => move(it.id, -1)} aria-label="Up">
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={idx === arr.length - 1} onClick={() => move(it.id, +1)} aria-label="Down">
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <img src={it.logo_url} alt="" className="w-14 h-10 object-contain rounded bg-muted/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{it.name_ar} <span className="text-muted-foreground">— {it.name_en}</span></div>
                      <div className="text-xs text-muted-foreground truncate">{it.target_url ?? bi('بدون رابط', 'No link')}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {it.source_type === 'business'
                          ? <Badge variant="secondary" className="text-[10px]">{bi('من النظام', 'System')}</Badge>
                          : <Badge variant="outline" className="text-[10px]">{bi('خارجي', 'External')}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={it.is_active}
                        onCheckedChange={(v) => upsertItem.mutate({ id: it.id, is_active: v })}
                        aria-label={bi('تفعيل', 'Active')}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(bi('حذف هذا الشريك؟', 'Delete this partner?'))) {
                            deleteItem.mutate(it.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const ToggleRow: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label, checked, onChange,
}) => (
  <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
    <Label className="text-sm">{label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default AdminPartnerShowcase;