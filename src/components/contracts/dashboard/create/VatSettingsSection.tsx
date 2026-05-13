/**
 * Phase 3E — Presentational VAT settings (inclusive toggle + rate).
 * Pure UI: parent owns form state and all VAT calculations.
 */
import React from 'react';
import { Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ContractForm } from './contract-form-types';

interface Props {
  isRTL: boolean;
  form: ContractForm;
  setForm: React.Dispatch<React.SetStateAction<ContractForm>>;
}

export const VatSettingsSection: React.FC<Props> = ({ isRTL, form, setForm }) => (
  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
    <h4 className="text-xs font-semibold flex items-center gap-1.5"><Percent className="w-3.5 h-3.5 text-primary" />{isRTL ? 'ضريبة القيمة المضافة' : 'Value Added Tax (VAT)'}</h4>
    <div className="flex items-center gap-4 flex-wrap">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.vat_inclusive} onChange={e => setForm(f => ({ ...f, vat_inclusive: e.target.checked }))} className="w-4 h-4 rounded border-border accent-accent" />
        <span className="text-xs">{isRTL ? 'الأسعار شاملة الضريبة' : 'Prices include VAT'}</span>
      </label>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">{isRTL ? 'نسبة الضريبة' : 'VAT Rate'}</Label>
        <Input type="number" value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))} dir="ltr" className="h-8 w-20 text-xs" />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
    <p className="text-[9px] text-muted-foreground">{form.vat_inclusive ? (isRTL ? 'جميع الأسعار والمبالغ في العقد شاملة ضريبة القيمة المضافة' : 'All prices and amounts include VAT') : (isRTL ? 'ستُضاف ضريبة القيمة المضافة على المجموع النهائي' : 'VAT will be added to the final total')}</p>
  </div>
);

export default VatSettingsSection;