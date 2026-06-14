import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * ShowcaseRowActions — presentational approve/reject row actions for
 * AdminShowcase cards. Owns NO mutations; the caller passes callbacks
 * and the rejection-reason value/onChange. Pure UI.
 */
export interface ShowcaseRowActionsProps {
  status: 'pending' | 'approved' | 'rejected';
  reasonValue: string;
  onReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  approveDisabled?: boolean;
  rejectDisabled?: boolean;
  reasonPlaceholder?: string;
  approveLabel?: string;
  rejectLabel?: string;
  reopenLabel?: string;
}

export const ShowcaseRowActions: React.FC<ShowcaseRowActionsProps> = ({
  status,
  reasonValue,
  onReasonChange,
  onApprove,
  onReject,
  approveDisabled,
  rejectDisabled,
  reasonPlaceholder = 'سبب الرفض (مطلوب للرفض)',
  approveLabel = 'اعتماد',
  rejectLabel = 'رفض',
  reopenLabel = 'إعادة للمراجعة (رفض)',
}) => {
  if (status === 'pending') {
    return (
      <>
        <Input
          placeholder={reasonPlaceholder}
          value={reasonValue}
          onChange={(e) => onReasonChange(e.target.value)}
          className="h-8 text-xs"
          dir="auto"
        />
        <div className="flex gap-2">
          <Button size="sm" className="gap-1 flex-1" onClick={onApprove} disabled={approveDisabled}>
            <Check className="w-3.5 h-3.5" /> {approveLabel}
          </Button>
          <Button size="sm" variant="destructive" className="gap-1 flex-1" onClick={onReject} disabled={rejectDisabled}>
            <X className="w-3.5 h-3.5" /> {rejectLabel}
          </Button>
        </div>
      </>
    );
  }
  if (status === 'approved') {
    return (
      <Button size="sm" variant="outline" className="w-full" onClick={onReject}>
        {reopenLabel}
      </Button>
    );
  }
  return null;
};

export default ShowcaseRowActions;