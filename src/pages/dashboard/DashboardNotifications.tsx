import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bell, Check, CheckCheck, FileText, CreditCard, Megaphone, Settings2,
  Trash2, Search, Filter, MessageSquare, Eye, X, AlertTriangle, Wrench,
  Zap, Calendar, TrendingUp, ArrowDownRight, ChevronDown, ChevronUp,
  BarChart3, BellOff, BellRing, Clock,
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  contract: FileText, installment: CreditCard, promotion: Megaphone,
  message: MessageSquare, maintenance: Wrench, security: AlertTriangle, system: Settings2,
};

const typeColors: Record<string, string> = {
  contract: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  installment: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  promotion: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  message: 'bg-accent/10 text-accent',
  maintenance: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  security: 'bg-destructive/10 text-destructive',
  system: 'bg-muted text-muted-foreground',
};

const typeLabels: Record<string, { ar: string; en: string }> = {
  all: { ar: 'الكل', en: 'All' },
  contract: { ar: 'العقود', en: 'Contracts' },
  installment: { ar: 'الأقساط', en: 'Installments' },
  promotion: { ar: 'العروض', en: 'Promotions' },
  message: { ar: 'الرسائل', en: 'Messages' },
  maintenance: { ar: 'الصيانة', en: 'Maintenance' },
  security: { ar: 'الأمان', en: 'Security' },
  system: { ar: 'النظام', en: 'System' },
};

const getNotificationIcon = (n) => {
  if (n.reference_type?.startsWith('overdue_')) return AlertTriangle;
  return typeIcons[n.notification_type] || Bell;
};
const getNotificationColor = (n) => {
  if (n.reference_type?.startsWith('overdue_')) return typeColors.security;
  return typeColors[n.notification_type] || typeColors.system;
};

/* ── Notification Item (memo) ── */
const NotificationItem = React.memo(({ notification, isRTL, language, onRead, onDelete, onNavigate }: {
  notification: any; isRTL: boolean; language: string;
  onRead: (id: string) => void; onDelete: (id: string) => void; onNavigate: (n) => void;
}) => {
  const Icon = getNotificationIcon(notification);
  const color = getNotificationColor(notification);
  const title = language === 'ar' ? notification.title_ar : (notification.title_en || notification.title_ar);
  const body = language === 'ar' ? notification.body_ar : (notification.body_en || notification.body_ar);
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: language === 'ar' ? arLocale : enUS });
  const tLabel = typeLabels[notification.notification_type] || typeLabels.system;
  const isNew = isToday(new Date(notification.created_at)) && !notification.is_read;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 group border-border/40 hover:shadow-sm hover:border-border/60',
        !notification.is_read && 'border-accent/30 bg-accent/[0.02]'
      )}
      onClick={() => onNavigate(notification)}
    >
      <CardContent className="p-2.5 sm:p-3 flex gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className={cn('text-xs leading-tight line-clamp-1', !notification.is_read ? 'font-bold' : 'font-medium')}>
                  {title}
                </p>
                {!notification.is_read && <span className="inline-flex w-1.5 h-1.5 rounded-full bg-accent shrink-0 animate-pulse" />}
                {isNew && (
                  <Badge className="text-[7px] px-1 py-0 h-3 bg-accent/10 text-accent border-accent/20">
                    {isRTL ? 'جديد' : 'New'}
                  </Badge>
                )}
              </div>
              {body && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{body}</p>}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-[14px]">
                  {language === 'ar' ? tLabel.ar : tLabel.en}
                </Badge>
                <span className="text-[9px] text-muted-foreground">{timeAgo}</span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.is_read && (
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={e => { e.stopPropagation(); onRead(notification.id); }} title={isRTL ? 'مقروء' : 'Read'}>
                  <Check className="w-3 h-3" />
                </Button>
              )}
              {notification.action_url && (
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={e => { e.stopPropagation(); onNavigate(notification); }} title={isRTL ? 'عرض' : 'View'}>
                  <Eye className="w-3 h-3" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive" onClick={e => { e.stopPropagation(); onDelete(notification.id); }} title={isRTL ? 'حذف' : 'Delete'}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
NotificationItem.displayName = 'NotificationItem';

/* ── Date Group ── */
const DateGroup = React.memo(({ label, count }: { label: string; count: number }) => (
  <div className="flex items-center gap-2 py-0.5">
    <div className="h-px flex-1 bg-border/40" />
    <span className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
      <Calendar className="w-2.5 h-2.5" />{label}
      <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3">{count}</Badge>
    </span>
    <div className="h-px flex-1 bg-border/40" />
  </div>
));
DateGroup.displayName = 'DateGroup';

/* ──────────── Main ──────────── */
const DashboardNotifications = () => {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['all-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('*')
        .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-notifications-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, user?.id]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (typeFilter !== 'all' && n.notification_type !== typeFilter) return false;
      if (readFilter === 'unread' && n.is_read) return false;
      if (readFilter === 'read' && !n.is_read) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (language === 'ar' ? n.title_ar : (n.title_en || n.title_ar)).toLowerCase();
        const body = (language === 'ar' ? n.body_ar : (n.body_en || n.body_ar) || '').toLowerCase();
        if (!title.includes(q) && !body.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, typeFilter, readFilter, searchQuery, language]);

  // Grouped by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof notifications[number][] }[] = [];
    let current = '';
    filtered.slice(0, visibleCount).forEach((n) => {
      const d = new Date(n.created_at);
      let label: string;
      if (isToday(d)) label = isRTL ? 'اليوم' : 'Today';
      else if (isThisWeek(d)) label = isRTL ? 'هذا الأسبوع' : 'This Week';
      else if (isThisMonth(d)) label = isRTL ? 'هذا الشهر' : 'This Month';
      else label = format(d, 'MMMM yyyy', { locale: language === 'ar' ? arLocale : enUS });
      if (label !== current) { groups.push({ label, items: [n] }); current = label; }
      else groups[groups.length - 1].items.push(n);
    });
    return groups;
  }, [filtered, visibleCount, isRTL, language]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const stats = useMemo(() => {
    const today = notifications.filter((n) => isToday(new Date(n.created_at))).length;
    const byType: Record<string, number> = {};
    notifications.forEach((n) => { byType[n.notification_type] = (byType[n.notification_type] || 0) + 1; });
    return { total: notifications.length, unread: unreadCount, today, byType };
  }, [notifications, unreadCount]);

  const markRead = useMutation({
    mutationFn: async (id: string) => { await supabase.from('notifications').update({ is_read: true }).eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-notifications'] }); queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markAllRead = useMutation({
    mutationFn: async () => { await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-notifications'] }); queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => { await supabase.from('notifications').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-notifications'] }); queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const handleClick = useCallback((n) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.action_url) navigate(n.action_url);
  }, [markRead, navigate]);

  const handleRead = useCallback((id: string) => markRead.mutate(id), [markRead]);
  const handleDelete = useCallback((id: string) => deleteNotification.mutate(id), [deleteNotification]);

  const hasFilters = typeFilter !== 'all' || readFilter !== 'all' || searchQuery.trim();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              {isRTL ? 'الإشعارات' : 'Notifications'}
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              {isRTL ? 'متابعة جميع التنبيهات والتحديثات الفورية' : 'Track all alerts and realtime updates'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="default" size="sm" className="gap-1.5 text-xs" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="w-3.5 h-3.5" />
              {isRTL ? `قراءة الكل (${unreadCount})` : `Mark all read (${unreadCount})`}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: isRTL ? 'إجمالي' : 'Total', value: stats.total, icon: Bell, color: 'text-primary bg-primary/10' },
            { label: isRTL ? 'غير مقروء' : 'Unread', value: stats.unread, icon: BellRing, color: 'text-accent bg-accent/10' },
            { label: isRTL ? 'اليوم' : 'Today', value: stats.today, icon: Zap, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
            { label: isRTL ? 'معدل القراءة' : 'Read Rate', value: stats.total > 0 ? `${Math.round(((stats.total - stats.unread) / stats.total) * 100)}%` : '0%', icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
          ].map((s, i) => (
            <Card key={i} className="border-border/40 bg-card/50">
              <CardContent className="p-2.5 sm:p-3 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                  <s.icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold tech-content">{s.value}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Type Breakdown */}
        {Object.keys(stats.byType).length > 1 && (
          <Card className="border-border/40 bg-card/50">
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold">{isRTL ? 'توزيع الإشعارات' : 'Notification Breakdown'}</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => {
                  const Icon = typeIcons[type] || Bell;
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  const label = typeLabels[type]?.[isRTL ? 'ar' : 'en'] || type;
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-[9px] w-14 truncate">{label}</span>
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-[9px] font-semibold text-muted-foreground w-8 text-end tech-content">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder={isRTL ? 'بحث في الإشعارات...' : 'Search notifications...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="ps-9 h-8 text-xs" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
              <Filter className="w-3 h-3 me-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{language === 'ar' ? label.ar : label.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            {(['all', 'unread', 'read'] as const).map(v => (
              <Button key={v} variant={readFilter === v ? 'default' : 'outline'} size="sm" className="text-[10px] h-8 px-2.5 gap-1" onClick={() => setReadFilter(v)}>
                {v === 'all' ? <Bell className="w-3 h-3" /> : v === 'unread' ? <BellRing className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                {v === 'all' ? (isRTL ? 'الكل' : 'All') : v === 'unread' ? (isRTL ? 'غير مقروء' : 'Unread') : (isRTL ? 'مقروء' : 'Read')}
                {v === 'unread' && unreadCount > 0 && <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3.5">{unreadCount}</Badge>}
              </Button>
            ))}
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1" onClick={() => { setTypeFilter('all'); setReadFilter('all'); setSearchQuery(''); }}>
              <X className="w-3 h-3" />{isRTL ? 'مسح' : 'Clear'}
            </Button>
          )}
        </div>

        {/* Count */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-[9px] text-muted-foreground">
            {isRTL ? `عرض ${Math.min(visibleCount, filtered.length)} من ${filtered.length} إشعار` : `Showing ${Math.min(visibleCount, filtered.length)} of ${filtered.length} notifications`}
          </p>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            <p className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Bell className="w-7 h-7 text-primary opacity-50" />
              </div>
              <p className="font-heading font-bold text-foreground mb-1 text-sm">{isRTL ? 'لا توجد إشعارات' : 'No notifications'}</p>
              <p className="text-xs">{hasFilters ? (isRTL ? 'جرّب تعديل الفلاتر' : 'Try adjusting filters') : (isRTL ? 'ستظهر إشعاراتك هنا' : 'Your notifications will appear here')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {grouped.map(group => (
              <div key={group.label} className="space-y-1">
                <DateGroup label={group.label} count={group.items.length} />
                {group.items.map((n) => (
                  <NotificationItem key={n.id} notification={n} isRTL={isRTL} language={language} onRead={handleRead} onDelete={handleDelete} onNavigate={handleClick} />
                ))}
              </div>
            ))}
            {visibleCount < filtered.length && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setVisibleCount(c => c + 30)}>
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {isRTL ? `تحميل المزيد (${filtered.length - visibleCount})` : `Load More (${filtered.length - visibleCount})`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardNotifications;
