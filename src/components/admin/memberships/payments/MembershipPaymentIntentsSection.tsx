/**
 * Presentational section: payment intents table.
 * Pure UI — no Supabase, no queries, no mutations.
 * All data and handlers come from the parent page.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Check, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { ReferenceLinkCopy } from '@/components/reference/ReferenceLinkCopy';
import { PaymentStatusBadge } from '@/components/admin/memberships/shared';
import { pickBi } from '@/components/common/Bilingual';

export interface IntentRowView {
  id: string;
  ref_id: string | null;
  provider: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  provider_intent_id: string | null;
  invoice_id: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export type IntentHealth =
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'requires_action'
  | 'waiting_webhook'
  | 'reconcile_needed'
  | 'cancelled';

export interface MembershipPaymentIntentsSectionProps {
  isRTL: boolean;
  isLoading: boolean;
  rows: IntentRowView[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  highlightedIntentId: string | null;
  reconcilingId: string | null;
  canAct: boolean;
  getHealth: (row: IntentRowView) => IntentHealth;
  getHealthLabel: (h: IntentHealth) => string;
  getHealthTone: (h: IntentHealth) => string;
  isPaidFn: (row: IntentRowView) => boolean;
  isRefundedFn: (row: IntentRowView) => boolean;
  showReconcile: (row: IntentRowView) => boolean;
  onReconcile: (row: IntentRowView) => void;
  onMarkPaidClick: (row: IntentRowView) => void;
  onMarkRefundedClick: (row: IntentRowView) => void;
  titleIcon?: React.ReactNode;
}

export const MembershipPaymentIntentsSection: React.FC<MembershipPaymentIntentsSectionProps> = ({
  isRTL,
  isLoading,
  rows,
  statusFilter,
  onStatusFilterChange,
  highlightedIntentId,
  reconcilingId,
  canAct,
  getHealth,
  getHealthLabel,
  getHealthTone,
  isPaidFn,
  isRefundedFn,
  showReconcile,
  onReconcile,
  onMarkPaidClick,
  onMarkRefundedClick,
  titleIcon,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          {titleIcon}
          {pickBi(isRTL, 'مدفوعات العضويات', 'Membership Payments')}
        </CardTitle>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-48 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pickBi(isRTL, 'كل الحالات', 'All statuses')}</SelectItem>
            <SelectItem value="created">created</SelectItem>
            <SelectItem value="requires_action">requires_action</SelectItem>
            <SelectItem value="succeeded">succeeded</SelectItem>
            <SelectItem value="failed">failed</SelectItem>
            <SelectItem value="cancelled">cancelled</SelectItem>
            <SelectItem value="refunded">refunded</SelectItem>
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
                <TableHead>{pickBi(isRTL, 'التاريخ', 'Created')}</TableHead>
                <TableHead>{pickBi(isRTL, 'مرجع الدفع', 'Payment Ref')}</TableHead>
                <TableHead>{pickBi(isRTL, 'الحالة', 'Status')}</TableHead>
                <TableHead>{pickBi(isRTL, 'الصحة', 'Health')}</TableHead>
                <TableHead>{pickBi(isRTL, 'المزود', 'Provider')}</TableHead>
                <TableHead>{pickBi(isRTL, 'المبلغ', 'Amount')}</TableHead>
                <TableHead>{pickBi(isRTL, 'معرف مزود الدفع', 'Provider ID')}</TableHead>
                <TableHead>{pickBi(isRTL, 'الفاتورة', 'Invoice')}</TableHead>
                <TableHead>{pickBi(isRTL, 'تأكيد', 'Confirmed')}</TableHead>
                <TableHead className="text-end"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isPaid = isPaidFn(r);
                const isRefunded = isRefundedFn(r);
                const isHighlighted = highlightedIntentId === r.id;
                const health = getHealth(r);
                const reconcileBusy = reconcilingId === r.id;
                return (
                  <TableRow key={r.id} className={isHighlighted ? 'bg-primary/5' : ''}>
                    <TableCell className="tech-content text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {r.ref_id ? (
                        <span className="inline-flex items-center gap-1">
                          <ReferenceBadge refId={r.ref_id} />
                          <ReferenceLinkCopy refId={r.ref_id} isRTL={isRTL} />
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getHealthTone(health)}>
                        {health === 'reconcile_needed' && <AlertTriangle className="w-3 h-3 me-1 inline" />}
                        {getHealthLabel(health)}
                      </Badge>
                    </TableCell>
                    <TableCell className="tech-content text-xs">{r.provider || '—'}</TableCell>
                    <TableCell className="tech-content text-xs">
                      {r.amount != null ? `${r.amount} ${r.currency || ''}` : '—'}
                    </TableCell>
                    <TableCell className="tech-content text-[10px] font-mono">{r.provider_intent_id || '—'}</TableCell>
                    <TableCell className="tech-content text-[10px] font-mono">{r.invoice_id || '—'}</TableCell>
                    <TableCell className="tech-content text-xs">
                      {r.confirmed_at ? new Date(r.confirmed_at).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-end">
                      {isRefunded ? (
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline" className="gap-1">
                            {pickBi(isRTL, 'مسترد', 'Refunded')}
                          </Badge>
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/membership/payments/${encodeURIComponent(r.id)}/invoice`}>
                              <FileText className="w-3 h-3 me-1" />
                              {pickBi(isRTL, 'عرض الإشعار الدائن', 'View credit note')}
                            </Link>
                          </Button>
                        </div>
                      ) : isPaid ? (
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline" className="gap-1">
                            <Check className="w-3 h-3" />
                            {pickBi(isRTL, 'مدفوع', 'Paid')}
                          </Badge>
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/membership/payments/${encodeURIComponent(r.id)}/invoice`}>
                              <FileText className="w-3 h-3 me-1" />
                              {pickBi(isRTL, 'عرض الفاتورة', 'View invoice')}
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canAct}
                            onClick={() => onMarkRefundedClick(r)}
                          >
                            {pickBi(isRTL, 'تسجيل استرداد', 'Mark refunded')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {showReconcile(r) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={reconcileBusy || !canAct}
                              onClick={() => onReconcile(r)}
                              title={pickBi(isRTL, 'مزامنة الحالة', 'Reconcile status')}
                            >
                              {reconcileBusy ? (
                                <Loader2 className="w-3 h-3 animate-spin me-1" />
                              ) : (
                                <RefreshCw className="w-3 h-3 me-1" />
                              )}
                              {pickBi(isRTL, 'مزامنة الحالة', 'Reconcile status')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canAct}
                            onClick={() => onMarkPaidClick(r)}
                          >
                            {pickBi(isRTL, 'تأكيد الدفع', 'Mark paid')}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                    {pickBi(isRTL, 'لا توجد مدفوعات', 'No payment intents')}
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

export default MembershipPaymentIntentsSection;