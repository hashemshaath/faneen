import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { getNotificationMeta, isUrgentNotification } from './notification-types';

export const NotificationBell = () => {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { isSupported, requestPermission, showNotification } = useBrowserNotifications();
  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  useEffect(() => {
    if (user && isSupported && Notification.permission === 'default') {
      requestPermission().then(setBrowserPermission);
    }
  }, [user, isSupported, requestPermission]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleRealtimeNotification = useCallback((payload: any) => {
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    const n = payload.new;
    const title = language === 'ar' ? n.title_ar : (n.title_en || n.title_ar);
    const body = language === 'ar' ? n.body_ar : (n.body_en || n.body_ar);

    showNotification(title, { body: body || undefined, tag: n.id });

    if (document.visibilityState === 'visible') {
      const meta = getNotificationMeta(n);
      const Icon = meta.icon;
      toast(title, {
        description: body || undefined,
        icon: <Icon className="w-4 h-4" />,
        action: n.action_url ? {
          label: language === 'ar' ? 'عرض' : 'View',
          onClick: () => navigate(n.action_url),
        } : undefined,
        duration: 5000,
      });
    }
  }, [user?.id, language, queryClient, showNotification, navigate]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, handleRealtimeNotification)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient, handleRealtimeNotification]);

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;
  const urgentUnread = notifications.filter((n: any) => !n.is_read && isUrgentNotification(n)).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const handleClick = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.action_url) { navigate(n.action_url); setOpen(false); }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className={`absolute -top-0.5 -end-0.5 w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse ${
              urgentUnread > 0
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-accent text-accent-foreground'
            }`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:w-96 p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading font-bold text-base">
              {isRTL ? 'الإشعارات' : 'Notifications'}
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ms-2 text-[10px]">{unreadCount}</Badge>
              )}
            </SheetTitle>
            <div className="flex items-center gap-1">
              {isSupported && browserPermission !== 'granted' && (
                <Button
                  variant="ghost" size="sm" className="text-xs h-7 px-2"
                  onClick={async () => {
                    const p = await requestPermission();
                    setBrowserPermission(p);
                  }}
                >
                  <BellRing className="w-3.5 h-3.5 me-1" />
                  {isRTL ? 'تفعيل' : 'Enable'}
                </Button>
              )}
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => markAllRead.mutate()}>
                  <CheckCheck className="w-3.5 h-3.5 me-1" />
                  {isRTL ? 'قراءة الكل' : 'Read all'}
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Notification List */}
        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-15" />
              <p className="font-medium text-sm">{isRTL ? 'لا إشعارات جديدة' : 'No notifications'}</p>
              <p className="text-xs mt-1">{isRTL ? 'ستظهر هنا تحديثات عقودك ومشاريعك' : 'Your notifications will appear here'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n: any) => {
                const meta = getNotificationMeta(n);
                const Icon = meta.icon;
                const color = meta.colorClass;
                const title = language === 'ar' ? n.title_ar : (n.title_en || n.title_ar);
                const body = language === 'ar' ? n.body_ar : (n.body_en || n.body_ar);
                const timeAgo = formatDistanceToNow(new Date(n.created_at), {
                  addSuffix: true,
                  locale: language === 'ar' ? ar : enUS,
                });
                const isUrgent = isUrgentNotification(n);

                return (
                  <div
                    key={n.id}
                    className={`group flex gap-3 p-3.5 cursor-pointer hover:bg-muted/50 transition-colors ${
                      !n.is_read
                        ? isUrgent
                          ? 'bg-destructive/[0.03] dark:bg-destructive/[0.06]'
                          : 'bg-accent/5 dark:bg-accent/10'
                        : ''
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-sm leading-tight ${!n.is_read ? 'font-bold' : 'font-medium'}`}>{title}</p>
                            {isUrgent && !n.is_read && (
                              <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5 shrink-0">
                                {isRTL ? 'عاجل' : 'Urgent'}
                              </Badge>
                            )}
                          </div>
                          {body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{body}</p>}
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                              {language === 'ar' ? meta.label.ar : meta.label.en}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
                          </div>
                          {/* Action button for actionable notifications */}
                          {n.action_url && !n.is_read && isUrgent && (
                            <Button
                              variant="default" size="sm"
                              className="mt-2 h-7 text-[10px] gap-1"
                              onClick={(e) => { e.stopPropagation(); handleClick(n); }}
                            >
                              {n.notification_type === 'contract_awaiting' || n.reference_type === 'contract_awaiting'
                                ? (isRTL ? 'راجع العقد ووقّع' : 'Review & Sign')
                                : n.notification_type === 'payment_due' || n.reference_type === 'payment_due'
                                ? (isRTL ? 'عرض تفاصيل الدفعة' : 'View Payment')
                                : n.notification_type === 'stage_awaiting' || n.reference_type === 'stage_awaiting'
                                ? (isRTL ? 'أؤكد الإنجاز' : 'Confirm')
                                : (isRTL ? 'عرض التفاصيل' : 'View Details')}
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="w-6 h-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => { e.stopPropagation(); deleteNotification.mutate(n.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border shrink-0">
          <Button
            variant="outline" size="sm" className="w-full text-xs"
            onClick={() => { navigate('/dashboard/notifications'); setOpen(false); }}
          >
            {isRTL ? 'عرض جميع الإشعارات' : 'View all notifications'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
