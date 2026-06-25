/**
 * Phase 3D — Presentational details inputs for the create flow.
 * Covers: bilingual title/description, amount, currency, dates.
 * VAT/Supervisor/Terms remain in the parent under the Pricing step.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { Button } from '@/components/ui/button';
import type { ContractForm } from './contract-form-types';

interface Props {
  isRTL: boolean;
  form: ContractForm;
  setForm: React.Dispatch<React.SetStateAction<ContractForm>>;
  /** When provided, used to auto-compose the title/description. */
  selectedSiteId?: string | null;
  /** Selected work-type/specialty label (Arabic). */
  selectedWorkTypeLabel?: string | null;
}

export const ContractDetailsSection: React.FC<Props> = ({
  isRTL, form, setForm, selectedSiteId, selectedWorkTypeLabel,
}) => {
  // ---------- Auto-compose title + description from site + specialty ----------
  const titleTouched = React.useRef(false);
  const descTouched = React.useRef(false);

  const { data: siteRow } = useQuery({
    queryKey: ['contract-create-site-label', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return null;
      const { data, error } = await supabase
        .from('client_sites')
        .select('site_name, label, address_line1, city_name')
        .eq('id', selectedSiteId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!selectedSiteId,
  });

  const siteName: string | null =
    (siteRow?.site_name as string | null) ||
    (siteRow?.label as string | null) ||
    (siteRow?.address_line1 as string | null) ||
    null;

  const composedTitle = React.useMemo(() => {
    const parts = [siteName, selectedWorkTypeLabel].filter(Boolean);
    return parts.length ? parts.join(' — ') : '';
  }, [siteName, selectedWorkTypeLabel]);

  const composedDesc = React.useMemo(() => {
    if (!selectedWorkTypeLabel && !siteName) return '';
    if (selectedWorkTypeLabel && siteName) {
      return `توريد وتنفيذ ${selectedWorkTypeLabel} في ${siteName} ضمن نطاق العمل المتفق عليه.`;
    }
    if (selectedWorkTypeLabel) {
      return `توريد وتنفيذ ${selectedWorkTypeLabel} ضمن نطاق العمل المتفق عليه.`;
    }
    return `أعمال المشروع في ${siteName} ضمن نطاق العمل المتفق عليه.`;
  }, [siteName, selectedWorkTypeLabel]);

  React.useEffect(() => {
    if (!titleTouched.current && composedTitle && composedTitle !== form.title_ar) {
      setForm(f => ({ ...f, title_ar: composedTitle }));
    }
  }, [composedTitle]);

  React.useEffect(() => {
    if (!descTouched.current && composedDesc && composedDesc !== form.description_ar) {
      setForm(f => ({ ...f, description_ar: composedDesc }));
    }
  }, [composedDesc]);

  // English mirror fields are kept in sync automatically; the UI only exposes
  // the Arabic inputs to avoid duplicate fields. Users can edit the English
  // copy later from the contract detail view if needed.
  React.useEffect(() => {
    if (form.title_ar && form.title_en !== form.title_ar) {
      setForm(f => ({ ...f, title_en: f.title_ar }));
    }
  }, [form.title_ar]);

  React.useEffect(() => {
    if (form.description_ar && form.description_en !== form.description_ar) {
      setForm(f => ({ ...f, description_en: f.description_ar }));
    }
  }, [form.description_ar]);

  // ---------- End-date / duration toggle ----------
  const [endMode, setEndMode] = React.useState<'date' | 'duration'>('date');
  const [durationDays, setDurationDays] = React.useState<string>('');

  React.useEffect(() => {
    if (endMode !== 'duration') return;
    const n = Number(durationDays);
    if (!form.start_date || !Number.isFinite(n) || n <= 0) return;
    const start = new Date(form.start_date);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + n * 24 * 60 * 60 * 1000);
    const iso = end.toISOString().slice(0, 10);
    if (iso !== form.end_date) setForm(f => ({ ...f, end_date: iso }));
  }, [endMode, durationDays, form.start_date]);

  // ---------- Date validation (UI guard) ----------
  const dateError = React.useMemo(() => {
    if (!form.start_date || !form.end_date) return null;
    if (new Date(form.end_date) < new Date(form.start_date)) {
      return isRTL
        ? 'تاريخ الانتهاء لا يمكن أن يسبق تاريخ البدء'
        : 'End date cannot be before start date';
    }
    return null;
  }, [form.start_date, form.end_date, isRTL]);

  const durationError = React.useMemo(() => {
    if (endMode !== 'duration') return null;
    if (durationDays === '') return null;
    const n = Number(durationDays);
    if (!Number.isFinite(n) || n <= 0) {
      return isRTL ? 'المدة يجب أن تكون رقماً موجباً' : 'Duration must be a positive number';
    }
    if (!form.start_date) {
      return isRTL ? 'حدّد تاريخ البدء أولاً' : 'Set the start date first';
    }
    return null;
  }, [endMode, durationDays, form.start_date, isRTL]);

  return (
  <>
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <Label className="text-xs">{isRTL ? 'عنوان العقد' : 'Contract title'} <span className="text-destructive">*</span></Label>
        <FieldAiActions value={form.title_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, title_ar: v }))} fieldType="title" />
      </div>
      <Input
        value={form.title_ar}
        onChange={e => { titleTouched.current = true; setForm(f => ({ ...f, title_ar: e.target.value })); }}
        className="h-10"
        placeholder={isRTL ? 'يتكوّن تلقائياً من اسم الموقع + التخصص — قابل للتعديل' : 'Auto-composed from site + specialty — editable'}
      />
    </div>

    {/* Description */}
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <Label className="text-xs">{isRTL ? 'نطاق العمل' : 'Scope of work'}</Label>
        <FieldAiActions value={form.description_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, description_ar: v }))} fieldType="description" />
      </div>
      <Textarea
        value={form.description_ar}
        onChange={e => { descTouched.current = true; setForm(f => ({ ...f, description_ar: e.target.value })); }}
        rows={3}
        className="text-xs"
        placeholder={isRTL ? 'يُصاغ تلقائياً من اسم الموقع + التخصص — قابل للتعديل' : 'Auto-composed from site + specialty — editable'}
      />
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
        <div className="flex items-center justify-between gap-1">
          <Label className="text-xs">{isRTL ? 'الانتهاء' : 'End'}</Label>
          <div className="inline-flex rounded-md border border-border/60 p-0.5 text-[10px]">
            <Button
              type="button" size="sm" variant={endMode === 'date' ? 'default' : 'ghost'}
              className="h-5 px-1.5 text-[10px]"
              onClick={() => setEndMode('date')}
            >{isRTL ? 'تاريخ' : 'Date'}</Button>
            <Button
              type="button" size="sm" variant={endMode === 'duration' ? 'default' : 'ghost'}
              className="h-5 px-1.5 text-[10px]"
              onClick={() => setEndMode('duration')}
            >{isRTL ? 'مدة (أيام)' : 'Days'}</Button>
          </div>
        </div>
        {endMode === 'date' ? (
          <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} dir="ltr" className="h-10" />
        ) : (
          <Input
            type="number" min={1} value={durationDays}
            onChange={e => setDurationDays(e.target.value)}
            dir="ltr" className="h-10"
            placeholder={isRTL ? 'عدد الأيام' : 'Number of days'}
          />
        )}
        {(dateError || durationError) && (
          <p role="alert" data-testid="contract-date-error" className="text-[11px] text-destructive mt-1">
            {dateError || durationError}
          </p>
        )}
      </div>
    </div>
  </>
  );
};

export default ContractDetailsSection;