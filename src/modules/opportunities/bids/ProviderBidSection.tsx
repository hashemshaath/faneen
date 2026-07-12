import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { OPPORTUNITY_LABELS } from '../opportunityLabels';
import { getAssignmentStatusLabel } from '../status';
import {
  getMyBidForOpportunity,
  submitOpportunityBid,
  submitRevisedBid,
  withdrawOpportunityBid,
} from './services';
import type { BidPriceBreakdownItem } from './types';
import { ClarificationThread } from '../clarifications';

const PAYMENT_TERMS_PRESETS = [
  'دفعة واحدة عند التسليم',
  '50% مقدم و50% عند التسليم',
  'دفعات مرحلية',
  'أخرى',
] as const;

const defaultValidUntil = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};

const sumBreakdown = (items: BidPriceBreakdownItem[]): number =>
  items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

interface Props {
  opportunityId: string;
  assignmentId?: string | null;
  providerBusinessId?: string | null;
}

/**
 * Provider-facing «تقديم عرض» inline section.
 * Renders inside ProviderLeadDetails. No popup, no award action.
 */
export const ProviderBidSection: React.FC<Props> = ({
  opportunityId,
  assignmentId,
  providerBusinessId,
}) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [scope, setScope] = useState('');
  const [terms, setTerms] = useState('');
  const [warranty, setWarranty] = useState('');
  const [paymentPreset, setPaymentPreset] = useState<string>(PAYMENT_TERMS_PRESETS[0]);
  const [paymentOther, setPaymentOther] = useState('');
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [vatInclusive, setVatInclusive] = useState(true);
  const [breakdown, setBreakdown] = useState<BidPriceBreakdownItem[]>([]);
  const [priceManuallyOverridden, setPriceManuallyOverridden] = useState(false);

  const breakdownTotal = sumBreakdown(breakdown);
  const priceMismatch =
    breakdown.length > 0 && Number(price) > 0 &&
    Math.abs(Number(price) - breakdownTotal) > 0.01;

  const { data: existing, isLoading } = useQuery({
    queryKey: ['opportunity-bid-mine', opportunityId, user?.id],
    enabled: !!opportunityId && !!user?.id,
    queryFn: () => getMyBidForOpportunity(opportunityId, user!.id),
  });

  const submitMut = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('not authenticated');
      const priceNumber = Number(price);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        throw new Error('السعر مطلوب');
      }
      const paymentTerms =
        paymentPreset === 'أخرى' ? paymentOther.trim() || null : paymentPreset;
      const validUntilIso = validUntil
        ? new Date(`${validUntil}T23:59:59`).toISOString()
        : null;
      return submitOpportunityBid({
        opportunityId,
        assignmentId: assignmentId ?? null,
        providerBusinessId: providerBusinessId ?? null,
        submittedBy: user.id,
        priceAmount: priceNumber,
        durationValue: durationDays ? Number(durationDays) : null,
        durationUnit: durationDays ? 'day' : null,
        scopeSummary: scope || null,
        terms: terms || null,
        warranty: warranty || null,
        paymentTerms,
        validUntil: validUntilIso,
        vatInclusive,
        priceBreakdown: breakdown.length > 0 ? breakdown : null,
      });
    },
    onSuccess: () => {
      toast.success(OPPORTUNITY_LABELS.submitBid.ar);
      setFormOpen(false);
      qc.invalidateQueries({ queryKey: ['opportunity-bid-mine', opportunityId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'تعذر تقديم العرض');
    },
  });

  const withdrawMut = useMutation({
    mutationFn: (id: string) => withdrawOpportunityBid(id),
    onSuccess: () => {
      toast.success('تم سحب العرض');
      qc.invalidateQueries({ queryKey: ['opportunity-bid-mine', opportunityId] });
    },
  });

  const [revising, setRevising] = useState(false);
  const reviseMut = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('not authenticated');
      if (!existing) throw new Error('no existing bid');
      const priceNumber = Number(price);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) throw new Error('السعر مطلوب');
      const paymentTerms =
        paymentPreset === 'أخرى' ? paymentOther.trim() || null : paymentPreset;
      const validUntilIso = validUntil
        ? new Date(`${validUntil}T23:59:59`).toISOString()
        : null;
      return submitRevisedBid(existing.id, {
        opportunityId,
        assignmentId: assignmentId ?? null,
        providerBusinessId: providerBusinessId ?? null,
        submittedBy: user.id,
        priceAmount: priceNumber,
        durationValue: durationDays ? Number(durationDays) : null,
        durationUnit: durationDays ? 'day' : null,
        scopeSummary: scope || null,
        terms: terms || null,
        warranty: warranty || null,
        paymentTerms,
        validUntil: validUntilIso,
        vatInclusive,
        priceBreakdown: breakdown.length > 0 ? breakdown : null,
      });
    },
    onSuccess: () => {
      toast.success('تم تقديم العرض المعدّل');
      setRevising(false);
      qc.invalidateQueries({ queryKey: ['opportunity-bid-mine', opportunityId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'تعذر تقديم العرض المعدّل');
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">جارٍ التحميل...</CardContent>
      </Card>
    );
  }

  if (existing && !revising) {
    const statusLabel = getAssignmentStatusLabel(existing.status).ar;
    const canWithdraw = ['submitted', 'draft', 'revised'].includes(existing.status);
    const isAwarded = existing.status === 'awarded';
    const revisionRequested = existing.status === 'revision_requested';
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-base font-semibold">{OPPORTUNITY_LABELS.submitBid.ar}</div>
            {isAwarded ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                تم تعميد عرضك
              </Badge>
            ) : revisionRequested ? (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white">طُلب تعديل</Badge>
            ) : (
              <Badge variant="outline">{statusLabel}</Badge>
            )}
          </div>
          {revisionRequested && !revising && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-2">
              <div className="text-sm font-semibold">طلب العميل تعديل عرضك</div>
              {existing.revision_reason && (
                <p className="text-sm whitespace-pre-wrap">{existing.revision_reason}</p>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setPrice(String(existing.price_amount ?? ''));
                  setDurationDays(existing.duration_value ? String(existing.duration_value) : '');
                  setScope(existing.scope_summary ?? '');
                  setTerms(existing.terms ?? '');
                  setWarranty(existing.warranty ?? '');
                  setPaymentPreset(
                    (PAYMENT_TERMS_PRESETS as readonly string[]).includes(existing.payment_terms ?? '')
                      ? (existing.payment_terms as string)
                      : 'أخرى',
                  );
                  setPaymentOther(existing.payment_terms ?? '');
                  setValidUntil(
                    existing.valid_until
                      ? new Date(existing.valid_until).toISOString().slice(0, 10)
                      : defaultValidUntil(),
                  );
                  setVatInclusive(existing.vat_inclusive ?? true);
                  setBreakdown(
                    Array.isArray(existing.price_breakdown)
                      ? (existing.price_breakdown as unknown as BidPriceBreakdownItem[])
                      : [],
                  );
                  setRevising(true);
                }}
              >
                تقديم عرض معدّل
              </Button>
            </div>
          )}
          <div className="text-2xl font-bold tech-content">
            {Number(existing.price_amount ?? 0).toLocaleString()}{' '}
            <span className="text-sm font-normal text-muted-foreground">{existing.currency}</span>
          </div>
          {existing.scope_summary && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{existing.scope_summary}</p>
          )}
          {canWithdraw && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => withdrawMut.mutate(existing.id)}
              disabled={withdrawMut.isPending}
              className="min-h-[40px]"
            >
              <X className="h-4 w-4 me-1" /> سحب العرض
            </Button>
          )}
          <ClarificationThread
            opportunityId={opportunityId}
            bidId={existing.id}
            authorRole="provider"
          />
        </CardContent>
      </Card>
    );
  }

  if (!existing && !formOpen) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground">لم تقدم عرضًا بعد على هذه الفرصة.</div>
          <Button onClick={() => setFormOpen(true)} className="min-h-[44px]">
            <Send className="h-4 w-4 me-1" /> {OPPORTUNITY_LABELS.submitBid.ar}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-base font-semibold">
            {revising ? 'تقديم عرض معدّل' : OPPORTUNITY_LABELS.submitBid.ar}
          </div>
          {revising && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
              تعديل عرض سابق
            </Badge>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>السعر (ريال)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceManuallyOverridden(breakdown.length > 0);
              }}
            />
            {priceMismatch && priceManuallyOverridden && (
              <div className="text-xs text-amber-600">
                تنبيه: السعر يختلف عن مجموع بنود التسعير ({breakdownTotal.toLocaleString()}).
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>المدة (يوم)</Label>
            <Input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>شروط الدفع</Label>
            <select
              value={paymentPreset}
              onChange={(e) => setPaymentPreset(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {PAYMENT_TERMS_PRESETS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {paymentPreset === 'أخرى' && (
              <Input
                placeholder="حدد شروط الدفع"
                value={paymentOther}
                onChange={(e) => setPaymentOther(e.target.value)}
                dir="auto"
              />
            )}
          </div>
          <div className="space-y-1">
            <Label>صلاحية العرض حتى</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={vatInclusive}
            onChange={(e) => setVatInclusive(e.target.checked)}
            className="h-4 w-4"
          />
          السعر شامل ضريبة القيمة المضافة
        </label>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">بنود السعر (اختياري)</div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setBreakdown((prev) => [
                  ...prev,
                  { name: '', quantity: 1, unit: '', unit_price: 0 },
                ])
              }
            >
              <Plus className="h-4 w-4 me-1" /> إضافة بند
            </Button>
          </div>
          {breakdown.length === 0 && (
            <div className="text-xs text-muted-foreground">أضف بنودًا لعرض تفاصيل التسعير للعميل.</div>
          )}
          {breakdown.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start">
              <Input
                className="col-span-4"
                placeholder="البند"
                value={item.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setBreakdown((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                }}
                dir="auto"
              />
              <Input
                className="col-span-2"
                type="number"
                placeholder="الكمية"
                value={item.quantity}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setBreakdown((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: v } : x)));
                }}
              />
              <Input
                className="col-span-2"
                placeholder="الوحدة"
                value={item.unit ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setBreakdown((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: v } : x)));
                }}
                dir="auto"
              />
              <Input
                className="col-span-3"
                type="number"
                placeholder="سعر الوحدة"
                value={item.unit_price}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setBreakdown((prev) => prev.map((x, i) => (i === idx ? { ...x, unit_price: v } : x)));
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="col-span-1 h-10 w-10"
                aria-label="حذف البند"
                onClick={() => setBreakdown((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {breakdown.length > 0 && (
            <div className="flex items-center justify-between text-sm pt-1 border-t">
              <span className="text-muted-foreground">إجمالي البنود</span>
              <span className="tech-content font-semibold">{breakdownTotal.toLocaleString()}</span>
              {!priceManuallyOverridden && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPrice(String(breakdownTotal))}
                >
                  استخدام كسعر إجمالي
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label>ملخص النطاق</Label>
          <Textarea rows={3} value={scope} onChange={(e) => setScope(e.target.value)} dir="auto" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>الشروط</Label>
            <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} dir="auto" />
          </div>
          <div className="space-y-1">
            <Label>الضمان</Label>
            <Textarea rows={2} value={warranty} onChange={(e) => setWarranty(e.target.value)} dir="auto" />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={() => (revising ? reviseMut.mutate() : submitMut.mutate())}
            disabled={revising ? reviseMut.isPending : submitMut.isPending}
            className="min-h-[44px]"
          >
            {(revising ? reviseMut.isPending : submitMut.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin me-1" />
            ) : (
              <Send className="h-4 w-4 me-1" />
            )}
            {revising ? 'تقديم العرض المعدّل' : 'تقديم'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => (revising ? setRevising(false) : setFormOpen(false))}
            className="min-h-[44px]"
          >
            إلغاء
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};