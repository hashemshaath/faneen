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
  // English mirror fields are kept in sync automatically; the UI only exposes
  // the Arabic inputs to avoid duplicate fields. Users can edit the English
  // copy later from the contract detail view if needed.
  React.useEffect(() => {
    if (form.title_ar && form.title_en !== form.title_ar) {
      setForm(f => ({ ...f, title_en: f.title_ar }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title_ar]);

  React.useEffect(() => {
    if (form.description_ar && form.description_en !== form.description_ar) {
      setForm(f => ({ ...f, description_en: f.description_ar }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.description_ar]);

  return (
  <>
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <Label className="text-xs">{isRTL ? 'عنوان العقد' : 'Contract title'} <span className="text-destructive">*</span></Label>
        <FieldAiActions value={form.title_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, title_ar: v }))} fieldType="title" />
      </div>
      <Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} className="h-10" />
    </div>

    {/* Description */}
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <Label className="text-xs">{isRTL ? 'نطاق العمل' : 'Scope of work'}</Label>
        <FieldAiActions value={form.description_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, description_ar: v }))} fieldType="description" />
      </div>
      <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={3} className="text-xs" />
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