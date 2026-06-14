import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export interface ContactAuditLogRow {
  id: string;
  message_id: string;
  ticket_number: string | null;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  message_subject: string | null;
  message_name: string | null;
  message_email: string | null;
  created_at: string;
}

export interface ContactAuditEventLabel {
  ar: string;
  en: string;
  color: string;
}

export interface ContactAuditLogTableSectionProps {
  title: string;
  rows: ContactAuditLogRow[];
  isLoading: boolean;
  emptyLabel: string;
  isRTL: boolean;
  labels: {
    date: string;
    ticket: string;
    event: string;
    change: string;
    actor: string;
    customer: string;
    system: string;
  };
  eventLabels: Record<string, ContactAuditEventLabel>;
}

/**
 * ContactAuditLogTableSection — presentational table of contact audit events.
 * Owns no queries / mutations / writers; masking and metadata rendering unchanged.
 */
export const ContactAuditLogTableSection: React.FC<ContactAuditLogTableSectionProps> = ({
  title, rows, isLoading, emptyLabel, isRTL, labels, eventLabels,
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">{emptyLabel}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-start p-3">{labels.date}</th>
                <th className="text-start p-3">{labels.ticket}</th>
                <th className="text-start p-3">{labels.event}</th>
                <th className="text-start p-3">{labels.change}</th>
                <th className="text-start p-3">{labels.actor}</th>
                <th className="text-start p-3">{labels.customer}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const evt = eventLabels[r.event_type];
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30 transition">
                    <td className="p-3 tech-content text-xs whitespace-nowrap">
                      {format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="p-3 tech-content text-xs">{r.ticket_number ?? '—'}</td>
                    <td className="p-3">
                      <Badge className={`rounded-lg ${evt?.color ?? 'bg-muted'}`} variant="secondary">
                        {isRTL ? evt?.ar ?? r.event_type : evt?.en ?? r.event_type}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs">
                      <span className="text-muted-foreground">{r.from_value ?? '—'}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium">{r.to_value ?? '—'}</span>
                    </td>
                    <td className="p-3 text-xs">
                      {r.actor_name ?? r.actor_email ?? (
                        <span className="text-muted-foreground italic">{labels.system}</span>
                      )}
                    </td>
                    <td className="p-3 text-xs max-w-xs truncate">
                      <div className="font-medium truncate">{r.message_name ?? '—'}</div>
                      {r.message_subject && (
                        <div className="text-muted-foreground truncate">{r.message_subject}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
);

export default ContactAuditLogTableSection;