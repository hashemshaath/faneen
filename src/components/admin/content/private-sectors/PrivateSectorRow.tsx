import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DirectoryStatusBadge } from '@/components/admin/content';
import { PrivateSectorRowActions, type PrivateSectorRowActionsProps } from './PrivateSectorRowActions';
import { PS_STATUS_TONE } from './types';
import type { PrivateSector } from '@/features/private-sectors/types';

export interface PrivateSectorRowBusiness {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  ref_id: string | null;
}

export interface PrivateSectorRowProps {
  sector: PrivateSector;
  isRTL: boolean;
  statusLabel: string;
  brandTypeLabel: string;
  parentSectorLabel?: string | null;
  business?: PrivateSectorRowBusiness;
  actions: Omit<PrivateSectorRowActionsProps, 'status' | 'isRTL'>;
  /** Reject reason inline editor */
  reasonOpen?: boolean;
  reasonValue?: string;
  onReasonChange?: (v: string) => void;
  onConfirmReject?: () => void;
  onCancelReject?: () => void;
  rejectBusy?: boolean;
  /** Optional slots for audit and distributors panels */
  auditSlot?: React.ReactNode;
  distributorsSlot?: React.ReactNode;
}

export const PrivateSectorRow: React.FC<PrivateSectorRowProps> = ({
  sector: s, isRTL, statusLabel, brandTypeLabel, parentSectorLabel, business: biz,
  actions, reasonOpen, reasonValue = '', onReasonChange, onConfirmReject, onCancelReject, rejectBusy,
  auditSlot, distributorsSlot,
}) => (
  <Card className="hover-lift">
    <CardContent className="p-4 space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</span>
            <span className="text-xs text-muted-foreground tech-content">{s.ref_id}</span>
            <DirectoryStatusBadge label={statusLabel} tone={PS_STATUS_TONE[s.status]} />
            <Badge variant="outline">{brandTypeLabel}</Badge>
            {parentSectorLabel && <Badge variant="secondary">{parentSectorLabel}</Badge>}
          </div>
          {biz && (
            <p className="mt-1 text-xs text-muted-foreground">
              {isRTL ? 'المنشأة:' : 'Business:'}{' '}
              <span className="font-medium">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</span>
              <span className="ms-2 tech-content">{biz.ref_id}</span>
            </p>
          )}
          {(s.short_description_ar || s.short_description_en) && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {isRTL ? (s.short_description_ar || s.short_description_en) : (s.short_description_en || s.short_description_ar)}
            </p>
          )}
          {s.status === 'rejected' && s.rejection_reason && (
            <p className="mt-2 text-xs text-destructive">
              {isRTL ? 'سبب الرفض: ' : 'Rejection reason: '}{s.rejection_reason}
            </p>
          )}
        </div>
      </div>

      <PrivateSectorRowActions status={s.status} isRTL={isRTL} {...actions} />

      {reasonOpen && (
        <div className="border rounded-lg p-3 bg-muted/40 space-y-2">
          <Textarea
            dir="auto"
            rows={2}
            placeholder={isRTL ? 'سبب الرفض…' : 'Rejection reason…'}
            value={reasonValue}
            onChange={(e) => onReasonChange?.(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={!reasonValue.trim() || !!rejectBusy}
              onClick={onConfirmReject}
            >
              {isRTL ? 'تأكيد الرفض' : 'Confirm reject'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelReject}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {auditSlot && <div className="border-t pt-3 space-y-1.5">{auditSlot}</div>}
      {distributorsSlot && <div className="border-t pt-3">{distributorsSlot}</div>}
    </CardContent>
  </Card>
);

export default PrivateSectorRow;