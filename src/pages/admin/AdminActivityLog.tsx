import React, { useState, useMemo, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, Search, User, Clock, Filter, Download, X,
  Shield, Settings, LogIn, Trash2, Edit, UserPlus, UserMinus,
  Ban, CheckCircle, AlertTriangle, FileText, ChevronDown, ChevronUp,
  TrendingUp, Users, Zap
} from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ar } from 'date-fns/locale';

/* ─── Action Config ─── */
const actionConfig: Record<string, { ar: string; en: string; color: string; icon: React.ElementType }> = {
  create: { ar: 'إنشاء', en: 'إنشاء جديد', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: FileText },
  update: { ar: 'تعديل', en: 'تعديل', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Edit },
  delete: { ar: 'حذف', en: 'حذف', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: Trash2 },
  login: { ar: 'تسجيل دخول', en: 'تسجيل دخول', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', icon: LogIn },
  role_change: { ar: 'تغيير صلاحية', en: 'تغيير صلاحية', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: Shield },
  role_assigned: { ar: 'منح صلاحية', en: 'منح صلاحية', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: UserPlus },
  role_updated: { ar: 'تحديث صلاحية', en: 'تحديث صلاحية', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: Shield },
  role_removed: { ar: 'سحب صلاحية', en: 'سحب صلاحية', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: UserMinus },
  settings: { ar: 'تعديل إعدادات', en: 'تعديل إعدادات', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', icon: Settings },
  setting_created: { ar: 'إنشاء إعداد', en: 'إنشاء إعداد', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', icon: Settings },
  setting_updated: { ar: 'تحديث إعداد', en: 'تحديث إعداد', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Settings },
  setting_deleted: { ar: 'حذف إعداد', en: 'حذف إعداد', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: Settings },
  user_disabled: { ar: 'تعطيل حساب', en: 'تعطيل حساب', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', icon: Ban },
  user_enabled: { ar: 'تفعيل حساب', en: 'تفعيل حساب', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
  unauthorized_access: { ar: 'محاولة وصول غير مصرح', en: 'محاولة وصول غير مصرح', color: 'bg-red-500/15 text-red-700 dark:text-red-400', icon: AlertTriangle },
};

const entityLabels: Record<string, { ar: string; en: string }> = {
  user: { ar: 'مستخدم', en: 'مستخدم' },
  business: { ar: 'نشاط تجاري', en: 'نشاط تجاري' },
  contract: { ar: 'عقد', en: 'عقد' },
  blog_post: { ar: 'مقال', en: 'مقال' },
  profile_system: { ar: 'نظام بروفايل', en: 'نظام بروفايل' },
  setting: { ar: 'إعداد', en: 'إعداد' },
  platform_setting: { ar: 'إعداد المنصة', en: 'إعداد المنصة' },
  role: { ar: 'صلاحية', en: 'صلاحية' },
  user_role: { ar: 'صلاحية مستخدم', en: 'صلاحية مستخدم' },
  route: { ar: 'مسار', en: 'مسار' },
};

/* ─── Detail field labels ─── */
const detailFieldLabels: Record<string, { ar: string; en: string }> = {
  setting_key: { ar: 'المفتاح', en: 'المفتاح' },
  setting_value: { ar: 'القيمة', en: 'القيمة' },
  old_value: { ar: 'القيمة السابقة', en: 'القيمة السابقة' },
  new_value: { ar: 'القيمة الجديدة', en: 'القيمة الجديدة' },
  role: { ar: 'الصلاحية', en: 'الصلاحية' },
  old_role: { ar: 'الصلاحية السابقة', en: 'الصلاحية السابقة' },
  new_role: { ar: 'الصلاحية الجديدة', en: 'الصلاحية الجديدة' },
  target_user_id: { ar: 'المستخدم المستهدف', en: 'المستخدم المستهدف' },
  target_user: { ar: 'المستخدم المستهدف', en: 'المستخدم المستهدف' },
  reason: { ar: 'السبب', en: 'السبب' },
  name: { ar: 'الاسم', en: 'الاسم' },
  email: { ar: 'البريد', en: 'البريد' },
  status: { ar: 'الحالة', en: 'الحالة' },
  field: { ar: 'الحقل', en: 'الحقل' },
  value: { ar: 'القيمة', en: 'القيمة' },
  business_name: { ar: 'اسم النشاط', en: 'اسم النشاط' },
  tier: { ar: 'العضوية', en: 'العضوية' },
  route: { ar: 'المسار', en: 'المسار' },
};

/* ─── Format details as readable key-value ─── */
const formatDetails = (details: any): { key: string; label: string; value: string }[] | null => {
  if (!details || typeof details !== 'object') return null;
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!entries.length) return null;
  return entries.map(([key, value]) => ({
    key,
    label: detailFieldLabels[key]?.ar || key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
  }));
};

/* ─── Timeline date grouping ─── */
const getDateGroup = (dateStr: string, isRTL: boolean): string => {
  const date = new Date(dateStr);
  if (isToday(date)) return isRTL ? 'اليوم' : 'اليوم';
  if (isYesterday(date)) return isRTL ? 'أمس' : 'أمس';
  if (isThisWeek(date)) return isRTL ? 'هذا الأسبوع' : 'هذا الأسبوع';
  return format(date, 'yyyy/MM/dd', { locale: ar });
};

/* ─── Log Item Component ─── */
const LogItem = React.memo(({ log, getProfileName, isRTL }: {
  log: any; getProfileName: (id: string) => string; isRTL: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const config = actionConfig[log.action] || { ar: log.action, en: log.action, color: 'bg-muted text-muted-foreground', icon: Activity };
  const ActionIcon = config.icon;
  const entityLabel = log.entity_type ? (entityLabels[log.entity_type]?.ar || log.entity_type) : null;
  const details = formatDetails(log.details);
  const profileName = getProfileName(log.user_id);

  return (
    <div className="group relative flex gap-3 py-3 px-4 rounded-xl hover:bg-muted/30 transition-colors">
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl ${config.color} flex items-center justify-center shrink-0 mt-0.5`}>
        <ActionIcon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Action description */}
            <p className="text-sm font-medium leading-snug">
              <span className="text-foreground">{profileName}</span>
              <span className="text-muted-foreground mx-1.5">{'·'}</span>
              <span className="text-foreground/80">{config.ar}</span>
              {entityLabel && (
                <>
                  <span className="text-muted-foreground mx-1.5">{'·'}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal align-middle">
                    {entityLabel}
                  </Badge>
                </>
              )}
            </p>

            {/* Quick detail summary */}
            {details && !expanded && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
                {details.slice(0, 2).map(d => `${d.label}: ${d.value}`).join(' • ')}
                {details.length > 2 && ` (+${details.length - 2})`}
              </p>
            )}
          </div>

          {/* Time + Expand */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(log.created_at), 'HH:mm', { locale: ar })}
            </span>
            {details && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && details && (
          <div className="mt-2 rounded-lg bg-muted/30 border border-border/20 p-3 animate-in slide-in-from-top-1 duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {details.map(d => (
                <div key={d.key} className="flex items-start gap-2">
                  <span className="text-[11px] text-muted-foreground font-medium shrink-0 min-w-[80px]">{d.label}:</span>
                  <span className="text-[11px] text-foreground break-all">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
LogItem.displayName = 'LogItem';

const AdminActivityLog = () => {
  const { isRTL, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [, startTransition] = useTransition();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-activity-log', actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');
      if (error) throw error;
      return data;
    },
  });

  const getProfileName = (userId: string) => {
    const profile = profiles?.find(p => p.user_id === userId);
    return profile?.full_name || profile?.email || userId.slice(0, 8);
  };

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(log => {
      const name = getProfileName(log.user_id).toLowerCase();
      const actionLabel = (actionConfig[log.action]?.ar || log.action).toLowerCase();
      const entityLabel = log.entity_type ? (entityLabels[log.entity_type]?.ar || log.entity_type).toLowerCase() : '';
      return name.includes(q) || actionLabel.includes(q) || entityLabel.includes(q);
    });
  }, [logs, searchQuery, profiles]);

  /* ─── Group by date ─── */
  const groupedLogs = useMemo(() => {
    const groups: { label: string; logs: typeof filteredLogs }[] = [];
    let currentLabel = '';
    for (const log of filteredLogs) {
      const label = getDateGroup(log.created_at, isRTL);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, logs: [log] });
      } else {
        groups[groups.length - 1].logs.push(log);
      }
    }
    return groups;
  }, [filteredLogs, isRTL]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    if (!logs) return { total: 0, today: 0, uniqueAdmins: 0, topAction: '' };
    const todayCount = logs.filter(l => isToday(new Date(l.created_at))).length;
    const uniqueAdmins = new Set(logs.map(l => l.user_id)).size;
    const actionCounts: Record<string, number> = {};
    logs.forEach(l => { actionCounts[l.action] = (actionCounts[l.action] || 0) + 1; });
    const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return { total: logs.length, today: todayCount, uniqueAdmins, topAction };
  }, [logs]);

  const exportToCSV = () => {
    if (!filteredLogs?.length) return;
    const headers = ['التاريخ', 'المشرف', 'العملية', 'نوع الكيان', 'التفاصيل'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      getProfileName(log.user_id),
      actionConfig[log.action]?.ar || log.action,
      log.entity_type ? (entityLabels[log.entity_type]?.ar || log.entity_type) : '',
      formatDetails(log.details)?.map(d => `${d.label}: ${d.value}`).join(' | ') || '',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل-النشاط-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              {isRTL ? 'سجل نشاط المشرفين' : 'Admin Activity Log'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isRTL ? 'تتبع جميع العمليات الإدارية بالتفصيل' : 'Track all admin operations in detail'}
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl"
            onClick={exportToCSV} disabled={!filteredLogs?.length}>
            <Download className="w-3.5 h-3.5" />
            {isRTL ? 'تصدير CSV' : 'Export CSV'}
          </Button>
        </div>

        {/* ─── Stats ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4 transition-all hover:shadow-md group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold leading-none">{stats.total}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{isRTL ? 'إجمالي العمليات' : 'Total Operations'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 transition-all hover:shadow-md group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold leading-none">{stats.today}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{isRTL ? 'عمليات اليوم' : "Today's Operations"}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 transition-all hover:shadow-md group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold leading-none">{stats.uniqueAdmins}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{isRTL ? 'مشرفون نشطون' : 'Active Admins'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-accent/10 to-accent/5 p-4 transition-all hover:shadow-md group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center transition-transform group-hover:scale-110">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-heading font-bold leading-none">{actionConfig[stats.topAction]?.ar || '-'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{isRTL ? 'الأكثر تكراراً' : 'Most Frequent'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Filters ─── */}
        <div className="rounded-2xl border border-border/30 bg-card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input
                placeholder={isRTL ? 'بحث بالاسم، العملية، أو نوع الكيان...' : 'Search by name, action, or entity...'}
                value={searchQuery}
                onChange={e => { const v = e.target.value; startTransition(() => setSearchQuery(v)); }}
                className="ps-10 h-10 rounded-xl bg-muted/30 border-border/20 focus:bg-background transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl">
                <Filter className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{isRTL ? 'جميع العمليات' : 'All Actions'}</SelectItem>
                {Object.entries(actionConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <val.icon className="w-3.5 h-3.5" />
                      {val.ar}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(searchQuery || actionFilter !== 'all') && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
              <span className="text-[11px] text-muted-foreground">{isRTL ? 'النتائج:' : 'Results:'} {filteredLogs.length}</span>
              {searchQuery && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setSearchQuery('')}>"{searchQuery}" <X className="w-2.5 h-2.5" /></Badge>}
              {actionFilter !== 'all' && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setActionFilter('all')}>{actionConfig[actionFilter]?.ar} <X className="w-2.5 h-2.5" /></Badge>}
              <button className="text-[10px] text-primary hover:underline ms-auto"
                onClick={() => { setSearchQuery(''); setActionFilter('all'); }}>
                {isRTL ? 'مسح الكل' : 'Clear all'}
              </button>
            </div>
          )}
        </div>

        {/* ─── Timeline ─── */}
        <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : !filteredLogs.length ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 opacity-30" />
              </div>
              <p className="font-heading font-bold text-sm mb-1">{isRTL ? 'لا توجد سجلات نشاط' : 'No activity logs found'}</p>
              <p className="text-xs">{isRTL ? 'جرّب تعديل معايير البحث' : 'Try adjusting your search criteria'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {groupedLogs.map((group) => (
                <div key={group.label}>
                  {/* Date header */}
                  <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-2 border-b border-border/10">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                      <span className="text-[10px] font-normal ms-2 opacity-70">({group.logs.length})</span>
                    </span>
                  </div>
                  {/* Log items */}
                  <div className="divide-y divide-border/5">
                    {group.logs.map(log => (
                      <LogItem key={log.id} log={log} getProfileName={getProfileName} isRTL={isRTL} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminActivityLog;
