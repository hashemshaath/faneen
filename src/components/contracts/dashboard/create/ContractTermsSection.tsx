/**
 * Phase 3E — Presentational bilingual terms inputs with FieldAiActions.
 * Pure UI: parent owns form state. AI improvements/translations are routed
 * through the same setForm callback used previously — no auto-generation.
 */
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import type { ContractForm } from './contract-form-types';

interface Props {
  isRTL: boolean;
  form: ContractForm;
  setForm: React.Dispatch<React.SetStateAction<ContractForm>>;
}

export const ContractTermsSection: React.FC<Props> = ({ isRTL, form, setForm }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="md:col-span-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
      {[
        { ar: 'بنود العقد', en: 'Contract terms' },
        { ar: 'الضمان', en: 'Warranty' },
        { ar: 'الدفعات', en: 'Payments' },
        { ar: 'شروط التسليم', en: 'Delivery terms' },
      ].map((label) => <span key={label.ar}>{isRTL ? label.ar : label.en}</span>)}
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <Label className="text-xs">{isRTL ? 'بنود العقد (عربي)' : 'Contract terms (Arabic)'}</Label>
        <FieldAiActions value={form.terms_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, terms_ar: v }))} fieldType="content" />
      </div>
      <Textarea value={form.terms_ar} onChange={e => setForm(f => ({ ...f, terms_ar: e.target.value }))} rows={6} className="text-xs" />
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <Label className="text-xs">{isRTL ? 'بنود العقد (إنجليزي)' : 'Contract terms (English)'}</Label>
        <FieldAiActions value={form.terms_en} lang="en" onTranslated={v => setForm(f => ({ ...f, terms_en: v }))} onImproved={v => setForm(f => ({ ...f, terms_en: v }))} fieldType="content" />
      </div>
      <Textarea value={form.terms_en} onChange={e => setForm(f => ({ ...f, terms_en: e.target.value }))} rows={6} dir="ltr" className="text-xs" />
    </div>
  </div>
);

export default ContractTermsSection;