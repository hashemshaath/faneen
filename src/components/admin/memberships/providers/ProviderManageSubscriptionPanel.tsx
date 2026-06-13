/**
 * Phase 7G — Presentational panel for managing a single provider
 * subscription (plan/status, grant, adjust, refund, recent tx).
 * Pure UI: no Supabase, no queries, no mutations, no RPCs. All
 * values, setters, and submit handlers are passed from the parent.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Undo2 } from 'lucide-react';
import { TierChip } from '@/components/admin/memberships/shared';
import { ProviderCreditActionCard } from './ProviderCreditActionCard';

export interface ProviderManageSubscriptionPanelPlan {
  id: string;
  name_ar: string;
  lead_credits_per_month: number;
}

export interface ProviderManageSubscriptionPanelTx {
  id: string;
  type: 'grant' | 'consume' | 'refund' | 'adjustment';
  amount: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

export interface ProviderManageSubscriptionPanelSubject {
  businessName: string | null;
  businessRefId: string | null;
  membershipTier: string | null;
  currentPlanId: string;
  currentStatus: string;
}

export interface ProviderManageSubscriptionPanelProps {
  subject: ProviderManageSubscriptionPanelSubject;
  plans: ProviderManageSubscriptionPanelPlan[];
  statusLabel: Record<string, string>;
  reasonLabel: Record<string, string>;
  typeLabel: Record<string, string>;

  // Plan / status section
  planId: string;
  status: string;
  onPlanIdChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onSavePlanStatus: () => void;
  isSavePlanStatusPending: boolean;

  // Grant section
  grantAmount: string;
  grantNote: string;
  onGrantAmountChange: (v: string) => void;
  onGrantNoteChange: (v: string) => void;
  onGrant: () => void;
  isGrantPending: boolean;

  // Adjust section
  adjustTo: string;
  adjustNote: string;
  onAdjustToChange: (v: string) => void;
  onAdjustNoteChange: (v: string) => void;
  onAdjust: () => void;
  isAdjustPending: boolean;

  // Refund section
  refundAmount: string;
  refundLeadId: string;
  refundNote: string;
  onRefundAmountChange: (v: string) => void;
  onRefundLeadIdChange: (v: string) => void;
  onRefundNoteChange: (v: string) => void;
  onRefund: () => void;
  isRefundPending: boolean;

  // Recent transactions
  recentTx: ProviderManageSubscriptionPanelTx[];
  isRecentTxLoading: boolean;
}

export const ProviderManageSubscriptionPanel: React.FC<ProviderManageSubscriptionPanelProps> = ({
  subject,
  plans,
  statusLabel,
  reasonLabel,
  typeLabel,
  planId,
  status,
  onPlanIdChange,
  onStatusChange,
  onSavePlanStatus,
  isSavePlanStatusPending,
  grantAmount,
  grantNote,
  onGrantAmountChange,
  onGrantNoteChange,
  onGrant,
  isGrantPending,
  adjustTo,
  adjustNote,
  onAdjustToChange,
  onAdjustNoteChange,
  onAdjust,
  isAdjustPending,
  refundAmount,
  refundLeadId,
  refundNote,
  onRefundAmountChange,
  onRefundLeadIdChange,
  onRefundNoteChange,
  onRefund,
  isRefundPending,
  recentTx,
  isRecentTxLoading,
}) => {
  const saveDisabled =
    isSavePlanStatusPending || (planId === subject.currentPlanId && status === subject.currentStatus);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm">{subject.businessName ?? '—'}</h3>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {subject.businessRefId && (
            <span className="text-[10px] tech-content px-1.5 py-0.5 rounded border border-border bg-muted/40">
              {subject.businessRefId}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">عضوية المنصة:</span>
          <TierChip tier={subject.membershipTier ?? 'free'} isRTL={true} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">الخطة</Label>
        <Select value={planId} onValueChange={onPlanIdChange}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name_ar} · {p.lead_credits_per_month} فرصة/شهر
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="text-xs">الحالة</Label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['active', 'paused', 'expired', 'cancelled'] as const).map((s) => (
              <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="w-full h-9 text-xs"
          onClick={onSavePlanStatus}
          disabled={saveDisabled}
        >
          حفظ التغييرات
        </Button>
      </div>

      <ProviderCreditActionCard
        title="إضافة رصيد يدوي"
        icon={<Wallet className="h-3 w-3" />}
        actionLabel="إضافة"
        onAction={onGrant}
        disabled={isGrantPending || !grantAmount}
      >
        <Input
          type="number"
          min={1}
          value={grantAmount}
          onChange={(e) => onGrantAmountChange(e.target.value)}
          placeholder="عدد الفرص"
          className="h-9 text-xs tech-content"
        />
        <Textarea
          rows={2}
          value={grantNote}
          onChange={(e) => onGrantNoteChange(e.target.value)}
          placeholder="ملاحظة (اختياري)"
          className="text-xs"
        />
      </ProviderCreditActionCard>

      <ProviderCreditActionCard
        title="تعديل الرصيد إلى قيمة محددة"
        actionLabel="تطبيق التعديل"
        onAction={onAdjust}
        disabled={isAdjustPending}
      >
        <Input
          type="number"
          min={0}
          value={adjustTo}
          onChange={(e) => onAdjustToChange(e.target.value)}
          className="h-9 text-xs tech-content"
        />
        <Textarea
          rows={2}
          value={adjustNote}
          onChange={(e) => onAdjustNoteChange(e.target.value)}
          placeholder="سبب التعديل (اختياري)"
          className="text-xs"
        />
      </ProviderCreditActionCard>

      <ProviderCreditActionCard
        title="استرجاع رصيد"
        icon={<Undo2 className="h-3 w-3" />}
        actionLabel="استرجاع"
        onAction={onRefund}
        disabled={isRefundPending || !refundAmount || !refundNote.trim()}
      >
        <Input
          type="number"
          min={1}
          value={refundAmount}
          onChange={(e) => onRefundAmountChange(e.target.value)}
          placeholder="عدد الفرص المسترجعة"
          className="h-9 text-xs tech-content"
        />
        <Input
          value={refundLeadId}
          onChange={(e) => onRefundLeadIdChange(e.target.value)}
          placeholder="معرف الفرصة (اختياري)"
          className="h-9 text-xs tech-content"
        />
        <Textarea
          rows={2}
          value={refundNote}
          onChange={(e) => onRefundNoteChange(e.target.value)}
          placeholder="السبب (مطلوب)"
          className="text-xs"
        />
      </ProviderCreditActionCard>

      <div className="border-t pt-4 space-y-2">
        <Label className="text-xs">آخر 10 حركات رصيد</Label>
        {isRecentTxLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : recentTx.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">لا توجد حركات.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {recentTx.map((t) => (
              <div
                key={t.id}
                className="text-[11px] border border-border rounded-md p-2 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-full border border-border bg-muted/40">
                      {typeLabel[t.type] ?? t.type}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {reasonLabel[t.reason] ?? t.reason}
                    </span>
                  </div>
                  <div className="text-muted-foreground tech-content mt-0.5">
                    {new Date(t.created_at).toLocaleString('en-US')}
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <div
                    className={`tech-content font-medium ${t.amount > 0 ? 'text-success' : t.amount < 0 ? 'text-destructive' : ''}`}
                  >
                    {t.amount > 0 ? `+${t.amount}` : t.amount}
                  </div>
                  <div className="text-muted-foreground tech-content">رصيد: {t.balance_after}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderManageSubscriptionPanel;