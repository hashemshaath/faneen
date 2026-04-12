import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, FileText, CreditCard, Megaphone, Settings2, Trash2, AlertTriangle, X, MessageSquare, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const typeIcons: Record<string, React.ElementType> = {
  contract: FileText,
  installment: CreditCard,
  promotion: Megaphone,
  system: Settings2,
  message: MessageSquare,
  maintenance: Wrench,
};

const typeColors: Record<string, string> = {
  contract: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  installment: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  promotion: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  system: 'bg-muted text-muted-foreground',
  message: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  maintenance: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  security: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

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
    // No polling — realtime subscription handles updates
  });

  const handleRealtimeNotification = useCallback((payload: any) => {
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    const n = payload.new as any;
    const title = language === 'ar' ? n.title_ar : (n.title_en || n.title_ar);
    const body = language === 'ar' ? n.body_ar : (n.body_en || n.body_ar);

    // Browser notification when tab is hidden
    showNotification(title, { body: body || undefined, tag: n.id });

    // In-app toast when tab is visible
    if (document.visibilityState === 'visible') {
      const Icon = typeIcons[n.notification_type] || Bell;
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
  }, [user?.id, queryClient, handleRealtimeNotification]);

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

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
            <span className="absolute -top-0.5 -end-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
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
              <p className="font-medium text-sm">{isRTL ? 'لا توجد إشعارات' : 'No notifications'}</p>
              <p className="text-xs mt-1">{isRTL ? 'ستظهر إشعاراتك هنا' : 'Your notifications will appear here'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n: any) => {
                const Icon = n.reference_type?.startsWith('overdue_') ? AlertTriangle : (typeIcons[n.notification_type] || Bell);
                const color = n.reference_type?.startsWith('overdue_') ? typeColors.security : (typeColors[n.notification_type] || typeColors.system);
                const title = language === 'ar' ? n.title_ar : (n.title_en || n.title_ar);
                const body = language === 'ar' ? n.body_ar : (n.body_en || n.body_ar);
                const timeAgo = formatDistanceToNow(new Date(n.created_at), {
                  addSuffix: true,
                  locale: language === 'ar' ? ar : enUS,
                });

                return (
                  <div
                    key={n.id}
                    className={`group flex gap-3 p-3.5 cursor-pointer hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-accent/5 dark:bg-accent/10' : ''}`}
                    onClick={() => handleClick(n)}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm leading-tight ${!n.is_read ? 'font-bold' : 'font-medium'}`}>{title}</p>
                        <Button
                          variant="ghost" size="icon"
                          className="w-6 h-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => { e.stopPropagation(); deleteNotification.mutate(n.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      {body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
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
