import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Award as AwardIcon, ShieldCheck, Plus, Save, Trash2, X, ExternalLink,
  Loader2, Trophy, Pencil, ChevronUp, ChevronDown,
} from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerBusiness } from '@/modules/businesses';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Database } from '@/integrations/supabase/types';

type CertRow = Database['public']['Tables']['business_certifications']['Row'];
type AwardRow = Database['public']['Tables']['business_awards']['Row'];
type AwardRank = NonNullable<AwardRow['rank']>;

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

/* ─── Empty forms ─── */
const emptyCert = {
  name_ar: '', name_en: '', issuer_ar: '', issuer_en: '',
  credential_number: '', credential_url: '', logo_url: '',
  proof_document_url: '', issued_at: '', expires_at: '',
  is_active: true,
};
type CertForm = typeof emptyCert;

const emptyAward = {
  title_ar: '', title_en: '', issuer_ar: '', issuer_en: '',
  description_ar: '', description_en: '',
  awarded_year: new Date().getFullYear(),
  rank: '' as AwardRank | '',
  category_ar: '', category_en: '',
  image_url: '', proof_url: '',
  is_active: true,
};
type AwardForm = typeof emptyAward;

const RANK_OPTIONS: Array<{ value: AwardRank; ar: string; en: string }> = [
  { value: 'winner', ar: 'الفائز', en: 'Winner' },
  { value: 'runner_up', ar: 'الوصيف', en: 'Runner-up' },
  { value: 'third_place', ar: 'المركز الثالث', en: 'Third place' },
  { value: 'finalist', ar: 'مرشّح نهائي', en: 'Finalist' },
  { value: 'honorable_mention', ar: 'تقدير', en: 'Honorable mention' },
];

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
const DashboardCredentials: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  /* business id */
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await getOwnerBusiness<{ id: string }>({
        userId: user.id, select: 'id',
      });
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
  const businessId = business?.id;

  /* tab + edit state */
  const [tab, setTab] = useState<'certs' | 'awards'>('certs');

  /* ───── Certifications ───── */
  const { data: certs = [], isLoading: certsLoading } = useQuery({
    queryKey: ['dashboard-certifications', businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<CertRow[]> => {
      const { data } = await supabase
        .from('business_certifications')
        .select('*')
        .eq('business_id', businessId!)
        .order('display_order', { ascending: true })
        .order('issued_at', { ascending: false, nullsFirst: false });
      return (data ?? []) as CertRow[];
    },
  });

  const [showCertForm, setShowCertForm] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [certForm, setCertForm] = useState<CertForm>(emptyCert);

  const openCertNew = () => {
    setEditingCertId(null);
    setCertForm(emptyCert);
    setShowCertForm(true);
  };
  const openCertEdit = (c: CertRow) => {
    setEditingCertId(c.id);
    setCertForm({
      name_ar: c.name_ar ?? '', name_en: c.name_en ?? '',
      issuer_ar: c.issuer_ar ?? '', issuer_en: c.issuer_en ?? '',
      credential_number: c.credential_number ?? '',
      credential_url: c.credential_url ?? '',
      logo_url: c.logo_url ?? '',
      proof_document_url: c.proof_document_url ?? '',
      issued_at: c.issued_at ?? '',
      expires_at: c.expires_at ?? '',
      is_active: c.is_active,
    });
    setShowCertForm(true);
  };

  const saveCertMut = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business');
      if (!certForm.name_ar.trim() || !certForm.issuer_ar.trim()) {
        throw new Error(t(isRTL, 'الاسم وجهة الإصدار مطلوبان', 'Name and issuer are required'));
      }
      const payload = {
        business_id: businessId,
        name_ar: certForm.name_ar.trim(),
        name_en: certForm.name_en.trim() || null,
        issuer_ar: certForm.issuer_ar.trim(),
        issuer_en: certForm.issuer_en.trim() || null,
        credential_number: certForm.credential_number.trim() || null,
        credential_url: certForm.credential_url.trim() || null,
        logo_url: certForm.logo_url.trim() || null,
        proof_document_url: certForm.proof_document_url.trim() || null,
        issued_at: certForm.issued_at || null,
        expires_at: certForm.expires_at || null,
        is_active: certForm.is_active,
      };
      if (editingCertId) {
        const { error } = await supabase
          .from('business_certifications').update(payload).eq('id', editingCertId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_certifications').insert({ ...payload, display_order: certs.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t(isRTL, 'تم الحفظ', 'Saved'));
      qc.invalidateQueries({ queryKey: ['dashboard-certifications', businessId] });
      qc.invalidateQueries({ queryKey: ['business-certifications'] });
      setShowCertForm(false);
      setEditingCertId(null);
      setCertForm(emptyCert);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : t(isRTL, 'تعذّر الحفظ', 'Save failed'));
    },
  });

  const deleteCertMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_certifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t(isRTL, 'تم الحذف', 'Deleted'));
      qc.invalidateQueries({ queryKey: ['dashboard-certifications', businessId] });
      qc.invalidateQueries({ queryKey: ['business-certifications'] });
    },
    onError: () => toast.error(t(isRTL, 'تعذّر الحذف', 'Delete failed')),
  });

  const reorderCert = async (id: string, dir: -1 | 1) => {
    const idx = certs.findIndex((c) => c.id === id);
    const swap = certs[idx + dir];
    if (!swap) return;
    await supabase
      .from('business_certifications')
      .update({ display_order: swap.display_order })
      .eq('id', id);
    await supabase
      .from('business_certifications')
      .update({ display_order: certs[idx].display_order })
      .eq('id', swap.id);
    qc.invalidateQueries({ queryKey: ['dashboard-certifications', businessId] });
  };

  /* ───── Awards ───── */
  const { data: awards = [], isLoading: awardsLoading } = useQuery({
    queryKey: ['dashboard-awards', businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<AwardRow[]> => {
      const { data } = await supabase
        .from('business_awards')
        .select('*')
        .eq('business_id', businessId!)
        .order('awarded_year', { ascending: false })
        .order('display_order', { ascending: true });
      return (data ?? []) as AwardRow[];
    },
  });

  const [showAwardForm, setShowAwardForm] = useState(false);
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [awardForm, setAwardForm] = useState<AwardForm>(emptyAward);

  const openAwardNew = () => {
    setEditingAwardId(null);
    setAwardForm(emptyAward);
    setShowAwardForm(true);
  };
  const openAwardEdit = (a: AwardRow) => {
    setEditingAwardId(a.id);
    setAwardForm({
      title_ar: a.title_ar ?? '', title_en: a.title_en ?? '',
      issuer_ar: a.issuer_ar ?? '', issuer_en: a.issuer_en ?? '',
      description_ar: a.description_ar ?? '', description_en: a.description_en ?? '',
      awarded_year: a.awarded_year,
      rank: (a.rank ?? '') as AwardRank | '',
      category_ar: a.category_ar ?? '', category_en: a.category_en ?? '',
      image_url: a.image_url ?? '', proof_url: a.proof_url ?? '',
      is_active: a.is_active,
    });
    setShowAwardForm(true);
  };

  const saveAwardMut = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business');
      if (!awardForm.title_ar.trim() || !awardForm.issuer_ar.trim()) {
        throw new Error(t(isRTL, 'العنوان وجهة الإصدار مطلوبان', 'Title and issuer are required'));
      }
      const year = Number(awardForm.awarded_year);
      if (!Number.isFinite(year) || year < 1900 || year > 2200) {
        throw new Error(t(isRTL, 'سنة الجائزة غير صحيحة', 'Invalid award year'));
      }
      const payload = {
        business_id: businessId,
        title_ar: awardForm.title_ar.trim(),
        title_en: awardForm.title_en.trim() || null,
        issuer_ar: awardForm.issuer_ar.trim(),
        issuer_en: awardForm.issuer_en.trim() || null,
        description_ar: awardForm.description_ar.trim() || null,
        description_en: awardForm.description_en.trim() || null,
        awarded_year: year,
        rank: (awardForm.rank || null) as AwardRank | null,
        category_ar: awardForm.category_ar.trim() || null,
        category_en: awardForm.category_en.trim() || null,
        image_url: awardForm.image_url.trim() || null,
        proof_url: awardForm.proof_url.trim() || null,
        is_active: awardForm.is_active,
      };
      if (editingAwardId) {
        const { error } = await supabase
          .from('business_awards').update(payload).eq('id', editingAwardId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_awards').insert({ ...payload, display_order: awards.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t(isRTL, 'تم الحفظ', 'Saved'));
      qc.invalidateQueries({ queryKey: ['dashboard-awards', businessId] });
      qc.invalidateQueries({ queryKey: ['business-awards'] });
      setShowAwardForm(false);
      setEditingAwardId(null);
      setAwardForm(emptyAward);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : t(isRTL, 'تعذّر الحفظ', 'Save failed'));
    },
  });

  const deleteAwardMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_awards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t(isRTL, 'تم الحذف', 'Deleted'));
      qc.invalidateQueries({ queryKey: ['dashboard-awards', businessId] });
      qc.invalidateQueries({ queryKey: ['business-awards'] });
    },
    onError: () => toast.error(t(isRTL, 'تعذّر الحذف', 'Delete failed')),
  });

  /* ─── Stats for header KPI ─── */
  const kpis = useMemo(() => ({
    totalCerts: certs.length,
    verifiedCerts: certs.filter((c) => c.verified_by_admin).length,
    totalAwards: awards.length,
    verifiedAwards: awards.filter((a) => a.verified_by_admin).length,
  }), [certs, awards]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={ShieldCheck}
          tone="success"
          title={t(isRTL, 'الشهادات والجوائز', 'Credentials & Awards')}
          subtitle={t(
            isRTL,
            'أضف الشهادات والاعتمادات والجوائز لتعزيز مصداقية منشأتك.',
            'Add certifications and awards to boost your business credibility.',
          )}
          kpiSlot={
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <KpiPill label={t(isRTL, 'شهادات', 'Certifications')} value={kpis.totalCerts} icon={ShieldCheck} />
              <KpiPill label={t(isRTL, 'موثّقة', 'Verified')} value={kpis.verifiedCerts} icon={ShieldCheck} tone="success" />
              <KpiPill label={t(isRTL, 'جوائز', 'Awards')} value={kpis.totalAwards} icon={Trophy} />
              <KpiPill label={t(isRTL, 'موثّقة', 'Verified')} value={kpis.verifiedAwards} icon={ShieldCheck} tone="success" />
            </div>
          }
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'certs' | 'awards')}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="certs" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              {t(isRTL, 'الشهادات', 'Certifications')}
              <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-[10px]">{certs.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="awards" className="gap-2">
              <AwardIcon className="h-4 w-4" />
              {t(isRTL, 'الجوائز', 'Awards')}
              <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-[10px]">{awards.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* CERTIFICATIONS */}
          <TabsContent value="certs" className="space-y-4 pt-4">
            <div className="flex justify-end">
              <Button onClick={openCertNew} disabled={showCertForm}>
                <Plus className="h-4 w-4 me-1" />
                {t(isRTL, 'إضافة شهادة', 'Add certification')}
              </Button>
            </div>

            {showCertForm && (
              <Card className="border-accent/40">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">
                      {editingCertId
                        ? t(isRTL, 'تعديل شهادة', 'Edit certification')
                        : t(isRTL, 'شهادة جديدة', 'New certification')}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => { setShowCertForm(false); setEditingCertId(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label={t(isRTL, 'الاسم (عربي) *', 'Name (Arabic) *')}>
                      <Input dir="auto" value={certForm.name_ar}
                        onChange={(e) => setCertForm({ ...certForm, name_ar: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'الاسم (إنجليزي)', 'Name (English)')}>
                      <Input dir="auto" value={certForm.name_en}
                        onChange={(e) => setCertForm({ ...certForm, name_en: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'جهة الإصدار (عربي) *', 'Issuer (Arabic) *')}>
                      <Input dir="auto" value={certForm.issuer_ar}
                        onChange={(e) => setCertForm({ ...certForm, issuer_ar: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'جهة الإصدار (إنجليزي)', 'Issuer (English)')}>
                      <Input dir="auto" value={certForm.issuer_en}
                        onChange={(e) => setCertForm({ ...certForm, issuer_en: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'رقم الشهادة', 'Credential number')}>
                      <Input className="tech-content" value={certForm.credential_number}
                        onChange={(e) => setCertForm({ ...certForm, credential_number: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'رابط التحقق', 'Verification URL')}>
                      <Input type="url" className="tech-content" value={certForm.credential_url}
                        onChange={(e) => setCertForm({ ...certForm, credential_url: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'تاريخ الإصدار', 'Issued at')}>
                      <Input type="date" className="tech-content" value={certForm.issued_at}
                        onChange={(e) => setCertForm({ ...certForm, issued_at: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'تاريخ الانتهاء', 'Expires at')}>
                      <Input type="date" className="tech-content" value={certForm.expires_at}
                        onChange={(e) => setCertForm({ ...certForm, expires_at: e.target.value })} />
                    </Field>
                  </div>

                  <Field label={t(isRTL, 'شعار جهة الإصدار', 'Issuer logo')}>
                    <ImageUpload
                      bucket="business-assets"
                      folder={`credentials/${businessId}`}
                      value={certForm.logo_url}
                      onChange={(url) => setCertForm({ ...certForm, logo_url: url })}
                      onRemove={() => setCertForm({ ...certForm, logo_url: '' })}
                      compact
                      aspectRatio="square"
                      placeholder={t(isRTL, 'اضغط لرفع الشعار', 'Click to upload logo')}
                    />
                  </Field>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={certForm.is_active}
                        onCheckedChange={(v) => setCertForm({ ...certForm, is_active: v })} />
                      {t(isRTL, 'مفعّلة وظاهرة في الملف', 'Active & visible on profile')}
                    </label>
                    <Button onClick={() => saveCertMut.mutate()} disabled={saveCertMut.isPending}>
                      {saveCertMut.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin me-1" />
                        : <Save className="h-4 w-4 me-1" />}
                      {t(isRTL, 'حفظ', 'Save')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {certsLoading ? (
              <ListSkeleton />
            ) : certs.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title={t(isRTL, 'لا توجد شهادات بعد', 'No certifications yet')}
                subtitle={t(isRTL, 'أضف أول شهادة لإظهار اعتمادات منشأتك على ملفك العام.',
                  'Add your first certification to display credentials on your public profile.')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {certs.map((c, i) => (
                  <CertCard
                    key={c.id} cert={c} isRTL={isRTL}
                    canUp={i > 0} canDown={i < certs.length - 1}
                    onMoveUp={() => reorderCert(c.id, -1)}
                    onMoveDown={() => reorderCert(c.id, 1)}
                    onEdit={() => openCertEdit(c)}
                    onDelete={() => {
                      if (window.confirm(t(isRTL, 'حذف هذه الشهادة؟', 'Delete this certification?'))) {
                        deleteCertMut.mutate(c.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* AWARDS */}
          <TabsContent value="awards" className="space-y-4 pt-4">
            <div className="flex justify-end">
              <Button onClick={openAwardNew} disabled={showAwardForm}>
                <Plus className="h-4 w-4 me-1" />
                {t(isRTL, 'إضافة جائزة', 'Add award')}
              </Button>
            </div>

            {showAwardForm && (
              <Card className="border-accent/40">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">
                      {editingAwardId
                        ? t(isRTL, 'تعديل جائزة', 'Edit award')
                        : t(isRTL, 'جائزة جديدة', 'New award')}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => { setShowAwardForm(false); setEditingAwardId(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label={t(isRTL, 'العنوان (عربي) *', 'Title (Arabic) *')}>
                      <Input dir="auto" value={awardForm.title_ar}
                        onChange={(e) => setAwardForm({ ...awardForm, title_ar: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'العنوان (إنجليزي)', 'Title (English)')}>
                      <Input dir="auto" value={awardForm.title_en}
                        onChange={(e) => setAwardForm({ ...awardForm, title_en: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'جهة الإصدار (عربي) *', 'Issuer (Arabic) *')}>
                      <Input dir="auto" value={awardForm.issuer_ar}
                        onChange={(e) => setAwardForm({ ...awardForm, issuer_ar: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'جهة الإصدار (إنجليزي)', 'Issuer (English)')}>
                      <Input dir="auto" value={awardForm.issuer_en}
                        onChange={(e) => setAwardForm({ ...awardForm, issuer_en: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'السنة *', 'Year *')}>
                      <Input type="number" min={1900} max={2200} className="tech-content"
                        value={awardForm.awarded_year}
                        onChange={(e) => setAwardForm({ ...awardForm, awarded_year: parseInt(e.target.value, 10) || 0 })} />
                    </Field>
                    <Field label={t(isRTL, 'المرتبة', 'Rank')}>
                      <Select
                        value={awardForm.rank || 'none'}
                        onValueChange={(v) => setAwardForm({ ...awardForm, rank: v === 'none' ? '' : (v as AwardRank) })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t(isRTL, 'بدون', 'None')}</SelectItem>
                          {RANK_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{t(isRTL, r.ar, r.en)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={t(isRTL, 'الفئة (عربي)', 'Category (Arabic)')}>
                      <Input dir="auto" value={awardForm.category_ar}
                        onChange={(e) => setAwardForm({ ...awardForm, category_ar: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'الفئة (إنجليزي)', 'Category (English)')}>
                      <Input dir="auto" value={awardForm.category_en}
                        onChange={(e) => setAwardForm({ ...awardForm, category_en: e.target.value })} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label={t(isRTL, 'الوصف (عربي)', 'Description (Arabic)')}>
                      <Textarea dir="auto" rows={2} value={awardForm.description_ar}
                        onChange={(e) => setAwardForm({ ...awardForm, description_ar: e.target.value })} />
                    </Field>
                    <Field label={t(isRTL, 'الوصف (إنجليزي)', 'Description (English)')}>
                      <Textarea dir="auto" rows={2} value={awardForm.description_en}
                        onChange={(e) => setAwardForm({ ...awardForm, description_en: e.target.value })} />
                    </Field>
                  </div>

                  <Field label={t(isRTL, 'صورة الجائزة', 'Award image')}>
                    <ImageUpload
                      bucket="business-assets"
                      folder={`awards/${businessId}`}
                      value={awardForm.image_url}
                      onChange={(url) => setAwardForm({ ...awardForm, image_url: url })}
                      onRemove={() => setAwardForm({ ...awardForm, image_url: '' })}
                      compact
                      placeholder={t(isRTL, 'اضغط لرفع الصورة', 'Click to upload image')}
                    />
                  </Field>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={awardForm.is_active}
                        onCheckedChange={(v) => setAwardForm({ ...awardForm, is_active: v })} />
                      {t(isRTL, 'مفعّلة وظاهرة في الملف', 'Active & visible on profile')}
                    </label>
                    <Button onClick={() => saveAwardMut.mutate()} disabled={saveAwardMut.isPending}>
                      {saveAwardMut.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin me-1" />
                        : <Save className="h-4 w-4 me-1" />}
                      {t(isRTL, 'حفظ', 'Save')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {awardsLoading ? (
              <ListSkeleton />
            ) : awards.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title={t(isRTL, 'لا توجد جوائز بعد', 'No awards yet')}
                subtitle={t(isRTL, 'أضف الجوائز والتكريمات لتعزيز مكانة منشأتك.',
                  'Add awards and recognitions to elevate your business standing.')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {awards.map((a) => (
                  <AwardCardItem
                    key={a.id} award={a} isRTL={isRTL}
                    onEdit={() => openAwardEdit(a)}
                    onDelete={() => {
                      if (window.confirm(t(isRTL, 'حذف هذه الجائزة؟', 'Delete this award?'))) {
                        deleteAwardMut.mutate(a.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

/* ═════════════════ Helper sub-components ═════════════════ */

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium">{label}</Label>
    {children}
  </div>
);

const KpiPill: React.FC<{ label: string; value: number; icon: React.ElementType; tone?: 'success' }> = ({
  label, value, icon: Icon, tone,
}) => (
  <div className="flex items-center gap-2 rounded-lg border bg-card/60 px-2.5 py-1.5">
    <Icon className={`h-3.5 w-3.5 ${tone === 'success' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
    <span className="text-muted-foreground">{label}</span>
    <span className="ms-auto font-bold tech-content">{value}</span>
  </div>
);

const ListSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
    ))}
  </div>
);

const EmptyState: React.FC<{ icon: React.ElementType; title: string; subtitle: string }> = ({
  icon: Icon, title, subtitle,
}) => (
  <Card>
    <CardContent className="py-12 text-center space-y-2">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground/40" />
      <h3 className="font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </CardContent>
  </Card>
);

interface CertCardProps {
  cert: CertRow; isRTL: boolean;
  canUp: boolean; canDown: boolean;
  onMoveUp: () => void; onMoveDown: () => void;
  onEdit: () => void; onDelete: () => void;
}
const CertCard: React.FC<CertCardProps> = ({ cert, isRTL, canUp, canDown, onMoveUp, onMoveDown, onEdit, onDelete }) => {
  const name = isRTL ? (cert.name_ar || cert.name_en) : (cert.name_en || cert.name_ar);
  const issuer = isRTL ? (cert.issuer_ar || cert.issuer_en) : (cert.issuer_en || cert.issuer_ar);
  const expired = !!cert.expires_at && new Date(cert.expires_at).getTime() < Date.now();
  return (
    <Card className="hover-lift">
      <CardContent className="p-4 flex gap-3">
        {cert.logo_url ? (
          <img src={cert.logo_url} alt={issuer ?? ''} loading="lazy"
            className="h-12 w-12 shrink-0 rounded-lg object-contain bg-white p-1 border" />
        ) : (
          <div className="h-12 w-12 shrink-0 grid place-items-center rounded-lg bg-accent/10 text-accent">
            <ShieldCheck className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start gap-1.5">
            <p className="font-semibold text-sm line-clamp-1">{name}</p>
            {cert.verified_by_admin && (
              <Badge variant="secondary" className="h-4 text-[9px] gap-0.5">
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                {isRTL ? 'موثّقة' : 'Verified'}
              </Badge>
            )}
            {!cert.is_active && (
              <Badge variant="outline" className="h-4 text-[9px]">{isRTL ? 'غير مفعّلة' : 'Hidden'}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{issuer}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            {cert.credential_number && (
              <span className="tech-content rounded bg-muted px-1.5 py-0.5">#{cert.credential_number}</span>
            )}
            {cert.issued_at && (
              <span className="tech-content">{new Date(cert.issued_at).getFullYear()}</span>
            )}
            {expired && (
              <Badge variant="destructive" className="h-3.5 text-[9px] px-1">{isRTL ? 'منتهية' : 'Expired'}</Badge>
            )}
            {cert.credential_url && (
              <a href={cert.credential_url} target="_blank" rel="noopener noreferrer nofollow"
                className="text-primary hover:underline inline-flex items-center gap-0.5">
                <ExternalLink className="h-2.5 w-2.5" />
                {isRTL ? 'تحقّق' : 'Verify'}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!canUp} onClick={onMoveUp}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!canDown} onClick={onMoveDown}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface AwardCardItemProps {
  award: AwardRow; isRTL: boolean;
  onEdit: () => void; onDelete: () => void;
}
const AwardCardItem: React.FC<AwardCardItemProps> = ({ award, isRTL, onEdit, onDelete }) => {
  const title = isRTL ? (award.title_ar || award.title_en) : (award.title_en || award.title_ar);
  const issuer = isRTL ? (award.issuer_ar || award.issuer_en) : (award.issuer_en || award.issuer_ar);
  const rankLabel = award.rank ? RANK_OPTIONS.find((r) => r.value === award.rank) : null;
  return (
    <Card className="hover-lift">
      <CardContent className="p-4 flex gap-3">
        {award.image_url ? (
          <img src={award.image_url} alt={title ?? ''} loading="lazy"
            className="h-12 w-12 shrink-0 rounded-lg object-cover border" />
        ) : (
          <div className="h-12 w-12 shrink-0 grid place-items-center rounded-lg bg-amber-500/10 text-amber-500">
            <Trophy className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start gap-1.5">
            <p className="font-semibold text-sm line-clamp-1">{title}</p>
            {award.verified_by_admin && (
              <Badge variant="secondary" className="h-4 text-[9px] gap-0.5">
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                {isRTL ? 'موثّقة' : 'Verified'}
              </Badge>
            )}
            {!award.is_active && (
              <Badge variant="outline" className="h-4 text-[9px]">{isRTL ? 'غير مفعّلة' : 'Hidden'}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{issuer}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="tech-content rounded bg-muted px-1.5 py-0.5">{award.awarded_year}</span>
            {rankLabel && (
              <Badge variant="outline" className="h-3.5 text-[9px] px-1">
                {t(isRTL, rankLabel.ar, rankLabel.en)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCredentials;