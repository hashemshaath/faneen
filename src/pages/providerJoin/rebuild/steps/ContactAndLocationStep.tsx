import React from 'react';
import { CompactInput } from '../components/CompactInput';
import { Label } from '@/components/ui/label';
import { Mail, Phone, Link as LinkIcon, MapPin } from 'lucide-react';
import type { ErrorMap, ProviderLeadChannel, ProviderLeadFormState } from '../types';

export interface ContactAndLocationStepProps {
  form: ProviderLeadFormState;
  errors: ErrorMap;
  isRTL: boolean;
  setField: <K extends keyof ProviderLeadFormState>(k: K, v: ProviderLeadFormState[K]) => void;
}

export const ContactAndLocationStep: React.FC<ContactAndLocationStepProps> = ({ form, errors, isRTL, setField }) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  return (
    <div className="space-y-3">
      <CompactInput
        id="contact_name"
        label={t('اسم المسؤول', 'Contact name')}
        required
        value={form.contact_name}
        onChange={(e) => setField('contact_name', e.target.value)}
        error={errors.contact_name}
      />
      <CompactInput
        id="email"
        label={t('البريد الإلكتروني', 'Email')}
        type="email"
        dir="ltr"
        required
        startIcon={<Mail />}
        className="tech-content"
        placeholder="name@example.com"
        value={form.email}
        onChange={(e) => setField('email', e.target.value)}
        error={errors.email}
      />
      <CompactInput
        id="phone"
        label={t('رقم الجوال', 'Phone')}
        type="tel"
        dir="ltr"
        required
        startIcon={<Phone />}
        className="tech-content"
        placeholder="05xxxxxxxx"
        value={form.phone}
        onChange={(e) => setField('phone', e.target.value)}
        error={errors.phone}
      />
      <div className="space-y-1.5">
        <Label htmlFor="preferred_channel" className="text-[13px] font-medium">
          {t('وسيلة التواصل المفضلة', 'Preferred channel')}
        </Label>
        <select
          id="preferred_channel"
          value={form.preferred_channel}
          onChange={(e) => setField('preferred_channel', e.target.value as ProviderLeadChannel)}
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-[14px]"
        >
          <option value="phone">{t('اتصال', 'Phone')}</option>
          <option value="whatsapp">{t('واتساب', 'WhatsApp')}</option>
          <option value="email">{t('بريد إلكتروني', 'Email')}</option>
        </select>
      </div>
      <CompactInput
        id="website"
        label={t('الموقع الإلكتروني', 'Website')}
        type="url"
        dir="ltr"
        startIcon={<LinkIcon />}
        placeholder="https://"
        value={form.website}
        onChange={(e) => setField('website', e.target.value)}
        error={errors.website}
      />
      <CompactInput
        id="city"
        label={t('المدينة', 'City')}
        value={form.city}
        onChange={(e) => setField('city', e.target.value)}
      />
      <CompactInput
        id="national_address"
        label={t('العنوان الوطني', 'National address')}
        className="tech-content"
        placeholder="ABCD1234"
        value={form.national_address}
        onChange={(e) => setField('national_address', e.target.value)}
        error={errors.national_address}
      />
      <CompactInput
        id="map_link"
        label={t('رابط الموقع على الخريطة', 'Map link')}
        type="url"
        dir="ltr"
        startIcon={<MapPin />}
        placeholder="https://maps.google.com/..."
        value={form.map_link}
        onChange={(e) => setField('map_link', e.target.value)}
        error={errors.map_link}
      />
    </div>
  );
};