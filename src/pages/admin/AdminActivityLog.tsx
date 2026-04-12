import React, { useState, useMemo, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, Search, Clock, Filter, Download, X,
  Shield, Settings, LogIn, Trash2, Edit, UserPlus, UserMinus,
  Ban, CheckCircle, AlertTriangle, FileText, ChevronDown, ChevronUp,
  TrendingUp, Users, Zap, ArrowRight
} from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

/* ─── Action Config ─── */
const actionConfig: Record<string, { ar: string; color: string; icon: React.ElementType; iconBg: string }> = {
  create:              { ar: 'إنشاء',                  color: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10', icon: FileText },
  update:              { ar: 'تعديل بيانات',           color: 'text-blue-600 dark:text-blue-400',       iconBg: 'bg-blue-500/10',    icon: Edit },
  delete:              { ar: 'حذف',                    color: 'text-red-600 dark:text-red-400',         iconBg: 'bg-red-500/10',     icon: Trash2 },
  login:               { ar: 'تسجيل دخول',             color: 'text-purple-600 dark:text-purple-400',   iconBg: 'bg-purple-500/10',  icon: LogIn },
  role_change:         { ar: 'تغيير صلاحية',           color: 'text-amber-600 dark:text-amber-400',     iconBg: 'bg-amber-500/10',   icon: Shield },
  role_assigned:       { ar: 'منح صلاحية',             color: 'text-amber-600 dark:text-amber-400',     iconBg: 'bg-amber-500/10',   icon: UserPlus },
  role_updated:        { ar: 'تحديث صلاحية',           color: 'text-amber-600 dark:text-amber-400',     iconBg: 'bg-amber-500/10',   icon: Shield },
  role_removed:        { ar: 'سحب صلاحية',             color: 'text-red-600 dark:text-red-400',         iconBg: 'bg-red-500/10',     icon: UserMinus },
  settings:            { ar: 'تعديل إعدادات',          color: 'text-teal-600 dark:text-teal-400',       iconBg: 'bg-teal-500/10',    icon: Settings },
  setting_created:     { ar: 'إنشاء إعداد',            color: 'text-teal-600 dark:text-teal-400',       iconBg: 'bg-teal-500/10',    icon: Settings },
  setting_updated:     { ar: 'تحديث إعداد',            color: 'text-blue-600 dark:text-blue-400',       iconBg: 'bg-blue-500/10',    icon: Settings },
  setting_deleted:     { ar: 'حذف إعداد',              color: 'text-red-600 dark:text-red-400',         iconBg: 'bg-red-500/10',     icon: Settings },
  user_disabled:       { ar: 'تعطيل حساب',             color: 'text-orange-600 dark:text-orange-400',   iconBg: 'bg-orange-500/10',  icon: Ban },
  user_enabled:        { ar: 'تفعيل حساب',             color: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10', icon: CheckCircle },
  unauthorized_access: { ar: 'محاولة وصول غير مصرح',   color: 'text-red-700 dark:text-red-400',         iconBg: 'bg-red-500/15',     icon: AlertTriangle },
};

const entityLabels: Record<string, string> = {
  user: 'مستخدم',
  business: 'نشاط تجاري',
  contract: 'عقد',
  blog_post: 'مقال',
  profile_system: 'نظام بروفايل',
  setting: 'إعداد',
  platform_setting: 'إعداد المنصة',
  role: 'صلاحية',
  user_role: 'صلاحية مستخدم',
  route: 'مسار',
};

const roleLabels: Record<string, string> = {
  admin: 'مشرف',
  super_admin: 'مشرف أعلى',
  user: 'مستخدم',
  moderator: 'مراقب',
};

const fieldLabels: Record<string, string> = {
  full_name: 'الاسم الكامل',
  email: 'البريد الإلكتروني',
  phone: 'رقم الجوال',
  account_type: 'نوع الحساب',
  avatar_url: 'الصورة الشخصية',
  is_active: 'حالة الحساب',
  membership_tier: 'فئة العضوية',
  name_ar: 'الاسم بالعربي',
  name_en: 'الاسم بالإنجليزي',
  status: 'الحالة',
  is_verified: 'التوثيق',
  category_id: 'التصنيف',
};

const accountTypeLabels: Record<string, string> = {
  individual: 'فردي',
  business: 'تجاري',
};

/* ─── Format detail value ─── */
const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (value === true) return 'نعم';
  if (value === false) return 'لا';
  if (accountTypeLabels[value]) return accountTypeLabels[value];
  if (roleLabels[value]) return roleLabels[value];
  return String(value);
};

/* ─── Build readable detail items from log details ─── */
interface DetailItem {
  label: string;
  oldVal?: string;
  newVal?: string;
  value?: string;
}

const buildDetailItems = (details: any, action: string): DetailItem[] => {
  if (!details || typeof details !== 'object') return [];
  const items: DetailItem[] = [];

  // Handle "changes" object (update actions)
  if (details.changes && typeof details.changes === 'object') {
    for (const [field, change] of Object.entries(details.changes)) {
      const label = fieldLabels[field] || field;
      if (change && typeof change === 'object' && 'old' in (change as any)) {
        const c = change as { old: any; new: any };
        items.push({ label, oldVal: formatValue(c.old), newVal: formatValue(c.new) });
      } else {
        items.push({ label, value: formatValue(change) });
      }
    }
  }

  // Handle role fields
  if (details.role) {
    items.push({ label: 'الصلاحية', value: roleLabels[details.role] || details.role });
  }
  if (details.old_role && details.new_role) {
    items.push({ label: 'الصلاحية', oldVal: roleLabels[details.old_role] || details.old_role, newVal: roleLabels[details.new_role] || details.new_role });
  }

  // Handle setting fields
  if (details.setting_key) {
    items.push({ label: 'المفتاح', value: details.setting_key });
  }
  if (details.setting_value !== undefined && details.setting_value !== null) {
    items.push({ label: 'القيمة', value: formatValue(details.setting_value) });
  }
  if (details.old_value !== undefined) {
    items.push({ label: 'القيمة', oldVal: formatValue(details.old_value), newVal: formatValue(details.new_value) });
  }

  // Handle reason
  if (details.reason) {
    items.push({ label: 'السبب', value: details.reason });
  }

  // Handle business name
  if (details.business_name) {
    items.push({ label: 'اسم النشاط', value: details.business_name });
  }

  return items;
};

/* ─── Build a human-readable summary ─── */
const buildSummary = (log: any, getProfileName: (id: string) => string): string => {
  const details = log.details;
  const action = log.action;
  const entityLabel = log.entity_type ? entityLabels[log.entity_type] || log.entity_type : '';

  if (action === 'role_assigned' && details?.role) {
    const targetName = details.target_user_id ? getProfileName(details.target_user_id) : '';
    return `تم منح صلاحية "${roleLabels[details.role] || details.role}" ${targetName ? `للمستخدم ${targetName}` : ''}`;
  }
  if (action === 'role_removed' && details?.role) {
    const targetName = details.target_user_id ? getProfileName(details.target_user_id) : '';
    return `تم سحب صلاحية "${roleLabels[details.role] || details.role}" ${targetName ? `من المستخدم ${targetName}` : ''}`;
  }
  if (action === 'role_updated' && details?.old_role && details?.new_role) {
    const targetName = details.target_user_id ? getProfileName(details.target_user_id) : '';
    return `تم تغيير الصلاحية من "${roleLabels[details.old_role] || details.old_role}" إلى "${roleLabels[details.new_role] || details.new_role}" ${targetName ? `للمستخدم ${targetName}` : ''}`;
  }
  if (action === 'update' && details?.changes) {
    const fields = Object.keys(details.changes).map(f => fieldLabels[f] || f);
    const targetName = details.target_user_id ? getProfileName(details.target_user_id) : '';
    return `تم تعديل ${fields.join('، ')} ${targetName ? `للمستخدم ${targetName}` : ''} ${entityLabel ? `(${entityLabel})` : ''}`;
  }
  if (action === 'user_disabled') {
    const targetName = details?.target_user_id ? getProfileName(details.target_user_id) : '';
    return `تم تعطيل حساب ${targetName || 'المستخدم'}`;
  }
  if (action === 'user_enabled') {
    const targetName = details?.target_user_id ? getProfileName(details.target_user_id) : '';
    return `تم تفعيل حساب ${targetName || 'المستخدم'}`;
  }

  return entityLabel ? `${actionConfig[action]?.ar || action} ${entityLabel}` : (actionConfig[action]?.ar || action);
};

/* ─── Timeline date grouping ─── */
const getDateGroup = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isToday(date)) return 'اليوم';
  if (isYesterday(date)) return 'أمس';
  if (isThisWeek(date)) return 'هذا الأسبوع';
  if (isThisMonth(date)) return 'هذا الشهر';
  return format(date, 'yyyy/MM/dd', { locale: ar });
};

/* ─── Log Item Component ─── */
const LogItem = React.memo(({ log, getProfileName, isRTL }: {
  log: any; getProfileName: (id: string) => string; isRTL: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const config = actionConfig[log.action] || { ar: log.action, color: 'text-muted-foreground', iconBg: 'bg-muted', icon: Activity };
  const ActionIcon = config.icon;
  const summary = buildSummary(log, getProfileName);
  const detailItems = buildDetailItems(log.details, log.action);
  const adminName = getProfileName(log.user_id);
  const hasDetails = detailItems.length > 0;

  return (
    <div className="group relative flex gap-3 py-3.5 px-4 hover:bg-muted/20 transition-colors">
      {/* Timeline dot line */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-9 h-9 rounded-xl ${config.iconBg} ${config.color} flex items-center justify-center`}>
          <ActionIcon className="w-4 h-4" />
        </div>
        <div className="w-px flex-1 bg-border/20 mt-1.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Admin name */}
            <p className="text-[11px] text-muted-foreground mb-0.5">{adminName}</p>
            {/* Summary */}
            <p className="text-sm font-medium text-foreground leading-relaxed">{summary}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pt-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(log.created_at), 'hh:mm a', { locale: ar })}
            </span>
            {hasDetails && (
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
        {expanded && hasDetails && (
          <div className="mt-2.5 rounded-xl bg-muted/20 border border-border/15 p-3 animate-in slide-in-from-top-1 duration-150">
            <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">تفاصيل التغييرات</p>
            <div className="space-y-2">
              {detailItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium shrink-0 min-w-[90px]">{item.label}</span>
                  {item.oldVal !== undefined && item.newVal !== undefined ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-red-500/8 text-red-600 dark:text-red-400 line-through text-[11px]">
                        {item.oldVal}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                        {item.newVal}
                      </span>
                    </div>
                  ) : (
                    <span className="text-foreground">{item.value}</span>
                  )}
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
  const { isRTL } = useLanguage();
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
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email');
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
      const entityLabel = log.entity_type ? (entityLabels[log.entity_type] || log.entity_type).toLowerCase() : '';
      return name.includes(q) || actionLabel.includes(q) || entityLabel.includes(q);
    });
  }, [logs, searchQuery, profiles]);

  const groupedLogs = useMemo(() => {
    const groups: { label: string; logs: typeof filteredLogs }[] = [];
    let currentLabel = '';
    for (const log of filteredLogs) {
      const label = getDateGroup(log.created_at);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, logs: [log] });
      } else {
        groups[groups.length - 1].logs.push(log);
      }
    }
    return groups;
  }, [filteredLogs]);

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
    const headers = ['التاريخ', 'المشرف', 'الوصف', 'التفاصيل'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      getProfileName(log.user_id),
      buildSummary(log, getProfileName),
      buildDetailItems(log.details, log.action).map(d =>
        d.oldVal !== undefined ? `${d.label}: ${d.oldVal} → ${d.newVal}` : `${d.label}: ${d.value}`
      ).join(' | ') || '',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              سجل نشاط المشرفين
            </h1>
            <p className="text-muted-foreground text-sm mt-1">تتبع جميع العمليات الإدارية بالتفصيل</p>
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl"
            onClick={exportToCSV} disabled={!filteredLogs?.length}>
            <Download className="w-3.5 h-3.5" />
            تصدير CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Activity, label: 'إجمالي العمليات', value: stats.total, gradient: 'from-primary/10 to-primary/5', iconBg: 'bg-primary/15 text-primary' },
            { icon: TrendingUp, label: 'عمليات اليوم', value: stats.today, gradient: 'from-emerald-500/10 to-emerald-500/5', iconBg: 'bg-emerald-500/15 text-emerald-600' },
            { icon: Users, label: 'مشرفون نشطون', value: stats.uniqueAdmins, gradient: 'from-blue-500/10 to-blue-500/5', iconBg: 'bg-blue-500/15 text-blue-600' },
            { icon: Zap, label: 'الأكثر تكراراً', value: actionConfig[stats.topAction]?.ar || '—', gradient: 'from-accent/10 to-accent/5', iconBg: 'bg-accent/15 text-accent-foreground' },
          ].map((stat, i) => (
            <div key={i} className={`rounded-2xl border border-border/30 bg-gradient-to-br ${stat.gradient} p-4 transition-all hover:shadow-md group`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-heading font-bold leading-none ${typeof stat.value === 'number' ? 'text-2xl' : 'text-sm'}`}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border/30 bg-card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input
                placeholder="بحث بالاسم أو العملية..."
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
                <SelectItem value="all">جميع العمليات</SelectItem>
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
              <span className="text-[11px] text-muted-foreground">النتائج: {filteredLogs.length}</span>
              {searchQuery && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setSearchQuery('')}>"{searchQuery}" <X className="w-2.5 h-2.5" /></Badge>}
              {actionFilter !== 'all' && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setActionFilter('all')}>{actionConfig[actionFilter]?.ar} <X className="w-2.5 h-2.5" /></Badge>}
              <button className="text-[10px] text-primary hover:underline ms-auto"
                onClick={() => { setSearchQuery(''); setActionFilter('all'); }}>
                مسح الكل
              </button>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-64" />
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
              <p className="font-heading font-bold text-sm mb-1">لا توجد سجلات نشاط</p>
              <p className="text-xs">جرّب تعديل معايير البحث</p>
            </div>
          ) : (
            <div>
              {groupedLogs.map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-2 border-b border-border/10">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                      <span className="text-[10px] font-normal ms-2 opacity-70">({group.logs.length})</span>
                    </span>
                  </div>
                  <div>
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
