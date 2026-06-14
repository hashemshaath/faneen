/**
 * Presentational "needs attention" list for admin quote-operations.
 *
 * Pure UI — receives the pre-computed attention items plus a follow-up
 * CSV export callback (parent owns build/download). No queries, no
 * mutations, no Supabase, no aggregation.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowUpRight } from 'lucide-react';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { QUOTE_STATUS_LABEL_AR, SECTOR_LABEL_AR, type QuoteStatus } from '@/lib/quoteRequests';
import { QuoteOperationsCsvExportButton } from './QuoteOperationsCsvExportButton';

export interface QuoteOperationsAttentionQuote {
  id: string;
  ref_id: string | null;
  sector: string;
  city: string;
  status: string;
  created_at: string;
}

export interface QuoteOperationsAttentionItem {
  quote: QuoteOperationsAttentionQuote;
  reason: string;
  tone: string;
}

export interface QuoteOperationsAttentionSectionProps {
  items: QuoteOperationsAttentionItem[];
  onExportFollowUp: () => void;
}

function fmtDuration(ms: number | null): string {
  if (ms === null || !isFinite(ms) || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'أقل من دقيقة';
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  return `${d} يوم`;
}

export const QuoteOperationsAttentionSection: React.FC<QuoteOperationsAttentionSectionProps> = ({
  items,
  onExportFollowUp,
}) => (
  <Card><CardContent className="p-5 space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="font-heading font-semibold text-base flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-warning" /> طلبات تحتاج متابعة
      </h2>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground tech-content">{items.length}</span>
        <QuoteOperationsCsvExportButton
          label="تصدير قائمة المتابعة"
          onClick={onExportFollowUp}
          disabled={items.length === 0}
          variant="ghost"
          className="h-7 text-xs"
        />
      </div>
    </div>
    {items.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-6">لا توجد طلبات تحتاج متابعة في هذه الفترة.</p>
    ) : (
      <ul className="divide-y divide-border">
        {items.map((a, i) => {
          const ageMs = Date.now() - new Date(a.quote.created_at).getTime();
          return (
            <li key={`${a.quote.id}-${i}`} className="py-2.5 flex flex-wrap items-center gap-2">
              {a.quote.ref_id ? (
                <ReferenceBadge refId={a.quote.ref_id} />
              ) : (
                <span className="font-mono text-xs text-muted-foreground tech-content">#{a.quote.id.slice(-6)}</span>
              )}
              <span className="text-xs text-muted-foreground">{SECTOR_LABEL_AR[a.quote.sector] ?? a.quote.sector} · {a.quote.city}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${a.tone}`}>{a.reason}</span>
              <span className="text-[11px] text-muted-foreground tech-content">عمر: {fmtDuration(ageMs)}</span>
              <span className="text-[10px] text-muted-foreground">{QUOTE_STATUS_LABEL_AR[a.quote.status as QuoteStatus] ?? a.quote.status}</span>
              <Button size="sm" variant="ghost" asChild className="ms-auto h-7 text-xs">
                <Link to={`/admin/quote-requests/${a.quote.id}`}>فتح <ArrowUpRight className="h-3 w-3" /></Link>
              </Button>
            </li>
          );
        })}
      </ul>
    )}
  </CardContent></Card>
);

export default QuoteOperationsAttentionSection;