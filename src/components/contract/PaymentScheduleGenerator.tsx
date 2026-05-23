/**
 * PaymentScheduleGenerator (C3B) — inline schedule builder for a contract.
 *
 * Pure planning UX. Does NOT touch payment confirmation, gateways, or status.
 * Inserts a new `installment_plans` row + N `installment_payments` rows
 * (status='pending'). Provider-only (RLS already enforces this; the UI just
 * mirrors that to keep clients from seeing a useless button).
 *
 * Replacement of an existing schedule is intentionally NOT implemented in
 * C3B — generation is gated on "no plan exists". Replacement is documented
 * as future work (C3D/C3F) so we never need to mass-delete payment rows.
 */
import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CalendarPlus, ListChecks, AlertTriangle, Plus, Trash2, Wand2 } from 'lucide-react';
import {
  PAYMENT_PRESETS,
  type PaymentPreset,
  generatePaymentSchedule,
  validatePercentageSum,
  formatMoney,
} from '@/lib/contract-financials';

interface MilestoneLite {
  id: string;
  title_ar?: string | null;
  title_en?: string | null;
  status?: string | null;
}

interface Props {
  contractId: string;
  totalAmount: number;
  currency: string;
  milestones: MilestoneLite[];
  hasExistingPlan: boolean;
  isProvider: boolean;
  isLocked: boolean;
}

interface RowState {
  percentage: string;
  title_ar: string;
  title_en: string;
  due_date: string;
  milestone_id: string; // '' = unlinked
}

const presetToRows = (p: PaymentPreset, startISO: string): RowState[] => {
  const start = new Date(startISO);
  return p.rows.map((r) => {
    const d = new Date(start);
    d.setDate(d.getDate() + (r.dayOffset ?? 0));
    return {
      percentage: String(r.percentage),
      title_ar: r.title_ar,
      title_en: r.title_en,
      due_date: d.toISOString().slice(0, 10),
      milestone_id: '',
    };
  });
};

export const PaymentScheduleGenerator: React.FC<Props> = ({
  contractId,
  totalAmount,
  currency,
  milestones,
  hasExistingPlan,
  isProvider,
  isLocked,
}) => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [open, setOpen] = useState(false);
  const [presetId, setPresetId] = useState<PaymentPreset['id']>('30_40_30');
  const [rows, setRows] = useState<RowState[]>(() => presetToRows(PAYMENT_PRESETS[0], today));

  const safeCurrency = (currency || 'SAR').toUpperCase();

  const sumValidation = useMemo(
    () => validatePercentageSum(rows.map((r) => r.percentage)),
    [rows],
  );

  const generated = useMemo(
    () =>
      generatePaymentSchedule({
        totalAmount,
        rows: rows.map((r) => ({
          percentage: Number(r.percentage) || 0,
          title_ar: r.title_ar,
          title_en: r.title_en,
        })),
        dueDates: rows.map((r) => r.due_date),
        milestoneIds: rows.map((r) => (r.milestone_id ? r.milestone_id : null)),
      }),
    [totalAmount, rows],
  );

  const totalCheck = useMemo(() => {
    const sum = generated.reduce((s, r) => s + r.amount, 0);
    return { sum: Math.round(sum * 100) / 100, matches: Math.abs(sum - totalAmount) <= 0.01 };
  }, [generated, totalAmount]);

  // Duplicate milestone selections (excluding empty/unlinked)
  const duplicateMilestones = useMemo(() => {
    const seen = new Map<string, number>();
    rows.forEach((r) => {
      if (r.milestone_id) seen.set(r.milestone_id, (seen.get(r.milestone_id) ?? 0) + 1);
    });
    return Array.from(seen.values()).some((n) => n > 1);
  }, [rows]);

  const applyPreset = (id: PaymentPreset['id']) => {
    setPresetId(id);
    if (id === 'custom') return; // keep current rows for editing
    const p = PAYMENT_PRESETS.find((x) => x.id === id);
    if (p) setRows(presetToRows(p, today));
  };

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setPresetId('custom');
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { percentage: '0', title_ar: 'دفعة', title_en: 'Payment', due_date: today, milestone_id: '' },
    ]);
    setPresetId('custom');
  };

  const removeRow = (idx: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
    setPresetId('custom');
  };

  const canSubmit =
    isProvider &&
    !isLocked &&
    !hasExistingPlan &&
    sumValidation.isValid &&
    !duplicateMilestones &&
    totalAmount > 0 &&
    generated.length > 0 &&
    totalCheck.matches;

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1) plan
      const { data: plan, error: planErr } = await createInstallmentPlan<{ id: string }>({
        contract_id: contractId,
        total_amount: totalAmount,
        number_of_installments: generated.length,
        installment_amount: generated[0]?.amount ?? 0,
        currency_code: safeCurrency,
        start_date: generated[0]?.due_date ?? today,
        status: 'active',
      });
      if (planErr) throw planErr;

      // 2) payments (status='pending' — never auto-mark paid)
      const payload = generated.map((g) => ({
        plan_id: plan.id,
        installment_number: g.installment_number,
        amount: g.amount,
        due_date: g.due_date,
        status: 'pending' as const,
        milestone_id: g.milestone_id,
        notes: isRTL ? g.title_ar : g.title_en,
      }));
      const { error: payErr } = await createInstallmentPayments(payload);
      if (payErr) throw payErr;
    },
    onSuccess: () => {
      toast({ title: isRTL ? 'تم إنشاء جدول الدفعات' : 'Payment schedule created' });
      queryClient.invalidateQueries({ queryKey: ['installment-plans', contractId] });
      queryClient.invalidateQueries({ queryKey: ['installment-payments'] });
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : isRTL ? 'فشل الإنشاء' : 'Creation failed';
      toast({ title: isRTL ? 'تعذّر إنشاء الجدول' : 'Could not create schedule', description: msg, variant: 'destructive' });
    },
  });

  if (!isProvider) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-5 sm:mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4 text-accent" />
          <h3 className="font-heading font-bold text-sm">
            {isRTL ? 'إنشاء جدول دفعات' : 'Create Payment Schedule'}
          </h3>
        </div>
        {!open && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isLocked || hasExistingPlan || totalAmount <= 0}
            onClick={() => setOpen(true)}
          >
            <Wand2 className="w-3.5 h-3.5" />
            {isRTL ? 'إنشاء جدول دفعات' : 'Generate schedule'}
          </Button>
        )}
      </div>

      {hasExistingPlan && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 dark:bg-warning/15 p-3">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-[11px] text-warning font-body leading-relaxed">
            {isRTL
              ? 'يوجد جدول دفعات حالي لهذا العقد. سيؤدي إنشاء جدول جديد إلى استبدال جدول الدفعات الحالي — هذه الخاصية غير مفعّلة بعد لحماية السجلات.'
              : 'A payment schedule already exists. Replacing it is disabled in this release to protect existing records.'}
          </p>
        </div>
      )}

      {totalAmount <= 0 && !hasExistingPlan && (
        <p className="mt-3 text-[11px] text-muted-foreground font-body">
          {isRTL ? 'حدد قيمة العقد أولاً لإنشاء جدول الدفعات.' : 'Set a contract total before creating a schedule.'}
        </p>
      )}

      {open && !hasExistingPlan && totalAmount > 0 && (
        <div className="mt-4 space-y-4">
          {/* Preset chips */}
          <div className="flex flex-wrap gap-2">
            {PAYMENT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-3 h-8 rounded-full text-[11px] font-body border transition-colors ${
                  presetId === p.id
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-background border-border text-foreground hover:bg-muted/40'
                }`}
              >
                {isRTL ? p.label_ar : p.label_en}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPresetId('custom')}
              className={`px-3 h-8 rounded-full text-[11px] font-body border transition-colors ${
                presetId === 'custom'
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background border-border text-foreground hover:bg-muted/40'
              }`}
            >
              {isRTL ? 'مخصص' : 'Custom'}
            </button>
          </div>

          {/* Empty milestone hint */}
          {milestones.length === 0 && (
            <p className="text-[11px] text-muted-foreground font-body italic">
              {isRTL
                ? 'أضف مراحل العمل أولاً لربطها بالدفعات.'
                : 'Add project milestones first to link them to payments.'}
            </p>
          )}

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((r, idx) => {
              const amount = generated[idx]?.amount ?? 0;
              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end rounded-lg border border-border bg-background p-3"
                >
                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-muted-foreground font-body block mb-1">
                      {isRTL ? 'العنوان' : 'Title'}
                    </label>
                    <Input
                      value={isRTL ? r.title_ar : r.title_en}
                      onChange={(e) =>
                        updateRow(idx, isRTL ? { title_ar: e.target.value } : { title_en: e.target.value })
                      }
                      className="h-9 text-xs"
                      maxLength={120}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-muted-foreground font-body block mb-1">
                      {isRTL ? 'النسبة %' : 'Percent %'}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={r.percentage}
                      onChange={(e) => updateRow(idx, { percentage: e.target.value })}
                      className="h-9 text-xs tech-content"
                      dir="ltr"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-muted-foreground font-body block mb-1">
                      {isRTL ? 'المبلغ' : 'Amount'}
                    </label>
                    <div className="h-9 px-3 rounded-md border border-input bg-muted/30 flex items-center text-xs tech-content" dir="ltr">
                      {formatMoney(amount, safeCurrency)}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-muted-foreground font-body block mb-1">
                      {isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}
                    </label>
                    <Input
                      type="date"
                      value={r.due_date}
                      onChange={(e) => updateRow(idx, { due_date: e.target.value })}
                      className="h-9 text-xs"
                      dir="ltr"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-muted-foreground font-body block mb-1">
                      {isRTL ? 'ربط بمرحلة' : 'Link milestone'}
                    </label>
                    <Select
                      value={r.milestone_id || '__none__'}
                      onValueChange={(v) => updateRow(idx, { milestone_id: v === '__none__' ? '' : v })}
                      disabled={milestones.length === 0}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={isRTL ? 'غير مرتبط' : 'Unlinked'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{isRTL ? 'غير مرتبط' : 'Unlinked'}</SelectItem>
                        {milestones.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {(isRTL ? m.title_ar : m.title_en || m.title_ar) || (isRTL ? 'مرحلة' : 'Milestone')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-1 flex sm:justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow(idx)}
                      disabled={rows.length <= 1}
                      aria-label={isRTL ? 'حذف الدفعة' : 'Remove payment'}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={addRow}>
              <Plus className="w-3.5 h-3.5" />
              {isRTL ? 'إضافة دفعة' : 'Add payment'}
            </Button>
            <div className="flex items-center gap-2 text-[11px] font-body">
              <Badge variant={sumValidation.isValid ? 'outline' : 'destructive'} className="tech-content" dir="ltr">
                {sumValidation.sum.toFixed(2)}% / 100%
              </Badge>
              <Badge variant={totalCheck.matches ? 'outline' : 'destructive'} className="tech-content" dir="ltr">
                {formatMoney(totalCheck.sum, safeCurrency)} / {formatMoney(totalAmount, safeCurrency)}
              </Badge>
              {duplicateMilestones && (
                <Badge variant="destructive">
                  {isRTL ? 'مرحلة مكررة' : 'Duplicate milestone'}
                </Badge>
              )}
            </div>
          </div>

          {(!sumValidation.isValid || !totalCheck.matches || duplicateMilestones) && (
            <p className="text-[11px] text-destructive font-body flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {!sumValidation.isValid
                ? isRTL
                  ? 'يجب أن يكون مجموع النسب 100% بدون قيم سالبة.'
                  : 'Percentages must sum to 100% with no negatives.'
                : !totalCheck.matches
                  ? isRTL
                    ? 'مجموع المبالغ لا يطابق إجمالي العقد.'
                    : 'Amounts do not match contract total.'
                  : isRTL
                    ? 'لا يمكن ربط أكثر من دفعة بنفس المرحلة.'
                    : 'A milestone can only be linked once.'}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <ListChecks className="w-3.5 h-3.5" />
              {createMutation.isPending
                ? isRTL ? 'جارٍ الإنشاء...' : 'Creating...'
                : isRTL ? 'إنشاء الجدول' : 'Create schedule'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentScheduleGenerator;