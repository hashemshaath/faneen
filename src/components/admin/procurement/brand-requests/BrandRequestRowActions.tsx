/**
 * Presentational action cluster for an admin brand-request row.
 *
 * Pure UI — no Supabase, no queries, no mutations, no services. All
 * intents (view / approve / reject / set in review / needs more info)
 * are dispatched via parent-owned callbacks. Visibility of each action
 * is computed from the request status only.
 */
import React from 'react';
import { Check, Eye, Loader2, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BrandRequestRowActionsProps {
  status: string | null | undefined;
  isRTL?: boolean;
  busy?: boolean;
  expanded?: boolean;
  onView?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onSetInReview?: () => void;
  onNeedsInfo?: () => void;
  layout?: 'row' | 'stack';
  className?: string;
}

export const BrandRequestRowActions: React.FC<BrandRequestRowActionsProps> = ({
  status,
  isRTL = true,
  busy = false,
  expanded = false,
  onView,
  onApprove,
  onReject,
  onSetInReview,
  onNeedsInfo,
  layout = 'row',
  className,
}) => {
  const isTerminal = status === 'approved' || status === 'rejected';
  const wrap = cn(
    layout === 'stack' ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-2',
    className,
  );
  return (
    <div className={wrap} data-testid="brand-request-row-actions">
      {onView ? (
        <Button size="sm" variant="outline" onClick={onView} type="button">
          <Eye className="w-4 h-4 me-1" />
          {expanded ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'مراجعة' : 'Review')}
        </Button>
      ) : null}
      {!isTerminal && status === 'pending' && onSetInReview ? (
        <Button size="sm" variant="outline" onClick={onSetInReview} disabled={busy} type="button">
          {busy ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Eye className="w-4 h-4 me-1" />}
          {isRTL ? 'قيد المراجعة' : 'Mark in review'}
        </Button>
      ) : null}
      {!isTerminal && onNeedsInfo ? (
        <Button size="sm" variant="outline" onClick={onNeedsInfo} disabled={busy} type="button">
          <MessageSquare className="w-4 h-4 me-1" />
          {isRTL ? 'يحتاج معلومات' : 'Needs more info'}
        </Button>
      ) : null}
      {!isTerminal && onApprove ? (
        <Button size="sm" onClick={onApprove} disabled={busy} type="button">
          <Check className="w-4 h-4 me-1" />
          {isRTL ? 'اعتماد' : 'Approve'}
        </Button>
      ) : null}
      {!isTerminal && onReject ? (
        <Button size="sm" variant="destructive" onClick={onReject} disabled={busy} type="button">
          <X className="w-4 h-4 me-1" />
          {isRTL ? 'رفض' : 'Reject'}
        </Button>
      ) : null}
    </div>
  );
};

export default BrandRequestRowActions;