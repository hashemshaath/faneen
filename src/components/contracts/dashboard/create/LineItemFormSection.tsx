/**
 * Phase 3C — Presentational add-line-item form.
 * Pure UI: no queries, no mutations. Receives form state, method options,
 * and callbacks from the parent (DashboardContracts). Calculation preview
 * is computed inline using the pure helper `calculateLineTotal` — server
 * remains the source of truth on save.
 */
import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DimensionHelper } from '@/components/contracts/DimensionHelper';
import {
  calculateLineTotal,
  formatPricingMethodLabel,
  formatUnitOfMeasure,
  type PricingMethod,
} from '@/lib/contract-pricing';
import { BOQ_GROUPS, getSuggestedPricingMethod, type BoqGroupKey } from '@/lib/contract-boq';

export interface LineItemFormState {
  name_ar: string;
  description_ar: string;
  quantity: string;
  unit_price: string;
  item_type: string;
  pricing_method: PricingMethod;
  length_mm: string;
  width_mm: string;
  height_mm: string;
  weight_kg: string;
  weight_ton: string;
  amount: string;
  boq_group_key: BoqGroupKey;
}

interface Props {
  isRTL: boolean;
  currency: string;
  form: LineItemFormState;
  setForm: React.Dispatch<React.SetStateAction<LineItemFormState>>;
  methodOptions: PricingMethod[];
  hasAllowList: boolean;
  isPending: boolean;
  onAdd: () => void;
  onCancel: () => void;
}

const buildFormulaInputs = (f: LineItemFormState): Record<string, number> => {
  const fi: Record<string, number> = {};
  const set = (k: string, v: string) => { if (v !== '' && Number.isFinite(Number(v))) fi[k] = Number(v); };
  set('length_mm', f.length_mm); set('width_mm', f.width_mm); set('height_mm', f.height_mm);
  set('weight_kg', f.weight_kg); set('weight_ton', f.weight_ton); set('amount', f.amount);
  return fi;
};

export const LineItemFormSection: React.FC<Props> = ({
  isRTL, currency, form, setForm, methodOptions, hasAllowList, isPending, onAdd, onCancel,
}) => {
  const calc = calculateLineTotal({
    pricing_method: form.pricing_method,
    quantity: form.quantity || 1,
    unit_price: form.unit_price || 0,
    formula_inputs: buildFormulaInputs(form),
  });
  const disabled = !form.name_ar || !calc.ok || calc.total <= 0 || isPending;

  return (
    <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
      <h4 className="text-xs font-semibold">{isRTL ? 'إضافة بند إضافي (خدمة/مادة)' : 'Add Line Item (Service/Material)'}</h4>
      {hasAllowList && (
        <p className="text-[10px] text-muted-foreground">
          {isRTL ? 'طرق التسعير المتاحة حسب قالب العقد.' : 'Pricing methods available per contract template.'}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Input placeholder={isRTL ? 'اسم البند' : 'Item Name'} value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} className="h-9 text-xs" />
        <Select value={form.item_type} onValueChange={v => setForm(f => ({ ...f, item_type: v }))}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="service">{isRTL ? 'خدمة' : 'Service'}</SelectItem>
            <SelectItem value="material">{isRTL ? 'مادة' : 'Material'}</SelectItem>
            <SelectItem value="installation">{isRTL ? 'تركيب' : 'Installation'}</SelectItem>
            <SelectItem value="other">{isRTL ? 'أخرى' : 'Other'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={form.pricing_method} onValueChange={v => setForm(f => ({ ...f, pricing_method: v as PricingMethod }))}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {methodOptions.map(m => (
              <SelectItem key={m} value={m}>{formatPricingMethodLabel(m, isRTL ? 'ar' : 'en')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.pricing_method !== 'lump_sum' && (
          <Input type="number" min="0" placeholder={isRTL ? 'الكمية' : 'Qty'} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} dir="ltr" className="h-9 text-xs" />
        )}
      </div>
      {/* BOQ group selector — auto-suggests pricing method when group has one. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Select
          value={form.boq_group_key}
          onValueChange={(v) => setForm(f => {
            const suggested = getSuggestedPricingMethod(v) as PricingMethod | undefined;
            const next: typeof f = { ...f, boq_group_key: v as BoqGroupKey };
            if (suggested && methodOptions.includes(suggested) && f.pricing_method === 'unit') {
              next.pricing_method = suggested;
            }
            return next;
          })}
        >
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={isRTL ? 'مجموعة البند' : 'BOQ Group'} /></SelectTrigger>
          <SelectContent>
            {BOQ_GROUPS.map(g => (
              <SelectItem key={g.key} value={g.key}>{isRTL ? g.ar : g.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Conditional dimension/weight inputs per method */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {(form.pricing_method === 'linear_meter' || form.pricing_method === 'square_meter' || form.pricing_method === 'cubic_meter') && (
          <Input type="number" min="0" placeholder={isRTL ? 'الطول (مم)' : 'Length (mm)'} value={form.length_mm} onChange={e => setForm(f => ({ ...f, length_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
        )}
        {(form.pricing_method === 'square_meter' || form.pricing_method === 'cubic_meter') && (
          <Input type="number" min="0" placeholder={isRTL ? 'العرض (مم)' : 'Width (mm)'} value={form.width_mm} onChange={e => setForm(f => ({ ...f, width_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
        )}
        {form.pricing_method === 'cubic_meter' && (
          <Input type="number" min="0" placeholder={isRTL ? 'الارتفاع (مم)' : 'Height (mm)'} value={form.height_mm} onChange={e => setForm(f => ({ ...f, height_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
        )}
        {form.pricing_method === 'kilogram' && (
          <Input type="number" min="0" placeholder={isRTL ? 'الوزن (كجم)' : 'Weight (kg)'} value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} dir="ltr" className="h-9 text-xs" />
        )}
        {form.pricing_method === 'ton' && (
          <Input type="number" min="0" placeholder={isRTL ? 'الوزن (طن)' : 'Weight (t)'} value={form.weight_ton} onChange={e => setForm(f => ({ ...f, weight_ton: e.target.value }))} dir="ltr" className="h-9 text-xs" />
        )}
        {form.pricing_method === 'lump_sum' ? (
          <Input type="number" min="0" placeholder={isRTL ? 'المبلغ المقطوع' : 'Lump Sum Amount'} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} dir="ltr" className="h-9 text-xs" />
        ) : (
          <Input type="number" min="0" placeholder={isRTL ? `سعر / ${formatUnitOfMeasure(form.pricing_method)}` : `Price / ${formatUnitOfMeasure(form.pricing_method)}`} value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} dir="ltr" className="h-9 text-xs" />
        )}
      </div>
      <DimensionHelper
        isRTL={isRTL}
        method={form.pricing_method}
        lengthMm={form.length_mm}
        widthMm={form.width_mm}
        heightMm={form.height_mm}
        weightKg={form.weight_kg}
        weightTon={form.weight_ton}
        amount={form.amount}
      />
      <Input placeholder={isRTL ? 'وصف البند (اختياري)' : 'Description (optional)'} value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} className="h-9 text-xs" />
      {calc.ok && calc.total > 0 && (
        <p className="text-[11px] text-muted-foreground">{isRTL ? 'التكلفة:' : 'Cost:'} <strong className="text-accent">{calc.total.toLocaleString()} {currency}</strong></p>
      )}
      {!calc.ok && calc.errorCode === 'negative_value' && (
        <p className="text-[11px] text-destructive">{isRTL ? 'لا يمكن إدخال قيم سالبة' : 'Negative values not allowed'}</p>
      )}
      {!calc.ok && calc.errorCode === 'value_too_large' && (
        <p className="text-[11px] text-destructive">{isRTL ? 'القيم كبيرة جداً' : 'Values are too large'}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="h-8 text-xs gap-1" disabled={disabled} onClick={onAdd}>
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}{isRTL ? 'إضافة' : 'Add'}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
      </div>
    </div>
  );
};

export default LineItemFormSection;