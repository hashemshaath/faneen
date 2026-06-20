import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { OPPORTUNITY_LABELS } from '../opportunityLabels';
import { getAssignmentStatusLabel } from '../status';
import {
  getMyBidForOpportunity,
  submitOpportunityBid,
  withdrawOpportunityBid,
} from './services';

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">جارٍ التحميل...</CardContent>
      </Card>
    );
  }

  if (existing) {
    const statusLabel = getAssignmentStatusLabel(existing.status).ar;
    const canWithdraw = ['submitted', 'draft', 'revised'].includes(existing.status);
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-base font-semibold">{OPPORTUNITY_LABELS.submitBid.ar}</div>
            <Badge variant="outline">{statusLabel}</Badge>
          </div>
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
        </CardContent>
      </Card>
    );
  }

  if (!formOpen) {
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
        <div className="text-base font-semibold">{OPPORTUNITY_LABELS.submitBid.ar}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>السعر (ريال)</Label>
            <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>المدة (يوم)</Label>
            <Input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
          </div>
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
          <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending} className="min-h-[44px]">
            {submitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Send className="h-4 w-4 me-1" />}
            تقديم
          </Button>
          <Button variant="ghost" onClick={() => setFormOpen(false)} className="min-h-[44px]">
            إلغاء
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};