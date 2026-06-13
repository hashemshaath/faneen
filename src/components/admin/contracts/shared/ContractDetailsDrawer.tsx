/**
 * Read-only inline side panel ("drawer") for a single admin contract.
 *
 * Pure UI — no Supabase, no queries, no mutations, no editing, no
 * lifecycle actions, no document generation. Renders alongside the
 * contracts list (NOT a modal dialog) in accordance with the project's
 * strict "no popups/dialogs" UX rule.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ContractStatusBadge } from './ContractStatusBadge';
import { ContractTimelineCard } from './ContractTimelineCard';

export interface ContractDetailsDrawerProps {
  contractId: string;
  contractNumber: string;
  title: string;
  status: string | null | undefined;
  providerId?: string | null;
  clientId?: string | null;
  totalAmount?: number | null;
  currencyCode?: string | null;
  createdAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isRTL?: boolean;
  onClose: () => void;
  className?: string;
}

function formatDate(value: string | null | undefined, isRTL: boolean): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US');
}

export const ContractDetailsDrawer: React.FC<ContractDetailsDrawerProps> = ({
  contractId,
  contractNumber,
  title,
  status,
  providerId,
  clientId,
  totalAmount,
  currencyCode,
  createdAt,
  startDate,
  endDate,
  isRTL = true,
  onClose,
  className,
}) => {
  return (
    <aside
      role="region"
      aria-label={isRTL ? 'تفاصيل العقد' : 'Contract details'}
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm flex flex-col gap-3 p-4',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold truncate">{title}</h3>
            <Badge variant="secondary" className="tech-content text-[10px]" dir="ltr">
              {contractNumber}
            </Badge>
          </div>
          <div className="mt-1">
            <ContractStatusBadge status={status} isRTL={isRTL} withIcon />
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

      <Card className="border-border/60">
        <CardContent className="p-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div className="text-muted-foreground">{isRTL ? 'القيمة' : 'Amount'}</div>
          <div className="tech-content text-end" dir="ltr">
            {(totalAmount ?? 0).toLocaleString()} {currencyCode ?? ''}
          </div>

          <div className="text-muted-foreground">{isRTL ? 'المزوّد' : 'Provider'}</div>
          <div className="tech-content text-end truncate" dir="ltr">
            {providerId ?? '—'}
          </div>

          <div className="text-muted-foreground">{isRTL ? 'العميل' : 'Client'}</div>
          <div className="tech-content text-end truncate" dir="ltr">
            {clientId ?? '—'}
          </div>

          <div className="text-muted-foreground">{isRTL ? 'تاريخ الإنشاء' : 'Created'}</div>
          <div className="tech-content text-end" dir="ltr">{formatDate(createdAt, isRTL)}</div>

          <div className="text-muted-foreground">{isRTL ? 'البداية' : 'Start'}</div>
          <div className="tech-content text-end" dir="ltr">{formatDate(startDate, isRTL)}</div>

          <div className="text-muted-foreground">{isRTL ? 'النهاية' : 'End'}</div>
          <div className="tech-content text-end" dir="ltr">{formatDate(endDate, isRTL)}</div>
        </CardContent>
      </Card>

      <ContractTimelineCard
        status={status}
        isRTL={isRTL}
        title={isRTL ? 'المسار' : 'Lifecycle'}
      />

      <Button asChild size="sm" variant="outline" className="h-9 rounded-xl gap-1.5 self-start">
        <Link to={`/contracts/${contractId}`}>
          {isRTL ? 'فتح العقد' : 'Open contract'}
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </Button>
    </aside>
  );
};

export default ContractDetailsDrawer;