/**
 * Read-only side panel for an admin brand-request row.
 *
 * Pure UI — no Supabase, no queries, no mutations, no RPCs. The drawer
 * shows the request snapshot (proposed brand, business, notes, dates)
 * and accepts an optional `actionsSlot` so the owning page can mount
 * its existing `BrandRequestRowActions` cluster without changing any
 * approve/reject/status behavior. Renders alongside the list to honor
 * the project's strict "no popups/dialogs" UX rule.
 */
import React from 'react';
import { X, Info, MessageSquare, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BrandRequestStatusBadge } from '@/components/admin/procurement/shared';

export interface BrandRequestDrawerField {
  label: React.ReactNode;
  value: React.ReactNode;
  tech?: boolean;
}

export interface BrandRequestReviewDrawerProps {
  id: string;
  refId: string | null;
  status: string | null | undefined;
  brandName: React.ReactNode;
  requestType?: React.ReactNode;
  businessLabel?: React.ReactNode;
  businessRefId?: string | null;
  fields?: BrandRequestDrawerField[];
  adminNote?: string | null;
  rejectReason?: string | null;
  requesterNotes?: string | null;
  isRTL?: boolean;
  onClose: () => void;
  actionsSlot?: React.ReactNode;
  className?: string;
}

export const BrandRequestReviewDrawer: React.FC<BrandRequestReviewDrawerProps> = ({
  id,
  refId,
  status,
  brandName,
  requestType,
  businessLabel,
  businessRefId,
  fields = [],
  adminNote,
  rejectReason,
  requesterNotes,
  isRTL = true,
  onClose,
  actionsSlot,
  className,
}) => {
  return (
    <aside
      role="region"
      aria-label={isRTL ? 'تفاصيل طلب العلامة' : 'Brand request details'}
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm flex flex-col gap-3 p-4',
        className,
      )}
      data-testid="brand-request-review-drawer"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold truncate" dir="auto">
              {brandName}
            </h3>
            {refId ? (
              <Badge variant="secondary" className="tech-content text-[10px]" dir="ltr">
                {refId}
              </Badge>
            ) : (
              <Badge variant="secondary" className="tech-content text-[10px]" dir="ltr">
                #{id.slice(-6)}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <BrandRequestStatusBadge status={status} isRTL={isRTL} />
            {requestType ? (
              <span className="text-[11px] text-muted-foreground">{requestType}</span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={onClose}
          aria-label={isRTL ? 'إغلاق' : 'Close'}
        >
          <X className="w-4 h-4" />
        </Button>
      </header>

      {businessLabel ? (
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="w-3.5 h-3.5" />
          <span className="truncate" dir="auto">{businessLabel}</span>
          {businessRefId ? (
            <code className="tech-content ms-1" dir="ltr">{businessRefId}</code>
          ) : null}
        </div>
      ) : null}

      {fields.length > 0 ? (
        <Card className="border-border/60">
          <CardContent className="p-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {fields.map((f, i) => (
              <React.Fragment key={i}>
                <div className="text-muted-foreground">{f.label}</div>
                <div
                  className={cn('text-end break-words', f.tech && 'tech-content')}
                  dir={f.tech ? 'ltr' : 'auto'}
                >
                  {f.value ?? '—'}
                </div>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {requesterNotes ? (
        <div className="text-xs bg-muted/40 rounded-lg p-2 flex items-start gap-2">
          <MessageSquare className="w-3 h-3 mt-0.5 text-muted-foreground" />
          <span dir="auto">
            <span className="font-medium">
              {isRTL ? 'ملاحظات المُرسل: ' : 'Requester notes: '}
            </span>
            {requesterNotes}
          </span>
        </div>
      ) : null}
      {adminNote ? (
        <div className="text-xs bg-muted/40 rounded-lg p-2 flex items-start gap-2">
          <MessageSquare className="w-3 h-3 mt-0.5 text-muted-foreground" />
          <span dir="auto">
            <span className="font-medium">
              {isRTL ? 'ملاحظة الأدمن: ' : 'Admin note: '}
            </span>
            {adminNote}
          </span>
        </div>
      ) : null}
      {rejectReason ? (
        <div className="text-xs bg-destructive/5 border border-destructive/20 rounded-lg p-2 flex items-start gap-2">
          <Info className="w-3 h-3 mt-0.5 text-destructive" />
          <span dir="auto">
            <span className="font-medium">
              {isRTL ? 'سبب الرفض: ' : 'Rejection reason: '}
            </span>
            {rejectReason}
          </span>
        </div>
      ) : null}

      {actionsSlot ? <div className="pt-1">{actionsSlot}</div> : null}
    </aside>
  );
};

export default BrandRequestReviewDrawer;