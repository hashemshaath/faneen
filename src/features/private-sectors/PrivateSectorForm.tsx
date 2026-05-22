/**
 * Inline (no-popup) editor for a single private sector.
 * Used by both provider and admin pages.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';
import { PS_BRAND_TYPE_META, PrivateSector, PrivateSectorBrandType } from './types';
import { Save, X, Search as SearchIcon, Globe2, MapPin, Tag } from 'lucide-react';
import { listActiveCategories } from '@/modules/categories';
import { listActiveCities } from '@/modules/locations';
import { useQuery } from '@tanstack/react-query';

interface Props {
  initial?: Partial<PrivateSector>;
  onCancel: () => void;
  onSubmit: (values: Partial<PrivateSector>, reason?: string) => Promise<void> | void;
  busy?: boolean;
  /** Show the post-approval guard hint and reason input (used when sector is approved). */
  requiresReason?: boolean;
}

export const PrivateSectorForm: React.FC<Props> = ({ initial, onCancel, onSubmit, busy, requiresReason }) => {
  const { isRTL } = useLanguage();
  const [form, setForm] = useState<Partial<PrivateSector>>({
    name_ar: '', name_en: '', parent_sector: 'aluminum',
    brand_type: 'own_brand', short_description_ar: '', short_description_en: '',
    description_ar: '', description_en: '', logo_url: '', cover_url: '',
    website: '', contact_email: '', contact_phone: '', established_year: null,
    city_id: null, category_id: null,
    seo_title_ar: '', seo_title_en: '', seo_description_ar: '', seo_description_en: '',
    seo_keywords: [],
    ...initial,
  });
  const [reason, setReason] = useState('');
  const [keywordInput, setKeywordInput] = useState((initial?.seo_keywords ?? []).join(', '));

  useEffect(() => { setKeywordInput((form.seo_keywords ?? []).join(', ')); /* on initial load */ /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const { data: cities = [] } = useQuery<Array<{ id: string; name_ar: string; name_en: string }>>({
    queryKey: ['cities-active'],
    queryFn: async () => {
      const { data } = await listActiveCities<{ id: string; name_ar: string; name_en: string }>();
      return data ?? [];
    },
  });
  const { data: categories = [] } = useQuery<Array<{ id: string; name_ar: string; name_en: string; slug: string }>>({
    queryKey: ['categories-active'],
    queryFn: async () => {
      const { data } = await listActiveCategories<{ id: string; name_ar: string; name_en: string; slug: string }>({ select: 'id, name_ar, name_en, slug' });
      return data ?? [];
    },
  });

  const set = <K extends keyof PrivateSector>(k: K, v: PrivateSector[K] | null | undefined) =>
    setForm((f) => ({ ...f, [k]: v as never }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_ar?.trim()) return;
    const keywords = keywordInput.split(',').map((k) => k.trim()).filter(Boolean);
    void onSubmit({ ...form, seo_keywords: keywords as never }, reason.trim() || undefined);
  };

  const slugPreview = useMemo(() => (initial?.slug ?? ''), [initial]);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base">
          {initial?.id
            ? (isRTL ? 'تعديل القطاع الخاص' : 'Edit private sector')
            : (isRTL ? 'إضافة قطاع خاص' : 'New private sector')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <div>
            <Label>{isRTL ? 'الاسم بالعربية *' : 'Name (Arabic) *'}</Label>
            <Input dir="auto" value={form.name_ar ?? ''} onChange={(e) => set('name_ar', e.target.value)} required />
          </div>
          <div>
            <Label>{isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}</Label>
            <Input dir="ltr" value={form.name_en ?? ''} onChange={(e) => set('name_en', e.target.value)} />
          </div>

          <div>
            <Label>{isRTL ? 'القطاع الرئيسي' : 'Parent sector'}</Label>
            <Select value={form.parent_sector ?? ''} onValueChange={(v) => set('parent_sector', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ONBOARDING_SECTORS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{isRTL ? s.name_ar : s.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRTL ? 'نوع العلامة' : 'Brand type'}</Label>
            <Select value={form.brand_type ?? 'own_brand'} onValueChange={(v) => set('brand_type', v as PrivateSectorBrandType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PS_BRAND_TYPE_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>{isRTL ? m.ar : m.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>{isRTL ? 'وصف مختصر (عربي)' : 'Short description (AR)'}</Label>
            <Textarea dir="auto" rows={2} value={form.short_description_ar ?? ''} onChange={(e) => set('short_description_ar', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>{isRTL ? 'وصف مختصر (إنجليزي)' : 'Short description (EN)'}</Label>
            <Textarea dir="ltr" rows={2} value={form.short_description_en ?? ''} onChange={(e) => set('short_description_en', e.target.value)} />
          </div>

          <div>
            <Label>{isRTL ? 'الموقع الإلكتروني' : 'Website'}</Label>
            <Input dir="ltr" value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} />
          </div>
          <div>
            <Label>{isRTL ? 'سنة التأسيس' : 'Established year'}</Label>
            <Input type="number" dir="ltr" value={form.established_year ?? ''} onChange={(e) => set('established_year', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <Label>{isRTL ? 'بريد التواصل' : 'Contact email'}</Label>
            <Input dir="ltr" type="email" value={form.contact_email ?? ''} onChange={(e) => set('contact_email', e.target.value)} />
          </div>
          <div>
            <Label>{isRTL ? 'هاتف التواصل' : 'Contact phone'}</Label>
            <Input dir="ltr" value={form.contact_phone ?? ''} onChange={(e) => set('contact_phone', e.target.value)} />
          </div>
          <div>
            <Label>{isRTL ? 'رابط الشعار' : 'Logo URL'}</Label>
            <Input dir="ltr" value={form.logo_url ?? ''} onChange={(e) => set('logo_url', e.target.value)} />
          </div>
          <div>
            <Label>{isRTL ? 'رابط الغلاف' : 'Cover URL'}</Label>
            <Input dir="ltr" value={form.cover_url ?? ''} onChange={(e) => set('cover_url', e.target.value)} />
          </div>

          <div>
            <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{isRTL ? 'المدينة' : 'City'}</Label>
            <Select value={form.city_id ?? '__none__'} onValueChange={(v) => set('city_id', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر مدينة' : 'Select city'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{isRTL ? 'بدون' : 'None'}</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />{isRTL ? 'الفئة' : 'Category'}</Label>
            <Select value={form.category_id ?? '__none__'} onValueChange={(v) => set('category_id', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر فئة' : 'Select category'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{isRTL ? 'بدون' : 'None'}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 mt-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <SearchIcon className="h-4 w-4" /> {isRTL ? 'إعدادات SEO' : 'SEO settings'}
              {slugPreview && <span className="ms-auto text-xs tech-content text-muted-foreground/70 inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />/brands/{slugPreview}</span>}
            </div>
          </div>
          <div>
            <Label>{isRTL ? 'عنوان SEO (عربي)' : 'SEO title (AR)'}</Label>
            <Input dir="auto" maxLength={70} value={form.seo_title_ar ?? ''} onChange={(e) => set('seo_title_ar', e.target.value)} />
          </div>
          <div>
            <Label>{isRTL ? 'عنوان SEO (إنجليزي)' : 'SEO title (EN)'}</Label>
            <Input dir="ltr" maxLength={70} value={form.seo_title_en ?? ''} onChange={(e) => set('seo_title_en', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>{isRTL ? 'وصف SEO (عربي)' : 'SEO description (AR)'}</Label>
            <Textarea dir="auto" rows={2} maxLength={170} value={form.seo_description_ar ?? ''} onChange={(e) => set('seo_description_ar', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>{isRTL ? 'وصف SEO (إنجليزي)' : 'SEO description (EN)'}</Label>
            <Textarea dir="ltr" rows={2} maxLength={170} value={form.seo_description_en ?? ''} onChange={(e) => set('seo_description_en', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>{isRTL ? 'كلمات مفتاحية (مفصولة بفواصل)' : 'Keywords (comma-separated)'}</Label>
            <Input dir="auto" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
                   placeholder={isRTL ? 'ألمنيوم, واجهات, الرياض' : 'aluminum, facades, riyadh'} />
          </div>

          {requiresReason && (
            <div className="md:col-span-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <Label className="text-warning">{isRTL ? 'سبب التعديل (إلزامي بعد الاعتماد)' : 'Change reason (required after approval)'}</Label>
              <Textarea dir="auto" rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder={isRTL ? 'أي تعديل جوهري سيُعيد القطاع لقيد المراجعة.' : 'Material edits send the sector back to review.'} />
            </div>
          )}

          <div className="md:col-span-2 flex items-center gap-2 pt-2">
            <Button type="submit" size="app" disabled={busy || (requiresReason && !reason.trim())}>
              <Save className="h-4 w-4" /> {isRTL ? 'حفظ' : 'Save'}
            </Button>
            <Button type="button" variant="outline" size="app" onClick={onCancel}>
              <X className="h-4 w-4" /> {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};