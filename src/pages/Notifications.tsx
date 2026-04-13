import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
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
  Trash2, ArrowLeft, ArrowRight, CalendarIcon, Search, Filter, MessageSquare,
  Eye, X, AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  contract: FileText,
  installment: CreditCard,
  promotion: Megaphone,
  message: MessageSquare,
  system: Settings2,
};

const typeColors: Record<string, string> = {
  contract: 'bg-blue-100 text-blue-600',
  installment: 'bg-amber-100 text-amber-600',
  promotion: 'bg-green-100 text-green-600',
  message: 'bg-purple-100 text-purple-600',
  system: 'bg-muted text-muted-foreground',
};

const getNotificationIcon = (n: any) => {
  if (n.reference_type?.startsWith('overdue_')) return AlertTriangle;
  return typeIcons[n.notification_type] || Bell;
};

const getNotificationColor = (n: any) => {
  if (n.reference_type?.startsWith('overdue_')) return 'bg-red-100 text-red-600';
  return typeColors[n.notification_type] || typeColors.system;
};

const typeLabels: Record<string, { ar: string; en: string }> = {
  all: { ar: 'الكل', en: 'All' },
  contract: { ar: 'العقود', en: 'Contracts' },
  installment: { ar: 'الأقساط', en: 'Installments' },
  promotion: { ar: 'العروض', en: 'Promotions' },
  message: { ar: 'الرسائل', en: 'Messages' },
  system: { ar: 'النظام', en: 'System' },
};

const Notifications = () => {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

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
      if (dateFrom && isBefore(new Date(n.created_at), startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(new Date(n.created_at), endOfDay(dateTo))) return false;
      return true;
    });
  }, [notifications, typeFilter, readFilter, searchQuery, dateFrom, dateTo, language]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-notifications', user?.id] }),
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

  const handleClick = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.action_url) navigate(n.action_url);
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setReadFilter('all');
    setSearchQuery('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = typeFilter !== 'all' || readFilter !== 'all' || searchQuery.trim() || dateFrom || dateTo;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">{isRTL ? 'يرجى تسجيل الدخول لعرض الإشعارات' : 'Please login to view notifications'}</p>
          <Link to="/auth"><Button className="mt-4">{isRTL ? 'تسجيل الدخول' : 'Login'}</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Cover */}
      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <Bell className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-heading font-bold text-3xl text-primary-foreground mb-2">
            {isRTL ? 'جميع الإشعارات' : 'All Notifications'}
          </h1>
          <p className="text-primary-foreground/60 font-body">
            {isRTL
              ? `${filtered.length} إشعار${unreadCount > 0 ? ` • ${unreadCount} غير مقروء` : ''}`
              : `${filtered.length} notification${filtered.length !== 1 ? 's' : ''}${unreadCount > 0 ? ` • ${unreadCount} unread` : ''}`}
          </p>
          {unreadCount > 0 && (
            <Button variant="hero" size="sm" onClick={() => markAllRead.mutate()} className="mt-4 gap-1">
              <CheckCheck className="w-4 h-4" />
              {isRTL ? 'قراءة الكل' : 'Mark all read'}
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث في الإشعارات...' : 'Search notifications...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {/* Type filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
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

              {/* Read/Unread filter */}
              <Tabs value={readFilter} onValueChange={(v) => setReadFilter(v as 'all' | 'unread' | 'read')}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs px-3">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs px-3">{isRTL ? 'غير مقروء' : 'Unread'}</TabsTrigger>
                  <TabsTrigger value="read" className="text-xs px-3">{isRTL ? 'مقروء' : 'Read'}</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Date from */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-1 text-xs", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : (isRTL ? 'من تاريخ' : 'From date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              {/* Date to */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-1 text-xs", !dateTo && "text-muted-foreground")}>
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: isRTL ? 'الكل' : 'Total', count: notifications.length, color: 'text-foreground' },
            { label: isRTL ? 'غير مقروء' : 'Unread', count: unreadCount, color: 'text-primary' },
            { label: isRTL ? 'العقود' : 'Contracts', count: notifications.filter((n) => n.notification_type === 'contract').length, color: 'text-blue-600' },
            { label: isRTL ? 'الأقساط' : 'Installments', count: notifications.filter((n) => n.notification_type === 'installment').length, color: 'text-amber-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notifications list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-4"><div className="animate-pulse flex gap-3"><div className="w-10 h-10 bg-muted rounded-lg" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div></div></CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
              <Bell className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">{isRTL ? 'لا توجد إشعارات' : 'No notifications'}</p>
              <p className="text-sm">{hasFilters ? (isRTL ? 'جرب تغيير الفلاتر' : 'Try changing the filters') : (isRTL ? 'ستظهر إشعاراتك هنا' : 'Your notifications will appear here')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const Icon = getNotificationIcon(n);
              const color = getNotificationColor(n);
              const title = language === 'ar' ? n.title_ar : (n.title_en || n.title_ar);
              const body = language === 'ar' ? n.body_ar : (n.body_en || n.body_ar);
              const timeAgo = formatDistanceToNow(new Date(n.created_at), {
                addSuffix: true,
                locale: language === 'ar' ? arLocale : enUS,
              });
              const dateStr = format(new Date(n.created_at), 'dd/MM/yyyy HH:mm');
              const typeLabel = typeLabels[n.notification_type] || typeLabels.system;

              return (
                <Card
                  key={n.id}
                  className={cn(
                    'cursor-pointer hover:shadow-md transition-all group',
                    !n.is_read && 'border-primary/30 bg-primary/[0.02]'
                  )}
                  onClick={() => handleClick(n)}
                >
                  <CardContent className="p-4 flex gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={cn('text-sm leading-tight', !n.is_read ? 'font-bold' : 'font-medium')}>
                              {title}
                            </p>
                            {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          </div>
                          {body && <p className="text-xs text-muted-foreground line-clamp-2">{body}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {language === 'ar' ? typeLabel.ar : typeLabel.en}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">({dateStr})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.is_read && (
                            <Button
                              variant="ghost" size="icon" className="w-7 h-7"
                              onClick={e => { e.stopPropagation(); markRead.mutate(n.id); }}
                              title={isRTL ? 'تعيين كمقروء' : 'Mark as read'}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {n.action_url && (
                            <Button
                              variant="ghost" size="icon" className="w-7 h-7"
                              onClick={e => { e.stopPropagation(); navigate(n.action_url); }}
                              title={isRTL ? 'عرض' : 'View'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon" className="w-7 h-7 text-destructive"
                            onClick={e => { e.stopPropagation(); deleteNotification.mutate(n.id); }}
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
      <Footer />
    </div>
  );
};

export default Notifications;

