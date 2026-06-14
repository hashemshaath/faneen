import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2, Mail, Webhook } from 'lucide-react';
import { NotificationStatusBadge, type NotificationStatus } from '../NotificationStatusBadge';

export interface ContactNotificationLogRow {
  id: string;
  event_id: string | null;
  message_id: string | null;
  ticket_number: string | null;
  event_type: string | null;
  channel: 'email' | 'webhook';
  recipient: string;
  status: 'pending' | 'success' | 'failed' | 'max_retries' | 'skipped';
  attempt_count: number;
  max_attempts: number;
  http_status: number | null;
  error_code: string | null;
  error_message: string | null;
  response_body: string | null;
  next_retry_at: string | null;
  last_attempt_at: string | null;
  created_at: string;
}

export interface ContactNotificationLogTableSectionProps {
  title: string;
  rows: ContactNotificationLogRow[];
  isLoading: boolean;
  emptyLabel: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  isRTL: boolean;
  labels: {
    attempt: string;
    nextRetry: string;
    response: string;
    errorDetails: string;
  };
}

const STATUS_MAP: Record<ContactNotificationLogRow['status'], NotificationStatus> = {
  success: 'sent',
  pending: 'pending',
  failed: 'failed',
  max_retries: 'dlq',
  skipped: 'suppressed',
};

/**
 * ContactNotificationLogTableSection — presentational list of delivery attempts.
 * Owns no queries, no Supabase, no dispatch/send behavior, no masking changes.
 */
export const ContactNotificationLogTableSection: React.FC<ContactNotificationLogTableSectionProps> = ({
  title, rows, isLoading, emptyLabel, expanded, onToggle, isRTL, labels,
}) => (
  <Card>
    <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="p-0">
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{emptyLabel}</p>
      ) : (
        <div className="divide-y">
          {rows.map((r) => {
            const isOpen = expanded.has(r.id);
            return (
              <div key={r.id} className="px-4 py-3 hover:bg-muted/30">
                <div className="flex items-center gap-3 flex-wrap">
                  {r.channel === 'email'
                    ? <Mail className="w-4 h-4 text-info" />
                    : <Webhook className="w-4 h-4 text-secondary" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <NotificationStatusBadge status={STATUS_MAP[r.status]} label={r.status} size="sm" />
                      {r.event_type && <Badge variant="outline" className="rounded-md text-xs tech-content">{r.event_type}</Badge>}
                      {r.ticket_number && <Badge variant="secondary" className="rounded-md text-xs tech-content">{r.ticket_number}</Badge>}
                      <span className="text-xs text-muted-foreground tech-content">
                        {labels.attempt} {r.attempt_count}/{r.max_attempts}
                        {r.http_status ? ` • HTTP ${r.http_status}` : ''}
                      </span>
                    </div>
                    <div className="text-sm tech-content truncate mt-0.5" dir="ltr">{r.recipient}</div>
                    {r.error_message && (
                      <div className="text-xs text-destructive mt-0.5 line-clamp-1 tech-content">
                        {r.error_code ? `[${r.error_code}] ` : ''}{r.error_message}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground tech-content whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onToggle(r.id)}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
                {isOpen && (
                  <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
                    {r.next_retry_at && (
                      <div className="bg-warning text-warning p-2 rounded-lg">
                        <b>{labels.nextRetry}:</b>{' '}
                        <span className="tech-content">{new Date(r.next_retry_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}</span>
                      </div>
                    )}
                    {r.response_body && (
                      <div className="bg-muted/50 p-2 rounded-lg md:col-span-2">
                        <div className="text-muted-foreground mb-1">{labels.response}</div>
                        <pre className="text-[11px] whitespace-pre-wrap break-all max-h-48 overflow-auto tech-content" dir="ltr">{r.response_body}</pre>
                      </div>
                    )}
                    {r.error_message && (
                      <div className="bg-destructive text-destructive p-2 rounded-lg md:col-span-2">
                        <div className="font-medium mb-1">{labels.errorDetails}</div>
                        <pre className="text-[11px] whitespace-pre-wrap break-all tech-content" dir="ltr">{r.error_code ? `[${r.error_code}]\n` : ''}{r.error_message}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

export default ContactNotificationLogTableSection;