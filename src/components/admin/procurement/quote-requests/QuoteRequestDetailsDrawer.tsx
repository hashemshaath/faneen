/**
 * Read-only inline side panel for a single admin RFQ row.
 *
 * Pure UI — no Supabase, no queries, no mutations. No editing, no
 * reveal/match actions, no status updates. Renders alongside the RFQ
 * list (NOT a modal dialog) to honor the project's strict
 * "no popups/dialogs" UX rule.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  QuoteStatusBadge,
  ProcurementTimelineCard,
} from '@/components/admin/procurement/shared';

export interface QuoteRequestDrawerField {
  label: React.ReactNode;
  value: React.ReactNode;
  tech?: boolean;
}

export interface QuoteRequestDetailsDrawerProps {
  id: string;
  refId: string | null;
  status: string | null | undefined;
  customerName?: React.ReactNode;
  customerType?: React.ReactNode;
  fields?: QuoteRequestDrawerField[];
  fileCount?: number;
  isRTL?: boolean;
  detailsHref?: string;
  onClose: () => void;
  className?: string;
}

export const QuoteRequestDetailsDrawer: React.FC<QuoteRequestDetailsDrawerProps> = ({
  id,
  refId,
  status,
  customerName,
  customerType,
  fields = [],
  fileCount,
  isRTL = true,
  detailsHref,
  onClose,
  className,
}) => {
  const href = detailsHref ?? `/admin/quote-requests/${id}`;
  return (
    <aside
      role="region"
      aria-label={isRTL ? 'تفاصيل طلب عرض السعر' : 'Quote request details'}
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm flex flex-col gap-3 p-4',
        className,
      )}
      data-testid="quote-request-details-drawer"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold truncate">
              {customerName ?? (isRTL ? 'طلب عرض سعر' : 'Quote request')}
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
            <QuoteStatusBadge status={status} isRTL={isRTL} />
            {customerType ? (
              <span className="text-[11px] text-muted-foreground">{customerType}</span>
            ) : null}
            {typeof fileCount === 'number' && fileCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tech-content">
                <Paperclip className="h-3 w-3" />
                {fileCount}
              </span>
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

      {fields.length > 0 ? (
        <Card className="border-border/60">
          <CardContent className="p-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {fields.map((f, i) => (
              <React.Fragment key={i}>
                <div className="text-muted-foreground">{f.label}</div>
                <div
                  className={cn('text-end truncate', f.tech && 'tech-content')}
                  dir={f.tech ? 'ltr' : undefined}
                >
                  {f.value ?? '—'}
                </div>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <ProcurementTimelineCard
        status={status}
        isRTL={isRTL}
        title={isRTL ? 'المسار' : 'Lifecycle'}
      />

      <Button asChild size="sm" variant="outline" className="h-9 rounded-xl gap-1.5 self-start">
        <Link to={href}>
          {isRTL ? 'فتح صفحة التفاصيل' : 'Open details page'}
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </Button>
    </aside>
  );
};

export default QuoteRequestDetailsDrawer;