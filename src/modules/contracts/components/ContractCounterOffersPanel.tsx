import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bi } from '@/components/i18n/Bi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Handshake, Check, X, Send, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  listCounterOffers,
  proposeCounterOffer,
  respondToCounterOffer,
  type CounterOffer,
  type CounterOfferStatus,
} from '../services/counterOffers';

interface Props {
  contractId: string;
  canPropose: boolean;
  currentUserId: string | null;
}

const NEGOTIABLE_FIELDS = [
  { path: 'total_amount', ar: 'إجمالي القيمة', en: 'Total amount' },
  { path: 'start_date', ar: 'تاريخ البداية', en: 'Start date' },
  { path: 'end_date', ar: 'تاريخ النهاية', en: 'End date' },
  { path: 'terms_ar', ar: 'الشروط والأحكام', en: 'Terms' },
  { path: 'supervisor_name', ar: 'اسم المشرف', en: 'Supervisor name' },
] as const;

const STATUS_TONE: Record<CounterOfferStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-300/40',
  accepted: 'bg-emerald-500/10 text-emerald-700 border-emerald-300/40',
  rejected: 'bg-rose-500/10 text-rose-700 border-rose-300/40',
  withdrawn: 'bg-muted text-muted-foreground border-border',
};

export function ContractCounterOffersPanel({ contractId, canPropose, currentUserId }: Props) {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [fieldPath, setFieldPath] = useState<string>(NEGOTIABLE_FIELDS[0].path);
  const [newValue, setNewValue] = useState('');
  const [message, setMessage] = useState('');

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['contract-counter-offers', contractId],
    queryFn: () => listCounterOffers(contractId),
  });

  const propose = useMutation({
    mutationFn: () => {
      const field = NEGOTIABLE_FIELDS.find(f => f.path === fieldPath)!;
      return proposeCounterOffer({
        contractId,
        fieldPath: field.path,
        fieldLabelAr: field.ar,
        fieldLabelEn: field.en,
        oldValue: null,
        newValue,
        message: message.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إرسال الاقتراح' : 'Proposal sent');
      setNewValue('');
      setMessage('');
      qc.invalidateQueries({ queryKey: ['contract-counter-offers', contractId] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Failed');
    },
  });

  const respond = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: Exclude<CounterOfferStatus, 'pending'> }) =>
      respondToCounterOffer(id, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-counter-offers', contractId] });
    },
  });

  return (
    <div className="space-y-4">
      {canPropose && (
        <Card className="p-4 surface-card">
          <div className="flex items-center gap-2 mb-3">
            <Handshake className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-medium">
              <Bi ar="اقترح تعديلاً على الطرف الآخر" en="Propose a change to the other party" />
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
              value={fieldPath}
              onChange={(e) => setFieldPath(e.target.value)}
            >
              {NEGOTIABLE_FIELDS.map(f => (
                <option key={f.path} value={f.path}>{isRTL ? f.ar : f.en}</option>
              ))}
            </select>
            <Input
              dir="auto"
              placeholder={isRTL ? 'القيمة المقترحة' : 'Proposed value'}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <Textarea
            dir="auto"
            placeholder={isRTL ? 'سبب الاقتراح (اختياري)' : 'Reason (optional)'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-3 rounded-xl min-h-[80px]"
          />
          <div className="mt-3 flex justify-end">
            <Button
              onClick={() => propose.mutate()}
              disabled={!newValue.trim() || propose.isPending}
              className="h-10 rounded-xl"
            >
              <Send className="w-4 h-4 mx-2" />
              <Bi ar="إرسال الاقتراح" en="Send proposal" />
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <Bi ar="جارٍ التحميل..." en="Loading..." />
        </Card>
      ) : offers.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <Bi ar="لا توجد اقتراحات تعديل" en="No counter offers yet" />
        </Card>
      ) : (
        offers.map((o) => (
          <CounterOfferRow
            key={o.id}
            offer={o}
            currentUserId={currentUserId}
            onAccept={() => respond.mutate({ id: o.id, decision: 'accepted' })}
            onReject={() => respond.mutate({ id: o.id, decision: 'rejected' })}
            onWithdraw={() => respond.mutate({ id: o.id, decision: 'withdrawn' })}
            isPending={respond.isPending}
          />
        ))
      )}
    </div>
  );
}

function CounterOfferRow({
  offer,
  currentUserId,
  onAccept,
  onReject,
  onWithdraw,
  isPending,
}: {
  offer: CounterOffer;
  currentUserId: string | null;
  onAccept: () => void;
  onReject: () => void;
  onWithdraw: () => void;
  isPending: boolean;
}) {
  const { isRTL } = useLanguage();
  const isOwn = offer.proposer_id === currentUserId;
  const canRespond = offer.status === 'pending' && !isOwn && currentUserId;
  const canWithdraw = offer.status === 'pending' && isOwn;

  return (
    <Card className="p-4 surface-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-medium font-heading">
            {isRTL ? offer.field_label_ar : offer.field_label_en}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm tech-content">
            <span className="text-muted-foreground line-through">
              {String(offer.old_value ?? '—')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{String(offer.new_value ?? '')}</span>
          </div>
          {offer.message && (
            <p className="mt-2 text-sm text-muted-foreground" dir="auto">{offer.message}</p>
          )}
        </div>
        <Badge variant="outline" className={STATUS_TONE[offer.status]}>
          {offer.status}
        </Badge>
      </div>
      {(canRespond || canWithdraw) && (
        <div className="mt-3 flex justify-end gap-2">
          {canRespond && (
            <>
              <Button size="sm" variant="outline" onClick={onReject} disabled={isPending} className="h-9 rounded-lg">
                <X className="w-3.5 h-3.5 mx-1" />
                <Bi ar="رفض" en="Reject" />
              </Button>
              <Button size="sm" onClick={onAccept} disabled={isPending} className="h-9 rounded-lg">
                <Check className="w-3.5 h-3.5 mx-1" />
                <Bi ar="قبول" en="Accept" />
              </Button>
            </>
          )}
          {canWithdraw && (
            <Button size="sm" variant="outline" onClick={onWithdraw} disabled={isPending} className="h-9 rounded-lg">
              <Bi ar="سحب الاقتراح" en="Withdraw" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}