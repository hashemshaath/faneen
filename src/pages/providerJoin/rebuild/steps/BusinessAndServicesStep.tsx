import React from 'react';
import { CompactInput } from '../components/CompactInput';
import { CompactTextarea } from '../components/CompactTextarea';
import { ServiceChipSelector } from '../components/ServiceChipSelector';
import { BrandTagInput } from '../components/BrandTagInput';
import type { ErrorMap, ProviderLeadFormState } from '../types';

export interface BusinessAndServicesStepProps {
  form: ProviderLeadFormState;
  errors: ErrorMap;
  catalogNames: string[];
  isRTL: boolean;
  setField: <K extends keyof ProviderLeadFormState>(k: K, v: ProviderLeadFormState[K]) => void;
}

export const BusinessAndServicesStep: React.FC<BusinessAndServicesStepProps> = ({
  form, errors, catalogNames, isRTL, setField,
}) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  return (
    <div className="space-y-3">
      <CompactInput
        id="name_ar"
        label={t('اسم المنشأة بالعربي', 'Business name (Arabic)')}
        required
        value={form.name_ar}
        onChange={(e) => setField('name_ar', e.target.value)}
        error={errors.name_ar}
      />
      <CompactInput
        id="name_en"
        label={t('اسم المنشأة بالإنجليزي', 'Business name (English)')}
        value={form.name_en}
        onChange={(e) => setField('name_en', e.target.value)}
      />
      <CompactInput
        id="main_activity"
        label={t('النشاط الرئيسي', 'Main activity')}
        placeholder={t('مثال: ألمنيوم، زجاج، حديد', 'e.g. Aluminum, Glass, Steel')}
        value={form.main_activity}
        onChange={(e) => setField('main_activity', e.target.value)}
      />
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium block">{t('التخصصات والخدمات', 'Specialties & Services')}</label>
        <ServiceChipSelector
          catalogNames={catalogNames}
          values={form.specialties}
          onChange={(v) => setField('specialties', v)}
          isRTL={isRTL}
        />
      </div>
      <BrandTagInput
        id="brands"
        label={t('الوكالات / العلامات التجارية', 'Brands / Agencies')}
        values={form.brands}
        onChange={(v) => setField('brands', v)}
        placeholder={t('اكتب اسم العلامة ثم Enter', 'Type and press Enter')}
      />
      <CompactTextarea
        id="brief"
        label={t('نبذة مختصرة', 'Short description')}
        maxLength={2000}
        value={form.brief}
        onChange={(e) => setField('brief', e.target.value)}
        hint={`${form.brief.length}/2000`}
      />
    </div>
  );
};