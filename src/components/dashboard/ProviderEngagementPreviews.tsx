import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, MessageSquare, Bell, ArrowLeft, ArrowRight,
  Loader2, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { listRecentLeadsForBusiness } from '@/modules/leads';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConversationRow = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  updated_at: string | null;
};

type NotificationRow = {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  notification_type: string | null;
  is_read: boolean | null;
  created_at: string;
  action_url: string | null;
};

const LEAD_STATUS_TONE: Record<string, string> = {
  new: 'bg-info/10 text-info',
  contacted: 'bg-accent/10 text-accent',
  quoted: 'bg-primary/10 text-primary',
  in_progress: 'bg-warning/10 text-warning',
  won: 'bg-success/10 text-success',
  lost: 'bg-muted text-muted-foreground',
  archived: 'bg-muted text-muted-foreground',
};

const LEAD_STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  new: { ar: 'جديد', en: 'New' },
  contacted: { ar: 'تم التواصل', en: 'Contacted' },
  quoted: { ar: 'تم التسعير', en: 'Quoted' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In progress' },
  won: { ar: 'مكسوب', en: 'Won' },
  lost: { ar: 'مفقود', en: 'Lost' },
  archived: { ar: 'مؤرشف', en: 'Archived' },
};

function formatRelative(iso: string, isRTL: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return isRTL ? 'الآن' : 'now';
  if (mins < 60) return isRTL ? `منذ ${mins} د` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return isRTL ? `منذ ${hrs} س` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return isRTL ? `منذ ${days} ي` : `${days}d ago`;
  return new Date(iso).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en', { month: 'short', day: 'numeric' });
}

/**
 * P4 — three small "engagement" cards on the provider dashboard:
 * Recent leads, Unread messages, Latest notifications.
 * Privacy-safe: no names, phones, emails, or message bodies are shown.
 */
export function ProviderEngagementPreviews({ businessId }: { businessId: string | null | undefined }) {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  /* ── Recent leads ── */
  const leadsQuery = useQuery({
    queryKey: ['provider-recent-leads', businessId],
    enabled: !!businessId,
    staleTime: 30_000,
    queryFn: async () => {
      return await listRecentLeadsForBusiness(businessId!);
    },
  });
  const newLeadCount = useMemo(
    () => (leadsQuery.data ?? []).filter((l) => l.status === 'new').length,
    [leadsQuery.data],
  );

  /* ── Unread messages — same shape DashboardMessages uses ── */
  const messagesQuery = useQuery({
    queryKey: ['provider-overview-unread-msgs', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: unread }, { data: convs }] = await Promise.all([
        supabase
          .from('messages')
          .select('conversation_id')
          .eq('is_read', false)
          .neq('sender_id', user!.id),
        supabase
          .from('conversations')
          .select('id, participant_1, participant_2, last_message_at, updated_at')
          .or(`participant_1.eq.${user!.id},participant_2.eq.${user!.id}`)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(10),
      ]);
      const conversationsList = (convs ?? []) as ConversationRow[];
      const myConvIds = new Set(conversationsList.map((c) => c.id));
      const unreadByConv = new Map<string, number>();
      (unread ?? []).forEach((m) => {
        if (!m.conversation_id || !myConvIds.has(m.conversation_id)) return;
        unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
      });
      const totalUnread = Array.from(unreadByConv.values()).reduce((a, b) => a + b, 0);
      return { conversations: conversationsList, unreadByConv, totalUnread };
    },
  });

  /* ── Latest notifications ── */
  const notifQuery = useQuery({
    queryKey: ['provider-overview-notifs', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title_ar, title_en, notification_type, is_read, created_at, action_url')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      const rows = (data ?? []) as NotificationRow[];
      return { rows, unread: rows.filter((n) => !n.is_read).length };
    },
  });

  if (!user) return null;

  const HeaderRow = ({ icon: Icon, title, count, to, tone }: {
    icon: typeof Inbox; title: string; count?: number; to: string; tone: string;
  }) => (
    <CardHeader className="pb-2 px-4 pt-3 flex flex-row items-center justify-between">
      <CardTitle className="text-xs flex items-center gap-2">
        <Icon className={cn('w-3.5 h-3.5', tone)} />
        {title}
        {typeof count === 'number' && count > 0 && (
          <Badge variant="outline" className="tech-content h-4 text-[9px] px-1.5">{count}</Badge>
        )}
      </CardTitle>
      <Link to={to}>
        <Button variant="ghost" size="sm" className="text-[10px] text-accent h-6 gap-1">
          {language === 'ar' ? 'الكل' : 'All'}
          <Arrow className="w-3 h-3" />
        </Button>
      </Link>
    </CardHeader>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Leads */}
      <Card className="border-border/40">
        <HeaderRow
          icon={Inbox}
          title={language === 'ar' ? 'طلبات جديدة' : 'Recent leads'}
          count={newLeadCount}
          to="/dashboard/leads"
          tone="text-info"
        />
        <CardContent className="px-4 pb-3 min-h-[120px]">
          {leadsQuery.isLoading ? (
            <PreviewLoading />
          ) : leadsQuery.isError ? (
            <PreviewError isRTL={isRTL} />
          ) : (leadsQuery.data?.length ?? 0) === 0 ? (
            <PreviewEmpty
              icon={Inbox}
              text={language === 'ar' ? 'لا توجد طلبات بعد' : 'No leads yet'}
              hint={language === 'ar' ? 'ستظهر هنا عند ورود طلبات جديدة.' : 'New requests will appear here.'}
            />
          ) : (
            <ul className="space-y-1.5">
              {leadsQuery.data!.slice(0, 3).map((l) => {
                const tone = LEAD_STATUS_TONE[l.status ?? ''] ?? 'bg-muted text-muted-foreground';
                const statusLabel = LEAD_STATUS_LABEL[l.status ?? '']
                  ? (language === 'ar' ? LEAD_STATUS_LABEL[l.status!].ar : LEAD_STATUS_LABEL[l.status!].en)
                  : (l.status ?? '');
                const subject = (l.subject ?? '').trim() || (language === 'ar' ? 'طلب جديد' : 'New request');
                return (
                  <li key={l.id}>
                    <Link
                      to="/dashboard/leads"
                      className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium truncate" dir="auto">{subject}</p>
                        <p className="tech-content text-[9px] text-muted-foreground">
                          {l.ref_id ?? '—'} · {formatRelative(l.created_at, isRTL)}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('text-[8px] h-4 shrink-0', tone)}>
                        {statusLabel}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Unread messages */}
      <Card className="border-border/40">
        <HeaderRow
          icon={MessageSquare}
          title={language === 'ar' ? 'الرسائل غير المقروءة' : 'Unread messages'}
          count={messagesQuery.data?.totalUnread}
          to="/dashboard/messages"
          tone="text-accent"
        />
        <CardContent className="px-4 pb-3 min-h-[120px]">
          {messagesQuery.isLoading ? (
            <PreviewLoading />
          ) : messagesQuery.isError ? (
            <PreviewError isRTL={isRTL} />
          ) : (messagesQuery.data?.conversations.length ?? 0) === 0 ? (
            <PreviewEmpty
              icon={MessageSquare}
              text={language === 'ar' ? 'لا محادثات بعد' : 'No conversations yet'}
              hint={language === 'ar' ? 'تواصل مع عملائك من صفحة الرسائل.' : 'Reply to your customers from Messages.'}
            />
          ) : (
            <ul className="space-y-1.5">
              {messagesQuery.data!.conversations.slice(0, 3).map((c) => {
                const unread = messagesQuery.data!.unreadByConv.get(c.id) ?? 0;
                const ts = c.last_message_at ?? c.updated_at ?? new Date().toISOString();
                return (
                  <li key={c.id}>
                    <Link
                      to={`/dashboard/messages?conversation=${c.id}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium truncate">
                          {language === 'ar' ? 'محادثة' : 'Conversation'}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{formatRelative(ts, isRTL)}</p>
                      </div>
                      {unread > 0 && (
                        <Badge className="bg-accent/15 text-accent border-0 text-[9px] h-4 shrink-0">
                          {unread}
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border/40">
        <HeaderRow
          icon={Bell}
          title={language === 'ar' ? 'آخر الإشعارات' : 'Latest notifications'}
          count={notifQuery.data?.unread}
          to="/dashboard/notifications"
          tone="text-warning"
        />
        <CardContent className="px-4 pb-3 min-h-[120px]">
          {notifQuery.isLoading ? (
            <PreviewLoading />
          ) : notifQuery.isError ? (
            <PreviewError isRTL={isRTL} />
          ) : (notifQuery.data?.rows.length ?? 0) === 0 ? (
            <PreviewEmpty
              icon={Bell}
              text={language === 'ar' ? 'لا إشعارات بعد' : 'No notifications yet'}
              hint={language === 'ar' ? 'ستصلك التنبيهات المهمة هنا.' : 'Important alerts will appear here.'}
            />
          ) : (
            <ul className="space-y-1.5">
              {notifQuery.data!.rows.slice(0, 3).map((n) => {
                const title = (language === 'ar' ? n.title_ar : n.title_en) ?? n.title_ar ?? n.title_en ?? '';
                const to = n.action_url || '/dashboard/notifications';
                const isExternal = /^https?:\/\//i.test(to);
                const inner = (
                  <div className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[11px] truncate', !n.is_read && 'font-semibold')} dir="auto">
                        {title || (language === 'ar' ? 'إشعار' : 'Notification')}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{formatRelative(n.created_at, isRTL)}</p>
                    </div>
                    {!n.is_read && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden />}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {isExternal ? (
                      <a href={to} target="_blank" rel="noopener noreferrer">{inner}</a>
                    ) : (
                      <Link to={to}>{inner}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Shared sub-states ── */
function PreviewLoading() {
  return (
    <div className="flex items-center justify-center py-6 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
    </div>
  );
}

function PreviewEmpty({ icon: Icon, text, hint }: { icon: typeof Inbox; text: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-5 text-center">
      <Icon className="w-7 h-7 mb-1.5 text-muted-foreground/30" />
      <p className="text-[11px] text-muted-foreground font-medium">{text}</p>
      {hint && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{hint}</p>}
    </div>
  );
}

function PreviewError({ isRTL }: { isRTL: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-warning py-4 justify-center">
      <AlertCircle className="w-3.5 h-3.5" />
      {isRTL ? 'تعذّر تحميل البيانات' : 'Failed to load'}
    </div>
  );
}