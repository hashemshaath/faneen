/**
 * Phase 3D — Presentational details inputs for the create flow.
 * Covers: bilingual title/description, amount, currency, dates.
 * VAT/Supervisor/Terms remain in the parent under the Pricing step.
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import type { ContractForm } from './contract-form-types';

interface Props {
  isRTL: boolean;
  form: ContractForm;
  setForm: React.Dispatch<React.SetStateAction<ContractForm>>;
}

export const ContractDetailsSection: React.FC<Props> = ({ isRTL, form, setForm }) => {
  // Track whether user manually edited the English mirror fields. Until they do,
  // English fields auto-mirror the Arabic value so the user gets a starting point
  // they can translate or tweak.
  const titleEnTouched = React.useRef(false);
  const descEnTouched = React.useRef(false);

  React.useEffect(() => {
    if (!titleEnTouched.current && form.title_ar && form.title_en !== form.title_ar) {
      setForm(f => ({ ...f, title_en: f.title_ar }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title_ar]);

  React.useEffect(() => {
    if (!descEnTouched.current && form.description_ar && form.description_en !== form.description_ar) {
      setForm(f => ({ ...f, description_en: f.description_ar }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.description_ar]);

  return (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <Label className="text-xs">{isRTL ? 'عنوان العقد (عربي)' : 'Title (Arabic)'} <span className="text-destructive">*</span></Label>
          <FieldAiActions value={form.title_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, title_ar: v }))} fieldType="title" />
        </div>
        <Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} className="h-10" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <Label className="text-xs">{isRTL ? 'عنوان العقد (إنجليزي)' : 'Title (English)'}</Label>
          <FieldAiActions value={form.title_en} lang="en" onTranslated={v => { titleEnTouched.current = true; setForm(f => ({ ...f, title_en: v })); }} onImproved={v => { titleEnTouched.current = true; setForm(f => ({ ...f, title_en: v })); }} fieldType="title" />
        </div>
        <Input value={form.title_en} onChange={e => { titleEnTouched.current = true; setForm(f => ({ ...f, title_en: e.target.value })); }} dir="ltr" className="h-10" placeholder={isRTL ? 'يُملأ تلقائيًا من العربي — قابل للتعديل' : 'Auto-filled from Arabic — editable'} />
      </div>
    </div>

    {/* Descriptions */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <Label className="text-xs">{isRTL ? 'نطاق العمل (عربي)' : 'Scope of work (Arabic)'}</Label>
          <FieldAiActions value={form.description_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, description_ar: v }))} fieldType="description" />
        </div>
        <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={3} className="text-xs" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <Label className="text-xs">{isRTL ? 'نطاق العمل (إنجليزي)' : 'Scope of work (English)'}</Label>
          <FieldAiActions value={form.description_en} lang="en" onTranslated={v => { descEnTouched.current = true; setForm(f => ({ ...f, description_en: v })); }} onImproved={v => { descEnTouched.current = true; setForm(f => ({ ...f, description_en: v })); }} fieldType="description" />
        </div>
        <Textarea value={form.description_en} onChange={e => { descEnTouched.current = true; setForm(f => ({ ...f, description_en: e.target.value })); }} rows={3} dir="ltr" className="text-xs" placeholder={isRTL ? 'يُملأ تلقائيًا من العربي — قابل للتعديل' : 'Auto-filled from Arabic — editable'} />
      </div>
    </div>

    {/* Financial & Dates */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'المبلغ' : 'Amount'} <span className="text-destructive">*</span></Label>
        <Input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} dir="ltr" className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'العملة' : 'Currency'}</Label>
        <Select value={form.currency_code} onValueChange={v => setForm(f => ({ ...f, currency_code: v }))}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SAR">SAR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'مدة التنفيذ — تاريخ البدء' : 'Execution duration — Start date'}</Label>
        <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} dir="ltr" className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'مدة التنفيذ — تاريخ الانتهاء' : 'Execution duration — End date'}</Label>
        <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} dir="ltr" className="h-10" />
      </div>
    </div>
  </>
  );
};

export default ContractDetailsSection;