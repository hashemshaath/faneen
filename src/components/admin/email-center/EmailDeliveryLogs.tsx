import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { format } from 'date-fns';
import { Eye, EyeOff, Search } from 'lucide-react';
import {
  dedupeByMessageId, maskRecipient, recipientDomain, statusTone,
  type EmailLogRow,
} from '@/lib/email-center/email-log-utils';
import { EMAIL_TEMPLATE_CATALOG } from '@/lib/email-center/email-template-catalog';

const RANGES: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30 };

export const EmailDeliveryLogs: React.FC = () => {
  const { isRTL } = useLanguage();
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [status, setStatus] = useState<string>('all');
  const [template, setTemplate] = useState<string>('all');
  const [domain, setDomain] = useState<string>('');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const since = useMemo(
    () => new Date(Date.now() - RANGES[range] * 86_400_000).toISOString(),
    [range],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['email-center-logs', range, status, template],
    queryFn: async () => {
      let q = supabase
        .from('email_send_log')
        .select('id, message_id, template_name, recipient_email, status, error_message, metadata, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (status !== 'all') q = q.eq('status', status);
      if (template !== 'all') q = q.eq('template_name', template);
      const { data: rows } = await q;
      return dedupeByMessageId((rows ?? []) as EmailLogRow[]);
    },
    staleTime: 15_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!domain.trim()) return data;
    const d = domain.trim().toLowerCase();
    return data.filter((r) => recipientDomain(r.recipient_email).includes(d));
  }, [data, domain]);

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{isRTL ? 'سجل التسليم' : 'Delivery logs'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as '24h' | '7d' | '30d')}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{isRTL ? '24 ساعة' : '24h'}</SelectItem>
              <SelectItem value="7d">{isRTL ? '7 أيام' : '7d'}</SelectItem>
              <SelectItem value="30d">{isRTL ? '30 يوم' : '30d'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="dlq">DLQ</SelectItem>
              <SelectItem value="suppressed">Suppressed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{isRTL ? 'كل القوالب' : 'All templates'}</SelectItem>
              {EMAIL_TEMPLATE_CATALOG.map((t) => (
                <SelectItem key={t.name} value={t.name} className="text-xs tech-content">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input dir="ltr" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="domain.com" className="ps-10 h-10 tech-content" />
          </div>
          <Button variant="outline" onClick={() => refetch()} className="h-10">{isRTL ? 'تحديث' : 'Refresh'}</Button>
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-start p-2 font-medium">{isRTL ? 'الوقت' : 'Time'}</th>
                  <th className="text-start p-2 font-medium">{isRTL ? 'القالب' : 'Template'}</th>
                  <th className="text-start p-2 font-medium">{isRTL ? 'المستلم' : 'Recipient'}</th>
                  <th className="text-start p-2 font-medium">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="text-start p-2 font-medium">message_id</th>
                  <th className="text-start p-2 font-medium">{isRTL ? 'الخطأ' : 'Error'}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">{isRTL ? 'لا توجد سجلات' : 'No records'}</td></tr>
                ) : filtered.map((r) => {
                  const reveal = revealed.has(r.id);
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/20">
                      <td className="p-2 tech-content whitespace-nowrap">{format(new Date(r.created_at), 'MM-dd HH:mm')}</td>
                      <td className="p-2 tech-content">{r.template_name ?? '—'}</td>
                      <td className="p-2 tech-content">
                        <div className="flex items-center gap-1">
                          <span>{maskRecipient(r.recipient_email, reveal)}</span>
                          <button onClick={() => toggleReveal(r.id)} className="text-muted-foreground hover:text-foreground" aria-label="reveal">
                            {reveal ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-2"><Badge variant="outline" className={statusTone(r.status)}>{r.status}</Badge></td>
                      <td className="p-2 tech-content text-muted-foreground truncate max-w-[160px]" title={r.message_id ?? ''}>{r.message_id ?? '—'}</td>
                      <td className="p-2 text-destructive max-w-[280px] truncate" title={r.error_message ?? ''}>{r.error_message ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {isRTL ? 'البريد مُقنّع افتراضياً. اضغط أيقونة العين لكشف عنوان مستلم بعينه.' : 'Recipients masked by default. Click the eye icon to reveal a single row.'}
        </p>
      </CardContent>
    </Card>
  );
};