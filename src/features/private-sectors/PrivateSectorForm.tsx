/**
 * Inline (no-popup) editor for a single private sector.
 * Used by both provider and admin pages.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';
import { PS_BRAND_TYPE_META, PrivateSector, PrivateSectorBrandType } from './types';
import { Save, X } from 'lucide-react';

interface Props {
  initial?: Partial<PrivateSector>;
  onCancel: () => void;
  onSubmit: (values: Partial<PrivateSector>) => Promise<void> | void;
  busy?: boolean;
}

export const PrivateSectorForm: React.FC<Props> = ({ initial, onCancel, onSubmit, busy }) => {
  const { isRTL } = useLanguage();
  const [form, setForm] = useState<Partial<PrivateSector>>({
    name_ar: '', name_en: '', parent_sector: 'aluminum',
    brand_type: 'own_brand', short_description_ar: '', short_description_en: '',
    description_ar: '', description_en: '', logo_url: '', cover_url: '',
    website: '', contact_email: '', contact_phone: '', established_year: null,
    ...initial,
  });

  const set = <K extends keyof PrivateSector>(k: K, v: PrivateSector[K] | null | undefined) =>
    setForm((f) => ({ ...f, [k]: v as never }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_ar?.trim()) return;
    void onSubmit(form);
  };

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

          <div className="md:col-span-2 flex items-center gap-2 pt-2">
            <Button type="submit" size="app" disabled={busy}>
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