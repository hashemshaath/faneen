/**
 * Presentational section: webhook events table (read-only).
 * Pure UI — no Supabase, no queries, no mutations.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WebhookEventStatusBadge } from '@/components/admin/memberships/shared';
import { pickBi } from '@/components/common/Bilingual';

export interface WebhookEventRowView {
  id: string;
  event_id: string;
  event_type: string;
  provider: string;
  received_at: string;
  processed_at: string | null;
  processing_error: string | null;
  payload: unknown;
}

export type WebhookEventFilter = 'all' | 'pending' | 'processed' | 'error';

export interface WebhookEventSummary {
  paymentIntentId?: string;
  lines: string[];
}

export interface MembershipWebhookEventsSectionProps {
  isRTL: boolean;
  isLoading: boolean;
  rows: WebhookEventRowView[];
  filter: WebhookEventFilter;
  onFilterChange: (value: WebhookEventFilter) => void;
  getEventStatusLabel: (row: WebhookEventRowView) => 'pending' | 'processed' | 'error';
  getSummary: (payload: unknown) => WebhookEventSummary;
}

export const MembershipWebhookEventsSection: React.FC<MembershipWebhookEventsSectionProps> = ({
  isRTL,
  isLoading,
  rows,
  filter,
  onFilterChange,
  getEventStatusLabel,
  getSummary,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5" />
          {pickBi(isRTL, 'أحداث الدفع الأخيرة', 'Recent payment events')}
        </CardTitle>
        <Select value={filter} onValueChange={(v) => onFilterChange(v as WebhookEventFilter)}>
          <SelectTrigger className="w-48 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pickBi(isRTL, 'كل الأحداث', 'All events')}</SelectItem>
            <SelectItem value="pending">{pickBi(isRTL, 'بانتظار المزامنة', 'Pending')}</SelectItem>
            <SelectItem value="processed">{pickBi(isRTL, 'تمت المعالجة', 'Processed')}</SelectItem>
            <SelectItem value="error">{pickBi(isRTL, 'فشل', 'Failed/error')}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{pickBi(isRTL, 'التاريخ', 'Received')}</TableHead>
                <TableHead>{pickBi(isRTL, 'المزود', 'Provider')}</TableHead>
                <TableHead>{pickBi(isRTL, 'نوع الحدث', 'Event type')}</TableHead>
                <TableHead>{pickBi(isRTL, 'معرف الحدث', 'Event ID')}</TableHead>
                <TableHead>{pickBi(isRTL, 'الحالة', 'Status')}</TableHead>
                <TableHead>{pickBi(isRTL, 'الملخص', 'Summary')}</TableHead>
                <TableHead className="text-end"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => {
                const summary = getSummary(e.payload);
                const status = getEventStatusLabel(e);
                const statusText =
                  status === 'pending'
                    ? (pickBi(isRTL, 'بانتظار المزامنة', 'Pending reconcile'))
                    : status === 'processed'
                    ? (pickBi(isRTL, 'تمت المعالجة', 'Processed'))
                    : (pickBi(isRTL, 'خطأ', 'Error'));
                return (
                  <TableRow key={e.id}>
                    <TableCell className="tech-content text-xs">{new Date(e.received_at).toLocaleString()}</TableCell>
                    <TableCell className="tech-content text-xs">{e.provider}</TableCell>
                    <TableCell className="tech-content text-xs">{e.event_type}</TableCell>
                    <TableCell className="tech-content text-[10px] font-mono">{e.event_id}</TableCell>
                    <TableCell>
                      <WebhookEventStatusBadge status={status} label={statusText} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {summary.lines.length > 0 ? (
                        <ul className="space-y-0.5">
                          {summary.lines.map((line, i) => (
                            <li key={i} className="text-muted-foreground">{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {summary.paymentIntentId ? (
                        <Button size="sm" variant="ghost" asChild>
                          <Link
                            to={`/admin/membership-payments?intent=${encodeURIComponent(summary.paymentIntentId)}`}
                          >
                            {pickBi(isRTL, 'فتح نية الدفع', 'Open payment intent')}
                          </Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    {pickBi(isRTL, 'لا توجد أحداث دفع بعد.', 'No payment events yet.')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default MembershipWebhookEventsSection;