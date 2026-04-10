import React, { useEffect, useMemo, useState } from 'react';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, Check, CheckCheck, FileText, CreditCard, Megaphone, Settings2,
  Trash2, CalendarIcon, Search, Filter, MessageSquare, Eye, X, AlertTriangle, Wrench,
} from 'lucide-react';
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  contract: FileText,
  installment: CreditCard,
  promotion: Megaphone,
  message: MessageSquare,
  maintenance: Wrench,
  security: AlertTriangle,
  system: Settings2,
};

const typeColors: Record<string, string> = {
  contract: 'bg-accent/10 text-accent',
  installment: 'bg-secondary text-secondary-foreground',
  promotion: 'bg-primary/10 text-primary',
  message: 'bg-accent/10 text-accent',
  maintenance: 'bg-secondary text-secondary-foreground',
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

const getNotificationIcon = (notification: any) => {
  if (notification.reference_type?.startsWith('overdue_')) return AlertTriangle;
  return typeIcons[notification.notification_type] || Bell;
};

const getNotificationColor = (notification: any) => {
  if (notification.reference_type?.startsWith('overdue_')) return typeColors.security;
  return typeColors[notification.notification_type] || typeColors.system;
};

const DashboardNotifications = () => {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['all-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dashboard-notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const filtered = useMemo(() => {
    return notifications.filter((notification: any) => {
      if (typeFilter !== 'all' && notification.notification_type !== typeFilter) return false;
      if (readFilter === 'unread' && notification.is_read) return false;
      if (readFilter === 'read' && !notification.is_read) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = (language === 'ar' ? notification.title_ar : (notification.title_en || notification.title_ar)).toLowerCase();
        const body = (language === 'ar' ? notification.body_ar : (notification.body_en || notification.body_ar) || '').toLowerCase();

        if (!title.includes(query) && !body.includes(query)) return false;
      }

      if (dateFrom && isBefore(new Date(notification.created_at), startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(new Date(notification.created_at), endOfDay(dateTo))) return false;
      return true;
    });
  }, [notifications, typeFilter, readFilter, searchQuery, dateFrom, dateTo, language]);

  const unreadCount = notifications.filter((notification: any) => !notification.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const handleClick = (notification: any) => {
    if (!notification.is_read) markRead.mutate(notification.id);
    if (notification.action_url) navigate(notification.action_url);
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setReadFilter('all');
    setSearchQuery('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = typeFilter !== 'all' || readFilter !== 'all' || searchQuery.trim() || dateFrom || dateTo;

  return (
    <DashboardLayout>
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              {isRTL ? 'الإشعارات' : 'Notifications'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isRTL ? 'متابعة جميع التنبيهات والتنبيهات الفورية داخل لوحة التحكم' : 'Track all alerts and realtime updates inside your dashboard'}
            </p>
          </div>

          {unreadCount > 0 && (
            <Button variant="default" size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="w-4 h-4" />
              {isRTL ? 'قراءة الكل' : 'Mark all read'}
            </Button>
          )}
        </div>

        <Card className="border-border/40">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث في الإشعارات...' : 'Search notifications...'}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="ps-10"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 me-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {language === 'ar' ? label.ar : label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs value={readFilter} onValueChange={(value) => setReadFilter(value as 'all' | 'unread' | 'read')}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs px-3">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs px-3">{isRTL ? 'غير مقروء' : 'Unread'}</TabsTrigger>
                  <TabsTrigger value="read" className="text-xs px-3">{isRTL ? 'مقروء' : 'Read'}</TabsTrigger>
                </TabsList>
              </Tabs>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('gap-1 text-xs', !dateFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : (isRTL ? 'من تاريخ' : 'From date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('gap-1 text-xs', !dateTo && 'text-muted-foreground')}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : (isRTL ? 'إلى تاريخ' : 'To date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                  {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: isRTL ? 'الكل' : 'Total', count: notifications.length },
            { label: isRTL ? 'غير مقروء' : 'Unread', count: unreadCount },
            { label: isRTL ? 'العقود' : 'Contracts', count: notifications.filter((notification: any) => notification.notification_type === 'contract').length },
            { label: isRTL ? 'الأقساط' : 'Installments', count: notifications.filter((notification: any) => notification.notification_type === 'installment').length },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/40">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold tech-content text-foreground">{stat.count}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="border-border/40">
                <CardContent className="p-4">
                  <div className="animate-pulse flex gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-border/50">
            <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
              <Bell className="w-14 h-14 mb-4 opacity-20" />
              <p className="text-lg font-medium">{isRTL ? 'لا توجد إشعارات' : 'No notifications'}</p>
              <p className="text-sm">{hasFilters ? (isRTL ? 'جرّب تعديل الفلاتر' : 'Try adjusting the filters') : (isRTL ? 'ستظهر إشعاراتك هنا' : 'Your notifications will appear here')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((notification: any) => {
              const Icon = getNotificationIcon(notification);
              const color = getNotificationColor(notification);
              const title = language === 'ar' ? notification.title_ar : (notification.title_en || notification.title_ar);
              const body = language === 'ar' ? notification.body_ar : (notification.body_en || notification.body_ar);
              const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: language === 'ar' ? arLocale : enUS,
              });
              const dateStr = format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm');
              const typeLabel = typeLabels[notification.notification_type] || typeLabels.system;

              return (
                <Card
                  key={notification.id}
                  className={cn('cursor-pointer hover:shadow-md transition-all group border-border/40', !notification.is_read && 'border-accent/30 bg-accent/[0.03]')}
                  onClick={() => handleClick(notification)}
                >
                  <CardContent className="p-4 flex gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={cn('text-sm leading-tight', !notification.is_read ? 'font-bold' : 'font-medium')}>
                              {title}
                            </p>
                            {!notification.is_read && <div className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                          </div>

                          {body && <p className="text-xs text-muted-foreground line-clamp-2">{body}</p>}

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {language === 'ar' ? typeLabel.ar : typeLabel.en}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">({dateStr})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7"
                              onClick={(event) => {
                                event.stopPropagation();
                                markRead.mutate(notification.id);
                              }}
                              title={isRTL ? 'تعيين كمقروء' : 'Mark as read'}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {notification.action_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(notification.action_url);
                              }}
                              title={isRTL ? 'عرض' : 'View'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteNotification.mutate(notification.id);
                            }}
                            title={isRTL ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardNotifications;