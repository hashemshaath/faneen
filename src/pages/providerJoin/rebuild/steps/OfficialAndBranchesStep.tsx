import React from 'react';
import { CompactInput } from '../components/CompactInput';
import { CompactFileUpload } from '../components/CompactFileUpload';
import { BranchAccordionCard } from '../components/BranchAccordionCard';
import { CR_ACCEPT } from '../constants';
import type { ErrorMap, ProviderLeadBranchInput, ProviderLeadFormState } from '../types';

export interface OfficialAndBranchesStepProps {
  form: ProviderLeadFormState;
  branches: ProviderLeadBranchInput[];
  errors: ErrorMap;
  crFile: File | null;
  isRTL: boolean;
  setField: <K extends keyof ProviderLeadFormState>(k: K, v: ProviderLeadFormState[K]) => void;
  onBranchChange: (i: number, k: keyof ProviderLeadBranchInput, v: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearError: (k: string) => void;
}

export const OfficialAndBranchesStep: React.FC<OfficialAndBranchesStepProps> = ({
  form, branches, errors, crFile, isRTL, setField, onBranchChange, onFileChange, clearError,
}) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  return (
    <div className="space-y-3">
      <CompactInput
        id="cr_number"
        label={t('رقم السجل التجاري', 'Commercial Registration')}
        className="tech-content"
        value={form.cr_number}
        onChange={(e) => setField('cr_number', e.target.value)}
        error={errors.cr_number}
        hint={t('10 خانات عادةً.', 'Usually 10 digits.')}
      />
      <CompactInput
        id="unified_number"
        label={t('الرقم الموحد', 'Unified Number')}
        className="tech-content"
        value={form.unified_number}
        onChange={(e) => setField('unified_number', e.target.value)}
        error={errors.unified_number}
      />
      <CompactInput
        id="vat_number"
        label={t('الرقم الضريبي', 'VAT Number')}
        className="tech-content"
        value={form.vat_number}
        onChange={(e) => setField('vat_number', e.target.value)}
        error={errors.vat_number}
        hint={t('15 رقم تبدأ بـ 3 وتنتهي بـ 3.', '15 digits starting & ending with 3.')}
      />
      <CompactFileUpload
        id="cr_file"
        label={t('ملف السجل التجاري', 'CR document')}
        hint={t('PDF أو JPG أو PNG — حتى 5 ميغابايت.', 'PDF, JPG or PNG — up to 5 MB.')}
        file={crFile}
        accept={CR_ACCEPT}
        onChange={onFileChange}
        error={errors.cr_file}
        buttonLabel={t('اختيار ملف', 'Choose file')}
        emptyLabel={t('لم يتم اختيار ملف', 'No file chosen')}
      />
      <CompactInput
        id="branches_count"
        label={t('عدد الفروع', 'Branches count')}
        type="number"
        dir="ltr"
        min={1}
        className="tech-content"
        value={String(form.branches_count)}
        onChange={(e) => setField('branches_count', Number(e.target.value) || 1)}
        error={errors.branches_count}
        hint={t('شامل الفرع الرئيسي.', 'Including the main branch.')}
      />
      {form.branches_count > 1 && (
        <div className="space-y-2">
          <p className="text-[12px] text-muted-foreground">
            {t(
              `أضف بيانات ${form.branches_count - 1} فرع إضافي. الفرع الرئيسي يستخدم بيانات التواصل.`,
              `Add ${form.branches_count - 1} extra branch${form.branches_count - 1 > 1 ? 'es' : ''}. The main branch uses your contact info.`,
            )}
          </p>
          {branches.map((b, i) => (
            <BranchAccordionCard
              key={i}
              index={i}
              branch={b}
              errors={errors}
              isRTL={isRTL}
              onChange={(k, v) => onBranchChange(i, k, v)}
              clearError={clearError}
            />
          ))}
        </div>
      )}
    </div>
  );
};