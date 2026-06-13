/**
 * Presentational form: mark a membership payment as refunded manually.
 * Pure UI — values + handlers come from parent. No Supabase, no mutations.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { pickBi } from '@/components/common/Bilingual';

export interface PaymentRefundFormProps {
  isRTL: boolean;
  intentId: string;
  refundReference: string;
  refundedAt: string;
  refundNotes: string;
  submitting: boolean;
  canSubmit: boolean;
  onRefundReferenceChange: (value: string) => void;
  onRefundedAtChange: (value: string) => void;
  onRefundNotesChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const PaymentRefundForm: React.FC<PaymentRefundFormProps> = ({
  isRTL,
  intentId,
  refundReference,
  refundedAt,
  refundNotes,
  submitting,
  canSubmit,
  onRefundReferenceChange,
  onRefundedAtChange,
  onRefundNotesChange,
  onCancel,
  onSubmit,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {pickBi(isRTL, 'تسجيل استرداد يدوي', 'Mark refunded manually')}
          <span className="ms-2 text-xs font-mono text-muted-foreground">{intentId.slice(0, 8)}…</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {pickBi(isRTL, 'يسجل هذا الإجراء استرداداً يدوياً أو إشعار دائن للدفعة. لا يتم استدعاء بوابة الدفع.', 'This records a manual refund or credit-note for the payment. No payment gateway is contacted.')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="refund-ref">{pickBi(isRTL, 'مرجع الاسترداد', 'Refund reference')}</Label>
            <Input
              id="refund-ref"
              dir="auto"
              value={refundReference}
              onChange={(e) => onRefundReferenceChange(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refunded-at">{pickBi(isRTL, 'تاريخ الاسترداد', 'Refunded at')}</Label>
            <Input
              id="refunded-at"
              type="datetime-local"
              value={refundedAt}
              onChange={(e) => onRefundedAtChange(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="refund-notes">{pickBi(isRTL, 'ملاحظات', 'Notes')}</Label>
            <Textarea
              id="refund-notes"
              dir="auto"
              value={refundNotes}
              onChange={(e) => onRefundNotesChange(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            {pickBi(isRTL, 'إلغاء', 'Cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !canSubmit}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {pickBi(isRTL, 'تسجيل الاسترداد', 'Mark refunded')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentRefundForm;