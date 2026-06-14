import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Pause, RotateCcw, Pencil, FileClock, Users, Trash2 } from 'lucide-react';
import type { PrivateSectorStatus } from '@/features/private-sectors/types';

export interface PrivateSectorRowActionsProps {
  status: PrivateSectorStatus;
  isRTL: boolean;
  onApprove?: () => void;
  onRejectStart?: () => void;
  onSuspend?: () => void;
  onResetDraft?: () => void;
  onEdit?: () => void;
  onToggleAudit?: () => void;
  onToggleDistributors?: () => void;
  onDelete?: () => void;
}

export const PrivateSectorRowActions: React.FC<PrivateSectorRowActionsProps> = ({
  status, isRTL,
  onApprove, onRejectStart, onSuspend, onResetDraft,
  onEdit, onToggleAudit, onToggleDistributors, onDelete,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {status !== 'approved' && onApprove && (
      <Button size="sm" onClick={onApprove}>
        <CheckCircle2 className="h-4 w-4" /> {isRTL ? 'اعتماد' : 'Approve'}
      </Button>
    )}
    {status !== 'rejected' && onRejectStart && (
      <Button size="sm" variant="destructive" onClick={onRejectStart}>
        <XCircle className="h-4 w-4" /> {isRTL ? 'رفض' : 'Reject'}
      </Button>
    )}
    {status !== 'suspended' && onSuspend && (
      <Button size="sm" variant="outline" onClick={onSuspend}>
        <Pause className="h-4 w-4" /> {isRTL ? 'إيقاف' : 'Suspend'}
      </Button>
    )}
    {status !== 'draft' && onResetDraft && (
      <Button size="sm" variant="ghost" onClick={onResetDraft}>
        <RotateCcw className="h-4 w-4" /> {isRTL ? 'إعادة للمسودة' : 'Reset to draft'}
      </Button>
    )}
    {onEdit && (
      <Button size="sm" variant="outline" onClick={onEdit}>
        <Pencil className="h-4 w-4" /> {isRTL ? 'تعديل' : 'Edit'}
      </Button>
    )}
    {onToggleAudit && (
      <Button size="sm" variant="ghost" onClick={onToggleAudit}>
        <FileClock className="h-4 w-4" /> {isRTL ? 'السجل' : 'Audit'}
      </Button>
    )}
    {onToggleDistributors && (
      <Button size="sm" variant="ghost" onClick={onToggleDistributors}>
        <Users className="h-4 w-4" /> {isRTL ? 'الموزعون' : 'Distributors'}
      </Button>
    )}
    {onDelete && (
      <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    )}
  </div>
);

export default PrivateSectorRowActions;