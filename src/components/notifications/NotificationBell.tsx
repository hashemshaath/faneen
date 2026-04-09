import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, FileText, CreditCard, Megaphone, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const typeIcons: Record<string, React.ElementType> = {
  contract: FileText,
  installment: CreditCard,
  promotion: Megaphone,
  system: Settings2,
};

const typeColors: Record<string, string> = {
  contract: 'bg-blue-100 text-blue-600',
  installment: 'bg-amber-100 text-amber-600',
  promotion: 'bg-green-100 text-green-600',
  system: 'bg-muted text-muted-foreground',
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

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
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="bottom">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-heading font-bold text-sm">{isRTL ? 'الإشعارات' : 'Notifications'}</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => markAllRead.mutate()}>
                <CheckCheck className="w-3.5 h-3.5 me-1" />
                {isRTL ? 'قراءة الكل' : 'Mark all read'}
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
              {isRTL ? 'لا توجد إشعارات' : 'No notifications'}
            </div>
          ) : (
            notifications.map((n: any) => {
              const Icon = typeIcons[n.notification_type] || Bell;
              const color = typeColors[n.notification_type] || typeColors.system;
              const title = language === 'ar' ? n.title_ar : (n.title_en || n.title_ar);
              const body = language === 'ar' ? n.body_ar : (n.body_en || n.body_ar);
              const timeAgo = formatDistanceToNow(new Date(n.created_at), {
                addSuffix: true,
                locale: language === 'ar' ? ar : enUS,
              });

              return (
                <div
                  key={n.id}
                  className={`flex gap-3 p-3 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-sm leading-tight ${!n.is_read ? 'font-bold' : 'font-medium'}`}>{title}</p>
                      <Button
                        variant="ghost" size="icon" className="w-6 h-6 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={e => { e.stopPropagation(); deleteNotification.mutate(n.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </div>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
