/**
 * AdminPartnerShowcase — full management UI for the Home "Related Partners"
 * (مواقع ذات صلة) showcase. Inline forms only (no popups), per project UX
 * rules. Wrapped in DashboardLayout via AdminRoute pattern in App.tsx.
 *
 * Phase 10F: display sections extracted into
 * `@/components/admin/content/partner-showcase`. All queries, mutations,
 * ordering logic and image URLs remain owned by this page.
 */
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useBi } from '@/components/common/Bilingual';
import {
  PartnerShowcaseStatsSection,
  PartnerShowcaseEditorPanel,
  PartnerShowcaseAddPanel,
  PartnerShowcaseListSection,
  type PartnerShowcaseSettingsDraft,
  type PartnerShowcaseAddDraft,
  type PartnerShowcaseAddBusinessOption,
} from '@/components/admin/content/partner-showcase';

type Settings = PartnerShowcaseSettingsDraft;

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

type BusinessLite = PartnerShowcaseAddBusinessOption;

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
  const emptyDraft: PartnerShowcaseAddDraft = {
    source_type: 'external',
    business_id: null,
    name_ar: '',
    name_en: '',
    logo_url: '',
    target_url: '',
    is_active: true,
  };
  const [newDraft, setNewDraft] = useState<PartnerShowcaseAddDraft>(emptyDraft);

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
  const statsItems = useMemo(
    () => items.map((i) => ({ is_active: i.is_active, source_type: i.source_type })),
    [items],
  );

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

        <PartnerShowcaseStatsSection items={statsItems} />

        <PartnerShowcaseEditorPanel
          current={current}
          loading={settingsLoading}
          dirty={Boolean(draft)}
          saving={saveSettings.isPending}
          onChange={(next) => setDraft(next)}
          onCancel={() => setDraft(null)}
          onSave={() => draft && saveSettings.mutate(draft)}
        />

        <PartnerShowcaseAddPanel
          bizQuery={bizQuery}
          onBizQueryChange={setBizQuery}
          bizResults={bizResults}
          isTaken={(id) => linkedBusinessIds.has(id)}
          onPickBusiness={addFromBusiness}
          draft={newDraft}
          onDraftChange={setNewDraft}
          onUnlink={() => setNewDraft({ ...newDraft, source_type: 'external', business_id: null })}
          onSubmit={submitNew}
          submitting={upsertItem.isPending}
        />

        <PartnerShowcaseListSection
          items={items}
          isLoading={itemsLoading}
          onMove={(id, dir) => { void move(id, dir); }}
          onToggleShow={(id, next) => upsertItem.mutate({ id, is_active: next })}
          onDelete={(id) => {
            if (confirm(bi('حذف هذا الشريك؟', 'Delete this partner?'))) {
              deleteItem.mutate(id);
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminPartnerShowcase;
