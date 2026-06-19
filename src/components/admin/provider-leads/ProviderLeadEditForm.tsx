/**
 * Inline editor for ALL provider lead fields. Renders directly inside
 * the detail panel (no popups). Uses `updateProviderLeadFields` against
 * the admin-RLS-protected table.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, X, Plus, Trash2, Building2, MapPin, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { LocationPicker } from '@/components/dashboard/business-edit/LocationPicker';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  updateProviderLeadFields,
  listProviderLeadBranches,
  upsertProviderLeadBranch,
  deleteProviderLeadBranch,
  type ProviderLeadEditableFields,
  type ProviderLeadRow,
  type ProviderLeadBranchRow,
} from '@/modules/providers';

interface Props {
  lead: ProviderLeadRow;
  onCancel: () => void;
  onSaved: () => void;
}

type FormState = {
  name_ar: string;
  name_en: string;
  contact_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  preferred_channel: 'phone' | 'whatsapp' | 'email';
  website: string;
  cr_number: string;
  unified_number: string;
  vat_number: string;
  main_activity: string;
  specialties: string;
  brands: string;
  brief: string;
  map_link: string;
  national_address: string;
  short_national_address: string;
  full_address: string;
  region: string;
  city: string;
  district: string;
  street_name: string;
  building_number: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  establishment_year: string;
  account_manager_name: string;
  account_manager_phone: string;
  account_manager_email: string;
  branches_count: string;
};

const toForm = (l: ProviderLeadRow): FormState => ({
  name_ar: l.name_ar ?? '',
  name_en: l.name_en ?? '',
  contact_name: l.contact_name ?? '',
  email: l.email ?? '',
  phone: l.phone ?? '',
  whatsapp: (l as unknown as { whatsapp?: string | null }).whatsapp ?? '',
  preferred_channel: l.preferred_channel,
  website: l.website ?? '',
  cr_number: l.cr_number ?? '',
  unified_number: l.unified_number ?? '',
  vat_number: l.vat_number ?? '',
  main_activity: l.main_activity ?? '',
  specialties: (l.specialties ?? []).join(', '),
  brands: (l.brands ?? []).join(', '),
  brief: l.brief ?? '',
  map_link: l.map_link ?? '',
  national_address: l.national_address ?? '',
  short_national_address:
    (l as unknown as { short_national_address?: string | null }).short_national_address ?? '',
  full_address: (l as unknown as { full_address?: string | null }).full_address ?? '',
  region: (l as unknown as { region?: string | null }).region ?? '',
  city: l.city ?? '',
  district: (l as unknown as { district?: string | null }).district ?? '',
  street_name: (l as unknown as { street_name?: string | null }).street_name ?? '',
  building_number: (l as unknown as { building_number?: string | null }).building_number ?? '',
  postal_code: (l as unknown as { postal_code?: string | null }).postal_code ?? '',
  latitude:
    (l as unknown as { latitude?: number | null }).latitude != null
      ? String((l as unknown as { latitude?: number | null }).latitude)
      : '',
  longitude:
    (l as unknown as { longitude?: number | null }).longitude != null
      ? String((l as unknown as { longitude?: number | null }).longitude)
      : '',
  establishment_year:
    (l as unknown as { establishment_year?: number | null }).establishment_year != null
      ? String((l as unknown as { establishment_year?: number | null }).establishment_year)
      : '',
  account_manager_name:
    (l as unknown as { account_manager_name?: string | null }).account_manager_name ?? '',
  account_manager_phone:
    (l as unknown as { account_manager_phone?: string | null }).account_manager_phone ?? '',
  account_manager_email:
    (l as unknown as { account_manager_email?: string | null }).account_manager_email ?? '',
  branches_count: String(l.branches_count ?? 1),
});

const splitList = (v: string): string[] =>
  v
    .split(/[,،\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const toNullable = (v: string): string | null => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const toNullableNumber = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export const ProviderLeadEditForm: React.FC<Props> = ({ lead, onCancel, onSaved }) => {
  const { isRTL } = useLanguage();
  const [f, setF] = useState<FormState>(() => toForm(lead));
  const [initialSnapshot] = useState<string>(() => JSON.stringify(toForm(lead)));
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<ProviderLeadBranchRow[]>([]);
  const [initialBranchesSnapshot, setInitialBranchesSnapshot] = useState<string>('[]');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    listProviderLeadBranches(lead.id).then((r) => {
      const rows = (r.rows as ProviderLeadBranchRow[]) ?? [];
      setBranches(rows);
      setInitialBranchesSnapshot(JSON.stringify(rows));
    });
  }, [lead.id]);

  const isDirty = useMemo(
    () =>
      JSON.stringify(f) !== initialSnapshot ||
      JSON.stringify(branches) !== initialBranchesSnapshot,
    [f, branches, initialSnapshot, initialBranchesSnapshot],
  );

  // Browser-level guard against accidental tab close while editing.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const handleCancel = () => {
    if (isDirty && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    onCancel();
  };

  const copyHeadToBranch = (idx: number) => {
    setBranch(idx, {
      region: f.region || null,
      city: f.city || null,
      district: f.district || null,
      street_name: f.street_name || null,
      building_number: f.building_number || null,
      postal_code: f.postal_code || null,
      short_national_address: f.short_national_address || null,
      national_address: f.national_address || null,
      address: f.full_address || null,
      map_link: f.map_link || null,
      phone: f.phone || null,
      whatsapp: f.whatsapp || null,
      email: f.email || null,
      website: f.website || null,
      latitude: f.latitude ? Number(f.latitude) : null,
      longitude: f.longitude ? Number(f.longitude) : null,
    });
    toast.success('تم النسخ من المقر الرئيسي');
  };

  const setBranch = (idx: number, patch: Partial<ProviderLeadBranchRow>) =>
    setBranches((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));

  const addBranch = () =>
    setBranches((prev) => [
      ...prev,
      {
        id: '',
        lead_id: lead.id,
        branch_name: `فرع ${prev.length + 1}`,
        city: null,
        address: null,
        map_link: null,
        phone: null,
        whatsapp: null,
        email: null,
        website: null,
        region: null,
        district: null,
        street_name: null,
        building_number: null,
        postal_code: null,
        short_national_address: null,
        national_address: null,
        latitude: null,
        longitude: null,
        is_main: prev.length === 0,
      },
    ]);

  const removeBranch = async (idx: number) => {
    const b = branches[idx];
    if (b.id) {
      const { error } = await deleteProviderLeadBranch(b.id);
      if (error) {
        toast.error('تعذر حذف الفرع: ' + error.message);
        return;
      }
    }
    setBranches((prev) => prev.filter((_, i) => i !== idx));
    toast.success('تم حذف الفرع');
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    // Required validations
    if (!f.name_ar.trim() || f.name_ar.trim().length < 2) {
      toast.error('الاسم بالعربية مطلوب (٢ أحرف فأكثر)');
      return;
    }
    if (!f.contact_name.trim()) {
      toast.error('اسم المسؤول مطلوب');
      return;
    }
    if (!/^.+@.+\..+$/.test(f.email.trim())) {
      toast.error('صيغة البريد غير صحيحة');
      return;
    }
    if (f.phone.trim().length < 7) {
      toast.error('رقم الجوال غير صحيح');
      return;
    }
    if (f.postal_code && !/^[1-9]\d{4}$/.test(f.postal_code.trim())) {
      toast.error('الرمز البريدي يجب أن يكون ٥ أرقام ولا يبدأ بصفر');
      return;
    }
    if (
      f.short_national_address &&
      !/^[A-Za-z]{4}\d{4}$/.test(f.short_national_address.trim())
    ) {
      toast.error('العنوان الوطني المختصر: ٤ أحرف + ٤ أرقام');
      return;
    }
    const lat = toNullableNumber(f.latitude);
    const lng = toNullableNumber(f.longitude);
    if (f.latitude && (lat === null || lat < -90 || lat > 90)) {
      toast.error('خط العرض خارج النطاق (-90 إلى 90)');
      return;
    }
    if (f.longitude && (lng === null || lng < -180 || lng > 180)) {
      toast.error('خط الطول خارج النطاق (-180 إلى 180)');
      return;
    }

    const patch: ProviderLeadEditableFields = {
      name_ar: f.name_ar.trim(),
      name_en: toNullable(f.name_en),
      contact_name: f.contact_name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      whatsapp: toNullable(f.whatsapp),
      preferred_channel: f.preferred_channel,
      website: toNullable(f.website),
      cr_number: toNullable(f.cr_number),
      unified_number: toNullable(f.unified_number),
      vat_number: toNullable(f.vat_number),
      main_activity: toNullable(f.main_activity),
      specialties: splitList(f.specialties),
      brands: splitList(f.brands),
      brief: toNullable(f.brief),
      map_link: toNullable(f.map_link),
      national_address: toNullable(f.national_address),
      short_national_address: toNullable(f.short_national_address),
      full_address: toNullable(f.full_address),
      region: toNullable(f.region),
      city: toNullable(f.city),
      district: toNullable(f.district),
      street_name: toNullable(f.street_name),
      building_number: toNullable(f.building_number),
      postal_code: toNullable(f.postal_code),
      latitude: lat,
      longitude: lng,
      establishment_year: toNullableNumber(f.establishment_year),
      account_manager_name: toNullable(f.account_manager_name),
      account_manager_phone: toNullable(f.account_manager_phone),
      account_manager_email: toNullable(f.account_manager_email),
      branches_count: Math.max(1, Number(f.branches_count) || 1),
    };

    setSaving(true);
    const { error } = await updateProviderLeadFields(lead.id, patch);
    if (error) {
      setSaving(false);
      toast.error('تعذر حفظ التعديلات: ' + error.message);
      return;
    }
    // Save branches
    for (const b of branches) {
      if (!b.branch_name.trim()) continue;
      const { id, lead_id: _lid, ...rest } = b;
      const { error: bErr } = await upsertProviderLeadBranch(lead.id, id || null, {
        ...rest,
        branch_name: b.branch_name.trim(),
      });
      if (bErr) {
        setSaving(false);
        toast.error(`تعذر حفظ "${b.branch_name}": ${bErr.message}`);
        return;
      }
    }
    setSaving(false);
    toast.success('تم حفظ التعديلات');
    onSaved();
  };

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-3">
      <Section title="بيانات المنشأة">
        <Field label="الاسم بالعربية *">
          <Input value={f.name_ar} onChange={(e) => set('name_ar', e.target.value)} dir="auto" />
        </Field>
        <Field label="الاسم بالإنجليزية">
          <Input value={f.name_en} onChange={(e) => set('name_en', e.target.value)} dir="auto" />
        </Field>
        <Field label="النشاط">
          <Input value={f.main_activity} onChange={(e) => set('main_activity', e.target.value)} />
        </Field>
        <Field label="سنة التأسيس">
          <Input
            type="number"
            value={f.establishment_year}
            onChange={(e) => set('establishment_year', e.target.value)}
            className="tech-content"
          />
        </Field>
        <Field label="عدد الفروع">
          <Input
            type="number"
            min={1}
            value={f.branches_count}
            onChange={(e) => set('branches_count', e.target.value)}
            className="tech-content"
          />
        </Field>
      </Section>

      <Section title="التواصل">
        <Field label="اسم المسؤول *">
          <Input value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
        </Field>
        <Field label="البريد *">
          <Input
            value={f.email}
            onChange={(e) => set('email', e.target.value)}
            className="tech-content"
          />
        </Field>
        <Field label="الجوال *">
          <Input
            value={f.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="tech-content"
          />
        </Field>
        <Field label="واتساب">
          <Input
            value={f.whatsapp}
            onChange={(e) => set('whatsapp', e.target.value)}
            className="tech-content"
          />
        </Field>
        <Field label="القناة المفضلة">
          <select
            value={f.preferred_channel}
            onChange={(e) =>
              set('preferred_channel', e.target.value as FormState['preferred_channel'])
            }
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="phone">هاتف</option>
            <option value="whatsapp">واتساب</option>
            <option value="email">بريد</option>
          </select>
        </Field>
        <Field label="الموقع الإلكتروني">
          <Input
            value={f.website}
            onChange={(e) => set('website', e.target.value)}
            className="tech-content"
          />
        </Field>
      </Section>

      <Section title="السجلات">
        <Field label="السجل التجاري">
          <Input
            value={f.cr_number}
            onChange={(e) => set('cr_number', e.target.value)}
            className="tech-content"
          />
        </Field>
        <Field label="الرقم الموحد">
          <Input
            value={f.unified_number}
            onChange={(e) => set('unified_number', e.target.value)}
            className="tech-content"
          />
        </Field>
        <Field label="الرقم الضريبي">
          <Input
            value={f.vat_number}
            onChange={(e) => set('vat_number', e.target.value)}
            className="tech-content"
          />
        </Field>
      </Section>

      <Section title="العنوان">
        <Field label="المنطقة">
          <Input value={f.region} onChange={(e) => set('region', e.target.value)} />
        </Field>
        <Field label="المدينة">
          <Input value={f.city} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="الحي">
          <Input value={f.district} onChange={(e) => set('district', e.target.value)} />
        </Field>
        <Field label="اسم الشارع">
          <Input value={f.street_name} onChange={(e) => set('street_name', e.target.value)} />
        </Field>
        <Field label="رقم المبنى">
          <Input
            value={f.building_number}
            onChange={(e) => set('building_number', e.target.value)}
            className="tech-content"
          />
        </Field>
        <Field label="الرمز البريدي">
          <Input
            value={f.postal_code}
            onChange={(e) => set('postal_code', e.target.value)}
            className="tech-content"
            maxLength={5}
          />
        </Field>
        <Field label="العنوان الوطني المختصر">
          <Input
            value={f.short_national_address}
            onChange={(e) => set('short_national_address', e.target.value.toUpperCase())}
            className="tech-content"
            maxLength={8}
            placeholder="ABCD1234"
          />
        </Field>
        <Field label="العنوان الوطني الكامل">
          <Input
            value={f.national_address}
            onChange={(e) => set('national_address', e.target.value)}
          />
        </Field>
        <Field label="العنوان التفصيلي" full>
          <Textarea
            rows={2}
            value={f.full_address}
            onChange={(e) => set('full_address', e.target.value)}
          />
        </Field>
        <Field label="خط العرض">
          <Input
            value={f.latitude}
            onChange={(e) => set('latitude', e.target.value)}
            className="tech-content"
            inputMode="decimal"
          />
        </Field>
        <Field label="خط الطول">
          <Input
            value={f.longitude}
            onChange={(e) => set('longitude', e.target.value)}
            className="tech-content"
            inputMode="decimal"
          />
        </Field>
        <Field label="رابط الخريطة" full>
          <Input
            value={f.map_link}
            onChange={(e) => set('map_link', e.target.value)}
            className="tech-content"
          />
        </Field>
        <div className="sm:col-span-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMap((v) => !v)}
            className="h-8 rounded-lg text-[11px]"
          >
            <MapPin className="me-1 h-3.5 w-3.5" />
            {showMap ? 'إخفاء الخريطة' : 'تحديد عبر الخريطة وتعبئة العنوان تلقائيًا'}
          </Button>
          {showMap && (
            <div className="mt-2">
              <LocationPicker
                isRTL={isRTL}
                latitude={f.latitude ? Number(f.latitude) : null}
                longitude={f.longitude ? Number(f.longitude) : null}
                onChange={(lat, lng) => {
                  setF((p) => ({
                    ...p,
                    latitude: String(lat),
                    longitude: String(lng),
                    map_link: `https://maps.google.com/?q=${lat},${lng}`,
                  }));
                }}
                onAutofill={(d) => {
                  setF((p) => ({
                    ...p,
                    region: isRTL ? d.region_ar ?? p.region : d.region_en ?? p.region,
                    district: isRTL
                      ? d.district_ar ?? p.district
                      : d.district_en ?? p.district,
                    full_address: isRTL
                      ? d.address_ar ?? p.full_address
                      : d.address_en ?? p.full_address,
                  }));
                  toast.success('تم تعبئة بيانات العنوان من الخريطة');
                }}
              />
            </div>
          )}
        </div>
      </Section>

      <Section title="مدير الحساب">
        <Field label="الاسم">
          <Input
            value={f.account_manager_name}
            onChange={(e) => set('account_manager_name', e.target.value)}
          />
        </Field>
        <Field label="الجوال">
          <Input
            value={f.account_manager_phone}
            onChange={(e) => set('account_manager_phone', e.target.value)}
            className="tech-content"
          />
        </Field>
        <Field label="البريد">
          <Input
            value={f.account_manager_email}
            onChange={(e) => set('account_manager_email', e.target.value)}
            className="tech-content"
          />
        </Field>
      </Section>

      <Section title="التخصصات والعلامات">
        <Field label="التخصصات (مفصولة بفواصل)" full>
          <Input
            value={f.specialties}
            onChange={(e) => set('specialties', e.target.value)}
            placeholder="ألمنيوم، زجاج، حديد"
          />
        </Field>
        <Field label="العلامات التجارية (مفصولة بفواصل)" full>
          <Input
            value={f.brands}
            onChange={(e) => set('brands', e.target.value)}
          />
        </Field>
        <Field label="نبذة" full>
          <Textarea
            rows={3}
            value={f.brief}
            onChange={(e) => set('brief', e.target.value)}
            maxLength={2000}
          />
        </Field>
      </Section>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> الفروع ({branches.length})
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBranch}
            className="h-7 rounded-lg text-[11px]"
          >
            <Plus className="me-1 h-3.5 w-3.5" /> إضافة فرع
          </Button>
        </div>
        {branches.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
            لا توجد فروع — اضغط "إضافة فرع" للبدء
          </p>
        ) : (
          <div className="space-y-3">
            {branches.map((b, idx) => (
              <div key={b.id || `new-${idx}`} className="rounded-xl border bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold">
                    {b.is_main ? 'الفرع الرئيسي' : `فرع #${idx + 1}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyHeadToBranch(idx)}
                      className="h-7 rounded-lg text-[10px]"
                      title="نسخ بيانات المقر الرئيسي"
                    >
                      <Copy className="me-1 h-3 w-3" /> نسخ من المقر
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBranch(idx)}
                      className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="اسم الفرع *">
                    <Input
                      value={b.branch_name}
                      onChange={(e) => setBranch(idx, { branch_name: e.target.value })}
                    />
                  </Field>
                  <Field label="المنطقة">
                    <Input
                      value={b.region ?? ''}
                      onChange={(e) => setBranch(idx, { region: e.target.value || null })}
                    />
                  </Field>
                  <Field label="المدينة">
                    <Input
                      value={b.city ?? ''}
                      onChange={(e) => setBranch(idx, { city: e.target.value || null })}
                    />
                  </Field>
                  <Field label="الحي">
                    <Input
                      value={b.district ?? ''}
                      onChange={(e) => setBranch(idx, { district: e.target.value || null })}
                    />
                  </Field>
                  <Field label="الشارع">
                    <Input
                      value={b.street_name ?? ''}
                      onChange={(e) => setBranch(idx, { street_name: e.target.value || null })}
                    />
                  </Field>
                  <Field label="رقم المبنى">
                    <Input
                      value={b.building_number ?? ''}
                      onChange={(e) =>
                        setBranch(idx, { building_number: e.target.value || null })
                      }
                      className="tech-content"
                    />
                  </Field>
                  <Field label="الرمز البريدي">
                    <Input
                      value={b.postal_code ?? ''}
                      onChange={(e) => setBranch(idx, { postal_code: e.target.value || null })}
                      className="tech-content"
                      maxLength={5}
                    />
                  </Field>
                  <Field label="العنوان الوطني المختصر">
                    <Input
                      value={b.short_national_address ?? ''}
                      onChange={(e) =>
                        setBranch(idx, {
                          short_national_address: e.target.value.toUpperCase() || null,
                        })
                      }
                      className="tech-content"
                      maxLength={8}
                    />
                  </Field>
                  <Field label="الجوال">
                    <Input
                      value={b.phone ?? ''}
                      onChange={(e) => setBranch(idx, { phone: e.target.value || null })}
                      className="tech-content"
                    />
                  </Field>
                  <Field label="واتساب">
                    <Input
                      value={b.whatsapp ?? ''}
                      onChange={(e) => setBranch(idx, { whatsapp: e.target.value || null })}
                      className="tech-content"
                    />
                  </Field>
                  <Field label="البريد">
                    <Input
                      value={b.email ?? ''}
                      onChange={(e) => setBranch(idx, { email: e.target.value || null })}
                      className="tech-content"
                    />
                  </Field>
                  <Field label="الموقع">
                    <Input
                      value={b.website ?? ''}
                      onChange={(e) => setBranch(idx, { website: e.target.value || null })}
                      className="tech-content"
                    />
                  </Field>
                  <Field label="خط العرض">
                    <Input
                      value={b.latitude != null ? String(b.latitude) : ''}
                      onChange={(e) =>
                        setBranch(idx, {
                          latitude: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="tech-content"
                      inputMode="decimal"
                    />
                  </Field>
                  <Field label="خط الطول">
                    <Input
                      value={b.longitude != null ? String(b.longitude) : ''}
                      onChange={(e) =>
                        setBranch(idx, {
                          longitude: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="tech-content"
                      inputMode="decimal"
                    />
                  </Field>
                  <Field label="رابط الخريطة" full>
                    <Input
                      value={b.map_link ?? ''}
                      onChange={(e) => setBranch(idx, { map_link: e.target.value || null })}
                      className="tech-content"
                    />
                  </Field>
                  <Field label="العنوان التفصيلي" full>
                    <Textarea
                      rows={2}
                      value={b.address ?? ''}
                      onChange={(e) => setBranch(idx, { address: e.target.value || null })}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-3">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-lg">
          <X className="me-1 h-4 w-4" /> إلغاء
        </Button>
        <Button size="sm" onClick={submit} disabled={saving} className="rounded-lg">
          {saving ? (
            <Loader2 className="me-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="me-1 h-4 w-4" />
          )}
          حفظ التعديلات
        </Button>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="mb-2 text-[11px] font-semibold text-muted-foreground">{title}</div>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({
  label,
  full,
  children,
}) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <Label className="text-[11px] text-muted-foreground">{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);