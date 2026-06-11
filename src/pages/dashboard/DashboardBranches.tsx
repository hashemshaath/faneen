import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2, MapPin, Phone, Mail, Globe, Plus, Save, Trash2, Star,
  ChevronDown, ChevronUp, ExternalLink, Loader2, UserCog, Tag, Boxes,
  Instagram, Facebook, Linkedin, Youtube, MessageCircle,
  ShieldAlert, ArrowRight, ArrowLeft,
} from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';
import {
  getOwnerBusiness,
  listBusinessesByIds,
  listBusinessStaffByBusiness,
} from '@/modules/businesses';
import { listProfilesByUserIds } from '@/modules/users';
import {
  listBranchesByBusiness,
  insertBusinessBranchReturning,
  updateBusinessBranchById,
  deleteBusinessBranchById,
  setMainBranch,
  listBranchServiceIds,
  listBranchPromotionIds,
  attachServiceToBranch,
  detachServiceFromBranch,
  attachPromotionToBranch,
  detachPromotionFromBranch,
  listServicesByBusiness,
} from '@/modules/catalog';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

/* ────────────────────────────────────────────────────────────────────── */
/*  Types (loose — branches table has many optional cols)                */
/* ────────────────────────────────────────────────────────────────────── */

interface BranchRow {
  id: string;
  business_id: string;
  ref_id: string | null;
  slug: string | null;
  is_main: boolean;
  is_active: boolean;
  sort_order: number;
  name_ar: string;
  name_en: string | null;
  branch_type?: string | null;
  description_ar: string | null;
  description_en: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  customer_service_phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  region: string | null;
  district: string | null;
  street_name: string | null;
  building_number: string | null;
  short_address: string | null;
  floor_number: string | null;
  unit_number: string | null;
  latitude: number | null;
  longitude: number | null;
  working_hours: unknown;
  sales_manager_staff_id: string | null;
  social_instagram: string | null;
  social_x: string | null;
  social_tiktok: string | null;
  social_linkedin: string | null;
  social_facebook: string | null;
  social_snapchat: string | null;
  social_youtube: string | null;
}

interface StaffLite { id: string; user_id: string; role: string; is_active: boolean }

interface ProfileLite { id: string; full_name: string | null; phone: string | null; email: string | null }

interface ServiceLite { id: string; name_ar: string; name_en: string | null; is_active: boolean }

interface PromotionLite { id: string; title_ar: string; title_en: string | null; is_active: boolean }

/* ────────────────────────────────────────────────────────────────────── */

const sectionCls =
  'rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5 space-y-4 hover-lift transition';
const labelCls = 'text-xs font-medium text-muted-foreground';
const grid2 = 'grid gap-3 sm:grid-cols-2';
const grid3 = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';

/* ────────────────────────────────────────────────────────────────────── */
/*  Main page                                                            */
/* ────────────────────────────────────────────────────────────────────── */

const DashboardBranches: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  usePageMeta({
    title: t(isRTL, 'الفروع | قِطاعات', 'Branches | Qitaat'),
    noindex: true,
  });

  // Active owner business
  const { data: businessId } = useQuery({
    queryKey: ['owner-business-id', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await getOwnerBusiness({ userId: user!.id, select: 'id' });
       
      return ((data as any)?.id ?? null) as string | null;
    },
  });

  // Business username — required to build canonical /:username/:branch-slug links.
  const { data: businessUsername } = useQuery({
    queryKey: ['owner-business-username', businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data } = await listBusinessesByIds<{ id: string; username: string | null }>({
        ids: [businessId!], select: 'id, username',
      });
      return data?.[0]?.username ?? null;
    },
  });

  // Branches list
  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches', businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data, error } = await listBranchesByBusiness<BranchRow>({
        businessId: businessId!,
        order: [{ column: 'is_main', ascending: false }, { column: 'sort_order', ascending: true }],
      });
      if (error) throw error;
      return (data ?? []) as BranchRow[];
    },
  });

  // Staff (sales manager candidates)
  const { data: staff } = useQuery({
    queryKey: ['business-staff', businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data, error } = await listBusinessStaffByBusiness({
        businessId: businessId!,
        select: 'id, user_id, role, is_active',
      });
      if (error) throw error;
      return (data ?? []) as StaffLite[];
    },
  });

  const staffUserIds = useMemo(
    () => (staff ?? []).filter(s => s.is_active).map(s => s.user_id),
    [staff],
  );

  const { data: profiles } = useQuery({
    queryKey: ['staff-profiles', staffUserIds.join(',')],
    enabled: staffUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await listProfilesByUserIds<ProfileLite>({
        userIds: staffUserIds,
        select: 'user_id, full_name, phone, email',
      });
      if (error) throw error;
      // Normalize user_id -> id so the rest of the page keeps working
      return ((data ?? []) as Array<ProfileLite & { user_id: string }>).map(r => ({
        id: r.user_id, full_name: r.full_name, phone: r.phone, email: r.email,
      })) as ProfileLite[];
    },
  });

  const staffOptions = useMemo(() => {
    const map = new Map<string, ProfileLite>((profiles ?? []).map(p => [p.id, p]));
    return (staff ?? []).filter(s => s.is_active).map(s => ({
      staffId: s.id,
      label: map.get(s.user_id)?.full_name || map.get(s.user_id)?.email || s.user_id.slice(0, 8),
      phone: map.get(s.user_id)?.phone ?? null,
      role: s.role,
    }));
  }, [staff, profiles]);

  // Services + promotions (linking pool)
  const { data: services } = useQuery({
    queryKey: ['business-services-light', businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data, error } = await listServicesByBusiness<ServiceLite>({
        businessId: businessId!,
        select: 'id, name_ar, name_en, is_active',
      });
      if (error) throw error;
      return (data ?? []) as ServiceLite[];
    },
  });

  const { data: promotions } = useQuery({
    queryKey: ['business-promotions-light', businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('id, title_ar, title_en, is_active')
        .eq('business_id', businessId!);
      if (error) throw error;
      return (data ?? []) as PromotionLite[];
    },
  });

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!businessId || !draftName.trim()) return;
    setBusy(true);
    const { data, error } = await insertBusinessBranchReturning(
      { business_id: businessId, name_ar: draftName.trim(), is_active: true } as never,
      'id',
      'single',
    );
    setBusy(false);
    if (error) { toast.error(t(isRTL, 'تعذر إضافة الفرع', 'Failed to add branch')); return; }
    toast.success(t(isRTL, 'تم إنشاء الفرع', 'Branch created'));
    setDraftName(''); setCreating(false);
    qc.invalidateQueries({ queryKey: ['branches', businessId] });
     
    setExpandedId(((data as any)?.id ?? null));
  };

  const handleSetMain = async (branchId: string) => {
    const currentMain = (branches ?? []).find((b) => b.is_main && b.id !== branchId);
    const target = (branches ?? []).find((b) => b.id === branchId);
    const msg = currentMain
      ? t(isRTL,
          `سيتم إلغاء "${currentMain.name_ar}" كفرع رئيسي وتعيين "${target?.name_ar ?? ''}" بدلاً منه. متابعة؟`,
          `"${currentMain.name_ar}" will be unset as main and "${target?.name_ar ?? ''}" will replace it. Continue?`)
      : t(isRTL, 'تعيين هذا الفرع كرئيسي؟', 'Set this branch as main?');
    if (!confirm(msg)) return;
    setBusy(true);
    const { error } = await setMainBranch(branchId);
    setBusy(false);
    if (error) { toast.error(t(isRTL, 'تعذر تعيين الفرع الرئيسي', 'Failed to set main branch')); return; }
    toast.success(t(isRTL, 'تم تعيين الفرع كرئيسي', 'Branch set as main'));
    qc.invalidateQueries({ queryKey: ['branches', businessId] });
  };

  const handleDelete = async (branch: BranchRow) => {
    if (!confirm(t(isRTL, `حذف الفرع "${branch.name_ar}"؟`, `Delete branch "${branch.name_ar}"?`))) return;
    setBusy(true);
    const { error } = await deleteBusinessBranchById(branch.id);
    setBusy(false);
    if (error) {
      const msg = (error as { message?: string })?.message || '';
      toast.error(msg.includes('main branch')
        ? t(isRTL, 'لا يمكن حذف الفرع الرئيسي. عيّن فرعاً آخر كرئيسي أولاً.', 'Cannot delete main branch. Set another as main first.')
        : t(isRTL, 'تعذر حذف الفرع', 'Failed to delete branch'));
      return;
    }
    toast.success(t(isRTL, 'تم حذف الفرع', 'Branch deleted'));
    if (expandedId === branch.id) setExpandedId(null);
    qc.invalidateQueries({ queryKey: ['branches', businessId] });
  };

  /* ─────────────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Building2}
          tone="primary"
          eyebrow={t(isRTL, 'الفروع', 'Branches')}
          title={t(isRTL, 'إدارة الفروع', 'Branches')}
          subtitle={t(isRTL,
            'أنشئ وأدر فروع منشأتك. اختر الفرع الرئيسي، عيّن مدير مبيعات لكل فرع، واربط منتجاتك وعروضك بالفروع المناسبة.',
            'Create and manage branches of your business. Pick a main branch, assign a sales manager per branch, and link services and offers to specific branches.')}
          actions={
            <Button onClick={() => setCreating(c => !c)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t(isRTL, 'إضافة فرع', 'Add branch')}
            </Button>
          }
        />

        {creating && (
          <Card className="border-primary/40">
            <CardContent className="p-5 flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[240px] space-y-1.5">
                <Label className={labelCls}>{t(isRTL, 'اسم الفرع (عربي) *', 'Branch name (Arabic) *')}</Label>
                <Input
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  dir="auto"
                  placeholder={t(isRTL, 'مثال: فرع الرياض الرئيسي', 'e.g. Riyadh Main Branch')}
                  className="h-12"
                />
              </div>
              <Button onClick={handleCreate} disabled={busy || !draftName.trim()} className="gap-2 h-12">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t(isRTL, 'حفظ', 'Save')}
              </Button>
              <Button variant="ghost" onClick={() => { setCreating(false); setDraftName(''); }} className="h-12">
                {t(isRTL, 'إلغاء', 'Cancel')}
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin me-2" />
            {t(isRTL, 'تحميل الفروع...', 'Loading branches...')}
          </div>
        )}

        {!isLoading && (branches?.length ?? 0) === 0 && !creating && (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center space-y-3">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">
                {t(isRTL, 'لا توجد فروع بعد. ابدأ بإضافة فرعك الأول.', 'No branches yet. Add your first branch.')}
              </p>
              <Button onClick={() => setCreating(true)} className="gap-2">
                <Plus className="w-4 h-4" /> {t(isRTL, 'إضافة فرع', 'Add branch')}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {(branches ?? []).map(branch => (
            <BranchCard
              key={branch.id}
              branch={branch}
              businessUsername={businessUsername ?? null}
              isExpanded={expandedId === branch.id}
              onToggle={() => setExpandedId(p => (p === branch.id ? null : branch.id))}
              onSetMain={() => handleSetMain(branch.id)}
              onDelete={() => handleDelete(branch)}
              staffOptions={staffOptions}
              services={services ?? []}
              promotions={promotions ?? []}
              isRTL={isRTL}
              busy={busy}
              onSaved={() => qc.invalidateQueries({ queryKey: ['branches', businessId] })}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardBranches;

/* ────────────────────────────────────────────────────────────────────── */
/*  Branch card (collapsed summary + expanded tabs)                      */
/* ────────────────────────────────────────────────────────────────────── */

interface BranchCardProps {
  branch: BranchRow;
  businessUsername: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onSetMain: () => void;
  onDelete: () => void;
  staffOptions: Array<{ staffId: string; label: string; phone: string | null; role: string }>;
  services: ServiceLite[];
  promotions: PromotionLite[];
  isRTL: boolean;
  busy: boolean;
  onSaved: () => void;
}

const BranchCard: React.FC<BranchCardProps> = ({
  branch, businessUsername, isExpanded, onToggle, onSetMain, onDelete,
  staffOptions, services, promotions, isRTL, busy, onSaved,
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-5">
        <button onClick={onToggle} className="flex-1 text-start space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg" dir="auto">{branch.name_ar}</CardTitle>
            {branch.is_main && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                <Star className="w-3 h-3 fill-current" />
                {t(isRTL, 'رئيسي', 'Main')}
              </Badge>
            )}
            {!branch.is_active && (
              <Badge variant="outline" className="text-muted-foreground">
                {t(isRTL, 'معطّل', 'Inactive')}
              </Badge>
            )}
            <span className="tech-content text-xs text-muted-foreground">{branch.ref_id}</span>
          </div>
          <CardDescription className="flex items-center gap-3 flex-wrap text-xs">
            {branch.address && (<span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{branch.address}</span>)}
            {branch.phone && (<span className="flex items-center gap-1 tech-content"><Phone className="w-3 h-3" />{branch.phone}</span>)}
          </CardDescription>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {!branch.is_main && (
            <Button size="sm" variant="outline" onClick={onSetMain} disabled={busy} className="gap-1">
              <Star className="w-3.5 h-3.5" />
              {t(isRTL, 'جعله رئيسي', 'Set main')}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDelete} disabled={busy} className="text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggle}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-5 pt-0">
          <Separator className="mb-5" />
          <BranchEditor
            branch={branch}
            businessUsername={businessUsername}
            staffOptions={staffOptions}
            services={services}
            promotions={promotions}
            isRTL={isRTL}
            onSaved={onSaved}
          />
        </CardContent>
      )}
    </Card>
  );
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Branch editor with 5 tabs                                            */
/* ────────────────────────────────────────────────────────────────────── */

interface BranchEditorProps {
  branch: BranchRow;
  businessUsername: string | null;
  staffOptions: Array<{ staffId: string; label: string; phone: string | null; role: string }>;
  services: ServiceLite[];
  promotions: PromotionLite[];
  isRTL: boolean;
  onSaved: () => void;
}

const BranchEditor: React.FC<BranchEditorProps> = ({
  branch, businessUsername, staffOptions, services, promotions, isRTL, onSaved,
}) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<BranchRow>(branch);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof BranchRow>(k: K, v: BranchRow[K]) => setForm(f => ({ ...f, [k]: v }));

  const { data: linkedServiceIds } = useQuery({
    queryKey: ['branch-services', branch.id],
    queryFn: async () => {
      const { data } = await listBranchServiceIds(branch.id);
      return new Set(data ?? []);
    },
  });

  const { data: linkedPromotionIds } = useQuery({
    queryKey: ['branch-promotions', branch.id],
    queryFn: async () => {
      const { data } = await listBranchPromotionIds(branch.id);
      return new Set(data ?? []);
    },
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateBusinessBranchById(branch.id, {
      name_ar: form.name_ar,
      name_en: form.name_en,
      description_ar: form.description_ar,
      description_en: form.description_en,
      slug: form.slug,
      is_active: form.is_active,
      phone: form.phone,
      mobile: form.mobile,
      whatsapp: form.whatsapp,
      customer_service_phone: form.customer_service_phone,
      email: form.email,
      website: form.website,
      address: form.address,
      region: form.region,
      district: form.district,
      street_name: form.street_name,
      building_number: form.building_number,
      short_address: form.short_address,
      floor_number: form.floor_number,
      unit_number: form.unit_number,
      sales_manager_staff_id: form.sales_manager_staff_id,
      social_instagram: form.social_instagram,
      social_x: form.social_x,
      social_tiktok: form.social_tiktok,
      social_linkedin: form.social_linkedin,
      social_facebook: form.social_facebook,
      social_snapchat: form.social_snapchat,
      social_youtube: form.social_youtube,
    } as never);
    setSaving(false);
    if (error) {
      const msg = (error as { message?: string })?.message || '';
      toast.error(msg.includes('sales_manager')
        ? t(isRTL, 'مدير المبيعات يجب أن يكون من فريق هذه المنشأة.', 'Sales manager must belong to this business.')
        : t(isRTL, 'تعذر حفظ الفرع', 'Failed to save branch'));
      return;
    }
    toast.success(t(isRTL, 'تم حفظ التعديلات', 'Changes saved'));
    onSaved();
  };

  const toggleService = async (serviceId: string, checked: boolean) => {
    if (checked) {
      await attachServiceToBranch({ branchId: branch.id, serviceId, businessId: branch.business_id });
    } else {
      await detachServiceFromBranch({ branchId: branch.id, serviceId });
    }
    qc.invalidateQueries({ queryKey: ['branch-services', branch.id] });
  };

  const togglePromotion = async (promotionId: string, checked: boolean) => {
    if (checked) {
      await attachPromotionToBranch({ branchId: branch.id, promotionId, businessId: branch.business_id });
    } else {
      await detachPromotionFromBranch({ branchId: branch.id, promotionId });
    }
    qc.invalidateQueries({ queryKey: ['branch-promotions', branch.id] });
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4 w-full">
        <TabsTrigger value="basic">{t(isRTL, 'أساسي', 'Basic')}</TabsTrigger>
        <TabsTrigger value="contact">{t(isRTL, 'التواصل', 'Contact')}</TabsTrigger>
        <TabsTrigger value="address">{t(isRTL, 'العنوان', 'Address')}</TabsTrigger>
        <TabsTrigger value="social">{t(isRTL, 'سوشال', 'Social')}</TabsTrigger>
        <TabsTrigger value="catalog">{t(isRTL, 'المنتجات والعروض', 'Catalog')}</TabsTrigger>
      </TabsList>

      {/* Basic */}
      <TabsContent value="basic" className="space-y-4">
        <div className={grid2}>
          <Field label={t(isRTL, 'الاسم (عربي) *', 'Name (Arabic) *')}>
            <Input value={form.name_ar ?? ''} onChange={e => set('name_ar', e.target.value)} dir="auto" />
          </Field>
          <Field label={t(isRTL, 'الاسم (إنجليزي)', 'Name (English)')}>
            <Input value={form.name_en ?? ''} onChange={e => set('name_en', e.target.value)} dir="ltr" />
          </Field>
          <Field label={t(isRTL, 'وصف الفرع (عربي)', 'Description (Arabic)')}>
            <Textarea value={form.description_ar ?? ''} onChange={e => set('description_ar', e.target.value)} dir="auto" rows={3} />
          </Field>
          <Field label={t(isRTL, 'وصف الفرع (إنجليزي)', 'Description (English)')}>
            <Textarea value={form.description_en ?? ''} onChange={e => set('description_en', e.target.value)} dir="ltr" rows={3} />
          </Field>
          <Field label={t(isRTL, 'مدير المبيعات', 'Sales manager')}>
            <select
              value={form.sales_manager_staff_id ?? ''}
              onChange={e => set('sales_manager_staff_id', e.target.value || null)}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t(isRTL, '— غير معيّن —', '— Unassigned —')}</option>
              {staffOptions.map(o => (
                <option key={o.staffId} value={o.staffId}>{o.label} ({o.role})</option>
              ))}
            </select>
          </Field>
          <Field label={t(isRTL, 'حالة الفرع', 'Status')}>
            <div className="flex items-center gap-3 h-12">
              <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
              <span className="text-sm">{form.is_active ? t(isRTL, 'مفعّل', 'Active') : t(isRTL, 'معطّل', 'Inactive')}</span>
            </div>
          </Field>
        </div>
      </TabsContent>

      {/* Contact */}
      <TabsContent value="contact" className="space-y-4">
        <div className={grid3}>
          <Field label={t(isRTL, 'هاتف ثابت', 'Phone')} icon={<Phone className="w-3.5 h-3.5" />}>
            <Input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} dir="ltr" className="tech-content" />
          </Field>
          <Field label={t(isRTL, 'جوال', 'Mobile')} icon={<Phone className="w-3.5 h-3.5" />}>
            <Input value={form.mobile ?? ''} onChange={e => set('mobile', e.target.value)} dir="ltr" className="tech-content" />
          </Field>
          <Field label={t(isRTL, 'واتساب', 'WhatsApp')} icon={<MessageCircle className="w-3.5 h-3.5" />}>
            <Input value={form.whatsapp ?? ''} onChange={e => set('whatsapp', e.target.value)} dir="ltr" className="tech-content" />
          </Field>
          <Field label={t(isRTL, 'خدمة العملاء', 'Customer service')} icon={<Phone className="w-3.5 h-3.5" />}>
            <Input value={form.customer_service_phone ?? ''} onChange={e => set('customer_service_phone', e.target.value)} dir="ltr" className="tech-content" />
          </Field>
          <Field label={t(isRTL, 'البريد الإلكتروني', 'Email')} icon={<Mail className="w-3.5 h-3.5" />}>
            <Input value={form.email ?? ''} onChange={e => set('email', e.target.value)} dir="ltr" type="email" />
          </Field>
          <Field label={t(isRTL, 'الموقع الإلكتروني', 'Website')} icon={<Globe className="w-3.5 h-3.5" />}>
            <Input value={form.website ?? ''} onChange={e => set('website', e.target.value)} dir="ltr" />
          </Field>
        </div>
      </TabsContent>

      {/* Address */}
      <TabsContent value="address" className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t(isRTL,
            'العنوان الوطني للفرع. لإدارة جميع عناوين منشأتك من مكان واحد استخدم مركز العناوين.',
            'National address for this branch. To manage all your business addresses, use the addresses center.')}
        </p>
        <div className={grid2}>
          <Field label={t(isRTL, 'العنوان (سطر مختصر)', 'Address line')}>
            <Input value={form.address ?? ''} onChange={e => set('address', e.target.value)} dir="auto" />
          </Field>
          <Field label={t(isRTL, 'الرمز المختصر', 'Short address')}>
            <Input value={form.short_address ?? ''} onChange={e => set('short_address', e.target.value)} dir="ltr" className="tech-content" />
          </Field>
          <Field label={t(isRTL, 'المنطقة', 'Region')}>
            <Input value={form.region ?? ''} onChange={e => set('region', e.target.value)} dir="auto" />
          </Field>
          <Field label={t(isRTL, 'الحي', 'District')}>
            <Input value={form.district ?? ''} onChange={e => set('district', e.target.value)} dir="auto" />
          </Field>
          <Field label={t(isRTL, 'الشارع', 'Street')}>
            <Input value={form.street_name ?? ''} onChange={e => set('street_name', e.target.value)} dir="auto" />
          </Field>
          <Field label={t(isRTL, 'رقم المبنى', 'Building no.')}>
            <Input value={form.building_number ?? ''} onChange={e => set('building_number', e.target.value)} dir="ltr" className="tech-content" />
          </Field>
          <Field label={t(isRTL, 'الطابق', 'Floor')}>
            <Input value={form.floor_number ?? ''} onChange={e => set('floor_number', e.target.value)} dir="ltr" />
          </Field>
          <Field label={t(isRTL, 'الوحدة', 'Unit')}>
            <Input value={form.unit_number ?? ''} onChange={e => set('unit_number', e.target.value)} dir="ltr" />
          </Field>
        </div>
      </TabsContent>

      {/* Social */}
      <TabsContent value="social" className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t(isRTL,
            'حسابات السوشال ميديا الخاصة بهذا الفرع. تتجاوز حسابات الكيان الافتراضية عند الظهور في صفحة الفرع.',
            'Branch-specific social accounts. These override the business defaults on the branch page.')}
        </p>
        <div className={grid2}>
          <Field label="Instagram" icon={<Instagram className="w-3.5 h-3.5" />}>
            <Input value={form.social_instagram ?? ''} onChange={e => set('social_instagram', e.target.value)} dir="ltr" />
          </Field>
          <Field label="X (Twitter)">
            <Input value={form.social_x ?? ''} onChange={e => set('social_x', e.target.value)} dir="ltr" />
          </Field>
          <Field label="TikTok">
            <Input value={form.social_tiktok ?? ''} onChange={e => set('social_tiktok', e.target.value)} dir="ltr" />
          </Field>
          <Field label="LinkedIn" icon={<Linkedin className="w-3.5 h-3.5" />}>
            <Input value={form.social_linkedin ?? ''} onChange={e => set('social_linkedin', e.target.value)} dir="ltr" />
          </Field>
          <Field label="Facebook" icon={<Facebook className="w-3.5 h-3.5" />}>
            <Input value={form.social_facebook ?? ''} onChange={e => set('social_facebook', e.target.value)} dir="ltr" />
          </Field>
          <Field label="Snapchat">
            <Input value={form.social_snapchat ?? ''} onChange={e => set('social_snapchat', e.target.value)} dir="ltr" />
          </Field>
          <Field label="YouTube" icon={<Youtube className="w-3.5 h-3.5" />}>
            <Input value={form.social_youtube ?? ''} onChange={e => set('social_youtube', e.target.value)} dir="ltr" />
          </Field>
        </div>
      </TabsContent>

      {/* Catalog */}
      <TabsContent value="catalog" className="space-y-6">
        <div className={sectionCls}>
          <h3 className="font-semibold flex items-center gap-2"><Boxes className="w-4 h-4" />{t(isRTL, 'المنتجات والخدمات', 'Products & Services')}</h3>
          <p className="text-xs text-muted-foreground">
            {t(isRTL,
              'حدد المنتجات المتاحة في هذا الفرع. إن لم تحدد شيئاً، تظهر جميع منتجات المنشأة افتراضياً.',
              'Select services available at this branch. If none selected, all business services show by default.')}
          </p>
          {(services?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t(isRTL, 'لا توجد منتجات في كتالوج المنشأة بعد.', 'No services in business catalog yet.')}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
              {services.map(s => {
                const checked = linkedServiceIds?.has(s.id) ?? false;
                return (
                  <label key={s.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/40 hover:bg-muted/30 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={e => toggleService(s.id, e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm flex-1 truncate" dir="auto">{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</span>
                    {!s.is_active && <Badge variant="outline" className="text-xs">{t(isRTL, 'معطّل', 'Off')}</Badge>}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className={sectionCls}>
          <h3 className="font-semibold flex items-center gap-2"><Tag className="w-4 h-4" />{t(isRTL, 'العروض', 'Offers')}</h3>
          <p className="text-xs text-muted-foreground">
            {t(isRTL,
              'العروض المرتبطة بهذا الفرع تحديداً. الفرع الذي لا يحدد عروضاً سيعرض جميع عروض الكيان.',
              'Offers tied specifically to this branch. Branches without selections show all business offers.')}
          </p>
          {(promotions?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t(isRTL, 'لا توجد عروض في كتالوج المنشأة بعد.', 'No offers in business catalog yet.')}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
              {promotions.map(p => {
                const checked = linkedPromotionIds?.has(p.id) ?? false;
                return (
                  <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/40 hover:bg-muted/30 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={e => togglePromotion(p.id, e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm flex-1 truncate" dir="auto">{isRTL ? p.title_ar : (p.title_en || p.title_ar)}</span>
                    {!p.is_active && <Badge variant="outline" className="text-xs">{t(isRTL, 'معطّل', 'Off')}</Badge>}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </TabsContent>

      {/* Save bar */}
      <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-border/60">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {branch.slug && businessUsername && (
            <Link
              to={`/${businessUsername}/${branch.slug}`}
              target="_blank"
              rel="noopener"
              className="hover:text-primary inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {t(isRTL, 'فتح صفحة الفرع', 'Open branch page')}
            </Link>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t(isRTL, 'حفظ التعديلات', 'Save changes')}
        </Button>
      </div>
    </Tabs>
  );
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Field shell                                                          */
/* ────────────────────────────────────────────────────────────────────── */

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <Label className={`${labelCls} flex items-center gap-1.5`}>{icon}{label}</Label>
    {children}
  </div>
);