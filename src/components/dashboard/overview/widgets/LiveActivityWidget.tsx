import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  listLiveActivityNotifications,
  subscribeUserNotifications,
} from '@/modules/notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Bell, MessageSquare, FileText, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ActivityKind = 'all' | 'notification' | 'message' | 'contract';

interface ActivityRow {
  id: string;
  kind: Exclude<ActivityKind, 'all'>;
  title: string;
  body?: string | null;
  url: string;
  unread?: boolean;
  createdAt: string;
}

const FILTERS: { id: ActivityKind; ar: string; en: string }[] = [
  { id: 'all',          ar: 'الكل',       en: 'All' },
  { id: 'notification', ar: 'إشعارات',    en: 'Alerts' },
  { id: 'message',      ar: 'رسائل',     en: 'Messages' },
  { id: 'contract',     ar: 'عقود',      en: 'Contracts' },
];

/**
 * Realtime activity timeline. Pulls notifications + recent messages +
 * contract updates and merges them client-side. Subscribes to the
 * `notifications` channel via Supabase Realtime to refresh instantly.
 */
export const LiveActivityWidget = React.memo(function LiveActivityWidget({
  isRTL, userId,
}: { isRTL: boolean; userId: string }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ActivityKind>('all');
  const [online, setOnline] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['live-activity', userId],
    queryFn: async (): Promise<ActivityRow[]> => {
      const [notifs, contracts] = await Promise.all([
        listLiveActivityNotifications({ userId, limit: 15 }),
        supabase
          .from('contracts')
          .select('id, contract_number, title_ar, title_en, status, updated_at')
          .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
          .order('updated_at', { ascending: false })
          .limit(8),
      ]);

      const rows: ActivityRow[] = [];

      (notifs.data || []).forEach((n) => rows.push({
        id: `n-${n.id}`,
        kind: 'notification',
        title: (isRTL ? n.title_ar : (n.title_en || n.title_ar)) ?? '',
        body: isRTL ? n.body_ar : (n.body_en || n.body_ar),
        url: n.action_url || '/dashboard/notifications',
        unread: !n.is_read,
        createdAt: n.created_at,
      }));

      (contracts.data || []).forEach((c) => rows.push({
        id: `c-${c.id}`,
        kind: 'contract',
        title: isRTL ? c.title_ar : (c.title_en || c.title_ar),
        body: c.contract_number,
        url: `/contracts/${c.id}`,
        createdAt: c.updated_at,
      }));

      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return rows.slice(0, 25);
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    return subscribeUserNotifications({
      userId,
      channelName: `dashboard-activity-${userId}`,
      listeners: [
        {
          event: '*',
          onChange: () => qc.invalidateQueries({ queryKey: ['live-activity', userId] }),
        },
      ],
      onStatus: (status) => {
        setOnline(status === 'SUBSCRIBED');
      },
    });
  }, [userId, qc]);

  const filtered = useMemo(() => {
    if (filter === 'all') return data ?? [];
    return (data ?? []).filter((r) => r.kind === filter);
  }, [data, filter]);

  const locale = isRTL ? ar : enUS;

  return (
    <Card className="border-border/40 h-full flex flex-col">
      <CardHeader className="pb-1 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            {isRTL ? 'النشاط المباشر' : 'Live Activity'}
          </CardTitle>
          <span
            className={cn('flex items-center gap-1 text-[9px]', online ? 'text-success' : 'text-muted-foreground')}
            title={online ? (isRTL ? 'متصل' : 'Live') : (isRTL ? 'غير متصل' : 'Offline')}
          >
            {online
              ? <Wifi className="w-3 h-3" aria-hidden="true" />
              : <WifiOff className="w-3 h-3" aria-hidden="true" />}
            <span>{online ? (isRTL ? 'مباشر' : 'Live') : (isRTL ? 'غير متصل' : 'Off')}</span>
          </span>
        </div>
        <div className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap',
                filter === f.id
                  ? 'bg-accent/10 border-accent/40 text-accent font-medium'
                  : 'border-border/40 text-muted-foreground hover:bg-muted/50'
              )}
              aria-pressed={filter === f.id}
            >
              {isRTL ? f.ar : f.en}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 flex-1">
        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Activity className="w-8 h-8 mb-2 opacity-20" aria-hidden="true" />
            <p className="text-[10px]">{isRTL ? 'لا يوجد نشاط' : 'No activity'}</p>
          </div>
        ) : (
          <ul className="space-y-1 max-h-[260px] overflow-y-auto no-scrollbar -mx-1 px-1">
            {filtered.map((row) => {
              const Icon = row.kind === 'notification' ? Bell : row.kind === 'message' ? MessageSquare : FileText;
              return (
                <li key={row.id}>
                  <Link
                    to={row.url}
                    className={cn(
                      'flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors',
                      row.unread && 'bg-accent/5'
                    )}
                  >
                    <div className={cn('w-6 h-6 rounded-md shrink-0 flex items-center justify-center',
                      row.unread ? 'bg-accent/15 text-accent' : 'bg-muted/50 text-muted-foreground')}>
                      <Icon className="w-3 h-3" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[10px] truncate', row.unread ? 'font-medium' : 'text-foreground')} dir="auto">
                        {row.title}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        {row.body && (
                          <p className="text-[9px] text-muted-foreground truncate flex-1" dir="auto">{row.body}</p>
                        )}
                        <span className="text-[9px] text-muted-foreground/70 shrink-0 tech-content">
                          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true, locale })}
                        </span>
                      </div>
                    </div>
                    {row.unread && <Badge className="h-1.5 w-1.5 rounded-full p-0 bg-accent shrink-0 mt-1.5" aria-label={isRTL ? 'جديد' : 'new'} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <div className="pt-2 mt-2 border-t border-border/40 flex justify-end">
          <Link to="/dashboard/notifications">
            <Button variant="ghost" size="sm" className="text-[10px] text-accent h-6 gap-1">
              {isRTL ? 'عرض الكل' : 'View all'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
});