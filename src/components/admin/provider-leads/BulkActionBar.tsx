/**
 * Sticky bulk-action bar — appears when one or more leads are selected.
 * No popups: every action runs inline via the parent's async handlers.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Bi } from '@/components/common/Bilingual';

interface Props {
  count: number;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onNeedsInfo: () => void;
  onUnderReview: () => void;
  onClear: () => void;
}

export const BulkActionBar: React.FC<Props> = ({
  count,
  busy,
  onApprove,
  onReject,
  onNeedsInfo,
  onUnderReview,
  onClear,
}) => {
  if (count === 0) return null;
  return (
    <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5 shadow-sm backdrop-blur">
      <span className="text-sm font-semibold text-primary">
        <Bi ar={`المحدد: ${count}`} en={`Selected: ${count}`} />
      </span>
      <div className="ms-auto flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={onUnderReview}
          disabled={busy}
          className="h-8 rounded-lg text-[11px]"
        >
          <ShieldCheck className="me-1 h-3.5 w-3.5" aria-hidden />
          قيد المراجعة
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onNeedsInfo}
          disabled={busy}
          className="h-8 rounded-lg text-[11px]"
        >
          <AlertTriangle className="me-1 h-3.5 w-3.5" aria-hidden />
          يحتاج بيانات
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={busy}
          className="h-8 rounded-lg border-destructive/30 text-destructive text-[11px] hover:bg-destructive/10"
        >
          <XCircle className="me-1 h-3.5 w-3.5" aria-hidden />
          رفض
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          disabled={busy}
          className="h-8 rounded-lg bg-success text-success-foreground text-[11px] hover:bg-success/90"
        >
          {busy ? (
            <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="me-1 h-3.5 w-3.5" aria-hidden />
          )}
          اعتماد
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={busy}
          className="h-8 rounded-lg text-[11px]"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
};