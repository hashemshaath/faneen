import React, { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listProfiles } from '@/modules/users';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, Search, Clock, Filter, Download, X,
  Shield, Settings, LogIn, Trash2, Edit, UserPlus, UserMinus,
  Ban, CheckCircle, AlertTriangle, FileText, ChevronDown, ChevronUp,
  TrendingUp, Users, Zap, ArrowRight, Printer, Radio, Calendar, ExternalLink, RefreshCw
} from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, subDays, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useNoIndex } from "@/hooks/useNoIndex";
import { BarChart, Bar, XAxis, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { AdminOpsQuickLinks } from '@/components/admin/AdminOpsQuickLinks';

/* ─── Action Config ─── */
type Bi = { ar: string; en: string };
const actionConfig: Record<string, Bi & { color: string; icon: React.ElementType; iconBg: string }> = {
  create:              { ar: 'إنشاء',                  en: 'Create',              color: 'text-success dark:text-success', iconBg: 'bg-success/10', icon: FileText },
  update:              { ar: 'تعديل بيانات',           en: 'Update',              color: 'text-info dark:text-info',       iconBg: 'bg-info/10',    icon: Edit },
  delete:              { ar: 'حذف',                    en: 'Delete',              color: 'text-destructive dark:text-destructive',         iconBg: 'bg-destructive/10',     icon: Trash2 },
  login:               { ar: 'تسجيل دخول',             en: 'Login',               color: 'text-secondary dark:text-secondary',   iconBg: 'bg-secondary/10',  icon: LogIn },
  role_change:         { ar: 'تغيير صلاحية',           en: 'Role change',         color: 'text-warning dark:text-warning',     iconBg: 'bg-warning/10',   icon: Shield },
  role_assigned:       { ar: 'منح صلاحية',             en: 'Role assigned',       color: 'text-warning dark:text-warning',     iconBg: 'bg-warning/10',   icon: UserPlus },
  role_updated:        { ar: 'تحديث صلاحية',           en: 'Role updated',        color: 'text-warning dark:text-warning',     iconBg: 'bg-warning/10',   icon: Shield },
  role_removed:        { ar: 'سحب صلاحية',             en: 'Role removed',        color: 'text-destructive dark:text-destructive',         iconBg: 'bg-destructive/10',     icon: UserMinus },
  settings:            { ar: 'تعديل إعدادات',          en: 'Settings change',     color: 'text-success dark:text-success',       iconBg: 'bg-success/10',    icon: Settings },
  setting_created:     { ar: 'إنشاء إعداد',            en: 'Setting created',     color: 'text-success dark:text-success',       iconBg: 'bg-success/10',    icon: Settings },
  setting_updated:     { ar: 'تحديث إعداد',            en: 'Setting updated',     color: 'text-info dark:text-info',       iconBg: 'bg-info/10',    icon: Settings },
  setting_deleted:     { ar: 'حذف إعداد',              en: 'Setting deleted',     color: 'text-destructive dark:text-destructive',         iconBg: 'bg-destructive/10',     icon: Settings },
  user_disabled:       { ar: 'تعطيل حساب',             en: 'Account disabled',    color: 'text-urgent dark:text-urgent',   iconBg: 'bg-urgent/10',  icon: Ban },
  user_enabled:        { ar: 'تفعيل حساب',             en: 'Account enabled',     color: 'text-success dark:text-success', iconBg: 'bg-success/10', icon: CheckCircle },
  unauthorized_access: { ar: 'محاولة وصول غير مصرح',   en: 'Unauthorized access', color: 'text-destructive dark:text-destructive',         iconBg: 'bg-destructive/15',     icon: AlertTriangle },
};

const entityLabels: Record<string, Bi> = {
  user:             { ar: 'مستخدم',         en: 'User' },
  business:         { ar: 'نشاط تجاري',     en: 'Business' },
  contract:         { ar: 'عقد',            en: 'Contract' },
  blog_post:        { ar: 'مقال',           en: 'Blog post' },
  profile_system:   { ar: 'نظام بروفايل',   en: 'Profile system' },
  setting:          { ar: 'إعداد',          en: 'Setting' },
  platform_setting: { ar: 'إعداد المنصة',   en: 'Platform setting' },
  role:             { ar: 'صلاحية',         en: 'Role' },
  user_role:        { ar: 'صلاحية مستخدم',  en: 'User role' },
  route:            { ar: 'مسار',           en: 'Route' },
};

const roleLabels: Record<string, Bi> = {
  admin:       { ar: 'مشرف',       en: 'Admin' },
  super_admin: { ar: 'مشرف أعلى',  en: 'Super Admin' },
  user:        { ar: 'مستخدم',     en: 'User' },
  moderator:   { ar: 'مراقب',      en: 'Moderator' },
};

const fieldLabels: Record<string, Bi> = {
  full_name:       { ar: 'الاسم الكامل',       en: 'Full name' },
  email:           { ar: 'البريد الإلكتروني',  en: 'Email' },
  phone:           { ar: 'رقم الجوال',         en: 'Phone' },
  account_type:    { ar: 'نوع الحساب',         en: 'Account type' },
  avatar_url:      { ar: 'الصورة الشخصية',     en: 'Avatar' },
  is_active:       { ar: 'حالة الحساب',        en: 'Active status' },
  membership_tier: { ar: 'فئة العضوية',        en: 'Membership tier' },
  name_ar:         { ar: 'الاسم بالعربي',      en: 'Name (AR)' },
  name_en:         { ar: 'الاسم بالإنجليزي',  en: 'Name (EN)' },
  status:          { ar: 'الحالة',             en: 'Status' },
  is_verified:     { ar: 'التوثيق',            en: 'Verified' },
  category_id:     { ar: 'التصنيف',            en: 'Category' },
};

const accountTypeLabels: Record<string, Bi> = {
  individual: { ar: 'فردي',  en: 'Individual' },
  business:   { ar: 'تجاري', en: 'Business' },
};

const pick = (b: Bi | undefined, isRTL: boolean, fallback: string): string =>
  b ? (isRTL ? b.ar : b.en) : fallback;

const tx = {
  yes: { ar: 'نعم', en: 'Yes' },
  no: { ar: 'لا', en: 'No' },
  role: { ar: 'الصلاحية', en: 'Role' },
  key: { ar: 'المفتاح', en: 'Key' },
  value: { ar: 'القيمة', en: 'Value' },
  reason: { ar: 'السبب', en: 'Reason' },
  businessName: { ar: 'اسم النشاط', en: 'Business name' },
  system: { ar: 'النظام (تلقائي)', en: 'System (auto)' },
  user: { ar: 'مستخدم', en: 'User' },
  today: { ar: 'اليوم', en: 'Today' },
  yesterday: { ar: 'أمس', en: 'Yesterday' },
  thisWeek: { ar: 'هذا الأسبوع', en: 'This week' },
  thisMonth: { ar: 'هذا الشهر', en: 'This month' },
  title: { ar: 'سجل نشاط المشرفين', en: 'Admin Activity Log' },
  subtitle: { ar: 'تتبع جميع العمليات الإدارية بالتفصيل', en: 'Track all admin operations in detail' },
  exportCsv: { ar: 'تصدير CSV', en: 'Export CSV' },
  totalOps: { ar: 'إجمالي العمليات', en: 'Total operations' },
  todayOps: { ar: 'عمليات اليوم', en: "Today's operations" },
  activeAdmins: { ar: 'مشرفون نشطون', en: 'Active admins' },
  topAction: { ar: 'الأكثر تكراراً', en: 'Most frequent' },
  searchPh: { ar: 'بحث بالاسم أو العملية...', en: 'Search by name or action...' },
  allOps: { ar: 'جميع العمليات', en: 'All operations' },
  results: { ar: 'النتائج', en: 'Results' },
  clearAll: { ar: 'مسح الكل', en: 'Clear all' },
  empty: { ar: 'لا توجد سجلات نشاط', en: 'No activity logs' },
  emptySub: { ar: 'جرّب تعديل معايير البحث', en: 'Try adjusting your search' },
  detailsHeader: { ar: 'تفاصيل التغييرات', en: 'Change details' },
  csvDate: { ar: 'التاريخ', en: 'Date' },
  csvAdmin: { ar: 'المشرف', en: 'Admin' },
  csvDesc: { ar: 'الوصف', en: 'Description' },
  csvDetails: { ar: 'التفاصيل', en: 'Details' },
  csvFile: { ar: 'سجل-النشاط', en: 'activity-log' },
  // Extended labels
  range: { ar: 'الفترة', en: 'Range' },
  rangeAll: { ar: 'الكل', en: 'All time' },
  range24h: { ar: 'آخر 24 ساعة', en: 'Last 24h' },
  range7d: { ar: 'آخر 7 أيام', en: 'Last 7 days' },
  range30d: { ar: 'آخر 30 يوم', en: 'Last 30 days' },
  admin: { ar: 'المشرف', en: 'Admin' },
  allAdmins: { ar: 'جميع المشرفين', en: 'All admins' },
  entity: { ar: 'الكيان', en: 'Entity' },
  allEntities: { ar: 'جميع الكيانات', en: 'All entities' },
  loadMore: { ar: 'تحميل المزيد', en: 'Load more' },
  liveOn: { ar: 'مباشر', en: 'Live' },
  liveOff: { ar: 'إيقاف', en: 'Paused' },
  print: { ar: 'طباعة', en: 'Print' },
  refresh: { ar: 'تحديث', en: 'Refresh' },
  chartTitle: { ar: 'النشاط خلال آخر 24 ساعة', en: 'Activity in the last 24 hours' },
  chartEmpty: { ar: 'لا يوجد نشاط في هذه الفترة', en: 'No activity in this range' },
  viewUser: { ar: 'فتح صفحة المستخدم', en: 'Open user page' },
  // Phrase builders (sentence templates)
  granted: { ar: (r: string, t: string) => `تم منح صلاحية "${r}" ${t ? `للمستخدم ${t}` : ''}`, en: (r: string, t: string) => `Granted role "${r}"${t ? ` to ${t}` : ''}` },
  revoked: { ar: (r: string, t: string) => `تم سحب صلاحية "${r}" ${t ? `من المستخدم ${t}` : ''}`, en: (r: string, t: string) => `Revoked role "${r}"${t ? ` from ${t}` : ''}` },
  changedRole: { ar: (o: string, n: string, t: string) => `تم تغيير الصلاحية من "${o}" إلى "${n}" ${t ? `للمستخدم ${t}` : ''}`, en: (o: string, n: string, t: string) => `Changed role from "${o}" to "${n}"${t ? ` for ${t}` : ''}` },
  edited: { ar: (f: string, t: string, e: string) => `تم تعديل ${f} ${t ? `للمستخدم ${t}` : ''} ${e ? `(${e})` : ''}`, en: (f: string, t: string, e: string) => `Edited ${f}${t ? ` for ${t}` : ''}${e ? ` (${e})` : ''}` },
  disabled: { ar: (t: string) => `تم تعطيل حساب ${t || 'المستخدم'}`, en: (t: string) => `Disabled account ${t || 'user'}` },
  enabled: { ar: (t: string) => `تم تفعيل حساب ${t || 'المستخدم'}`, en: (t: string) => `Enabled account ${t || 'user'}` },
};

/* ─── Format detail value ─── */
const formatValue = (value: unknown, isRTL: boolean): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (value === true) return isRTL ? tx.yes.ar : tx.yes.en;
  if (value === false) return isRTL ? tx.no.ar : tx.no.en;
  const strVal = String(value);
  if (accountTypeLabels[strVal]) return pick(accountTypeLabels[strVal], isRTL, strVal);
  if (roleLabels[strVal]) return pick(roleLabels[strVal], isRTL, strVal);
  return strVal;
};

/* ─── Build readable detail items from log details ─── */
interface DetailItem {
  label: string;
  oldVal?: string;
  newVal?: string;
  value?: string;
}

const buildDetailItems = (details: any, action: string, isRTL: boolean): DetailItem[] => {
  if (!details || typeof details !== 'object') return [];
  const items: DetailItem[] = [];

  // Handle "changes" object (update actions)
  if (details.changes && typeof details.changes === 'object') {
    for (const [field, change] of Object.entries(details.changes)) {
      const label = pick(fieldLabels[field], isRTL, field);
      if (change && typeof change === 'object' && 'old' in (change as any)) {
        const c = change as { old: unknown; new: unknown };
        items.push({ label, oldVal: formatValue(c.old, isRTL), newVal: formatValue(c.new, isRTL) });
      } else {
        items.push({ label, value: formatValue(change, isRTL) });
      }
    }
  }

  // Handle role fields
  if (details.role) {
    items.push({ label: pick(tx.role, isRTL, 'Role'), value: pick(roleLabels[details.role], isRTL, details.role) });
  }
  if (details.old_role && details.new_role) {
    items.push({ label: pick(tx.role, isRTL, 'Role'), oldVal: pick(roleLabels[details.old_role], isRTL, details.old_role), newVal: pick(roleLabels[details.new_role], isRTL, details.new_role) });
  }

  // Handle setting fields
  if (details.setting_key) {
    items.push({ label: pick(tx.key, isRTL, 'Key'), value: details.setting_key });
  }
  if (details.setting_value !== undefined && details.setting_value !== null) {
    items.push({ label: pick(tx.value, isRTL, 'Value'), value: formatValue(details.setting_value, isRTL) });
  }
  if (details.old_value !== undefined) {
    items.push({ label: pick(tx.value, isRTL, 'Value'), oldVal: formatValue(details.old_value, isRTL), newVal: formatValue(details.new_value, isRTL) });
  }

  // Handle reason
  if (details.reason) {
    items.push({ label: pick(tx.reason, isRTL, 'Reason'), value: details.reason });
  }

  // Handle business name
  if (details.business_name) {
    items.push({ label: pick(tx.businessName, isRTL, 'Business name'), value: details.business_name });
  }

  return items;
};

/* ─── Build a human-readable summary ─── */
const buildSummary = (log: any, getProfileName: (id: string) => string, isRTL: boolean): string => {
  const details = log.details;
  const action = log.action;
  const entityLabel = log.entity_type ? pick(entityLabels[log.entity_type], isRTL, log.entity_type) : '';

  if (action === 'role_assigned' && details?.role) {
    const targetName = details.target_user_id ? getProfileName(details.target_user_id) : '';
    const r = pick(roleLabels[details.role], isRTL, details.role);
    return (isRTL ? tx.granted.ar : tx.granted.en)(r, targetName);
  }
  if (action === 'role_removed' && details?.role) {
    const targetName = details.target_user_id ? getProfileName(details.target_user_id) : '';
    const r = pick(roleLabels[details.role], isRTL, details.role);
    return (isRTL ? tx.revoked.ar : tx.revoked.en)(r, targetName);
  }
  if (action === 'role_updated' && details?.old_role && details?.new_role) {
    const targetName = details.target_user_id ? getProfileName(details.target_user_id) : '';
    const o = pick(roleLabels[details.old_role], isRTL, details.old_role);
    const n = pick(roleLabels[details.new_role], isRTL, details.new_role);
    return (isRTL ? tx.changedRole.ar : tx.changedRole.en)(o, n, targetName);
  }
  if (action === 'update' && details?.changes) {
    const fields = Object.keys(details.changes).map(f => pick(fieldLabels[f], isRTL, f));
    const targetName = details.target_user_id ? getProfileName(details.target_user_id) : '';
    const sep = isRTL ? '، ' : ', ';
    return (isRTL ? tx.edited.ar : tx.edited.en)(fields.join(sep), targetName, entityLabel);
  }
  if (action === 'user_disabled') {
    const targetName = details?.target_user_id ? getProfileName(details.target_user_id) : '';
    return (isRTL ? tx.disabled.ar : tx.disabled.en)(targetName);
  }
  if (action === 'user_enabled') {
    const targetName = details?.target_user_id ? getProfileName(details.target_user_id) : '';
    return (isRTL ? tx.enabled.ar : tx.enabled.en)(targetName);
  }

  const actLabel = pick(actionConfig[action], isRTL, action);
  return entityLabel ? `${actLabel} ${entityLabel}` : actLabel;
};

/* ─── Timeline date grouping ─── */
const getDateGroup = (dateStr: string, isRTL: boolean): string => {
  const date = new Date(dateStr);
  if (isToday(date)) return isRTL ? tx.today.ar : tx.today.en;
  if (isYesterday(date)) return isRTL ? tx.yesterday.ar : tx.yesterday.en;
  if (isThisWeek(date)) return isRTL ? tx.thisWeek.ar : tx.thisWeek.en;
  if (isThisMonth(date)) return isRTL ? tx.thisMonth.ar : tx.thisMonth.en;
  return format(date, 'yyyy/MM/dd', { locale: isRTL ? ar : enUS });
};

/* ─── Log Item Component ─── */
const LogItem = React.memo(({ log, getProfileName, isRTL }: {
  log: any; getProfileName: (id: string) => string; isRTL: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const config = actionConfig[log.action] || { ar: log.action, en: log.action, color: 'text-muted-foreground', iconBg: 'bg-muted', icon: Activity };
  const ActionIcon = config.icon;
  const summary = buildSummary(log, getProfileName, isRTL);
  const detailItems = buildDetailItems(log.details, log.action, isRTL);
  const adminName = getProfileName(log.user_id);
  const hasDetails = detailItems.length > 0;
  const targetUserId: string | undefined = log.details?.target_user_id;

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
            <p className="text-[11px] text-muted-foreground mb-0.5">
              {log.user_id && log.user_id !== '00000000-0000-0000-0000-000000000000' ? (
                <Link to={`/admin/users/${log.user_id}`} className="hover:underline hover:text-foreground transition-colors">
                  {adminName}
                </Link>
              ) : (
                <span>{adminName}</span>
              )}
            </p>
            {/* Summary */}
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {summary}
              {targetUserId && (
                <Link
                  to={`/admin/users/${targetUserId}`}
                  className="inline-flex items-center gap-1 ms-2 text-[10px] text-primary hover:underline align-middle"
                  title={isRTL ? tx.viewUser.ar : tx.viewUser.en}
                >
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pt-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(log.created_at), 'hh:mm a', { locale: isRTL ? ar : enUS })}
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
            <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">{isRTL ? tx.detailsHeader.ar : tx.detailsHeader.en}</p>
            <div className="space-y-2">
              {detailItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium shrink-0 min-w-[90px]">{item.label}</span>
                  {item.oldVal !== undefined && item.newVal !== undefined ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-destructive/8 text-destructive dark:text-destructive line-through text-[11px]">
                        {item.oldVal}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="px-2 py-0.5 rounded-md bg-success/8 text-success dark:text-success text-[11px] font-medium">
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
  useNoIndex();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState<'all' | '24h' | '7d' | '30d'>('7d');
  const [pageSize, setPageSize] = useState(200);
  const [liveOn, setLiveOn] = useState(true);
  const [, startTransition] = useTransition();

  const sinceIso = useMemo(() => {
    if (rangeFilter === 'all') return null;
    const now = new Date();
    if (rangeFilter === '24h') return subDays(now, 1).toISOString();
    if (rangeFilter === '7d') return subDays(now, 7).toISOString();
    return subDays(now, 30).toISOString();
  }, [rangeFilter]);

  const { data: logs, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-activity-log', actionFilter, entityFilter, adminFilter, rangeFilter, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(pageSize);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
      if (adminFilter !== 'all') query = query.eq('user_id', adminFilter);
      if (sinceIso) query = query.gte('created_at', sinceIso);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await listProfiles<{ user_id: string; full_name: string | null; email: string | null }>({
        select: 'user_id, full_name, email',
      });
      if (error) throw error;
      return data;
    },
  });

  // Realtime: invalidate query on new inserts
  useEffect(() => {
    if (!liveOn) return;
    const channel = supabase
      .channel('admin-activity-log-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_activity_log' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-activity-log'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [liveOn, queryClient]);

  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

  const getProfileName = useCallback((userId: string) => {
    if (userId === SYSTEM_USER_ID) return isRTL ? tx.system.ar : tx.system.en;
    const profile = profiles?.find(p => p.user_id === userId);
    return profile?.full_name || profile?.email || `${isRTL ? tx.user.ar : tx.user.en} #${userId.slice(0, 6)}`;
  }, [profiles, isRTL]);

  // Unique admins for filter dropdown (from current page of logs)
  const adminOptions = useMemo(() => {
    if (!logs) return [];
    const ids = Array.from(new Set(logs.map(l => l.user_id))).filter(Boolean);
    return ids.map(id => ({ id, name: getProfileName(id) }));
  }, [logs, getProfileName]);

  // Unique entities for filter dropdown
  const entityOptions = useMemo(() => {
    if (!logs) return [];
    return Array.from(new Set(logs.map(l => l.entity_type).filter(Boolean))) as string[];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(log => {
      const name = getProfileName(log.user_id).toLowerCase();
      const actionLabel = pick(actionConfig[log.action], isRTL, log.action).toLowerCase();
      const entityLabel = log.entity_type ? pick(entityLabels[log.entity_type], isRTL, log.entity_type).toLowerCase() : '';
      return name.includes(q) || actionLabel.includes(q) || entityLabel.includes(q);
    });
  }, [logs, searchQuery, getProfileName, isRTL]);

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

  const stats = useMemo(() => {
    if (!logs) return { total: 0, today: 0, uniqueAdmins: 0, topAction: '' };
    const todayCount = logs.filter(l => isToday(new Date(l.created_at))).length;
    const uniqueAdmins = new Set(logs.map(l => l.user_id)).size;
    const actionCounts: Record<string, number> = {};
    logs.forEach(l => { actionCounts[l.action] = (actionCounts[l.action] || 0) + 1; });
    const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return { total: logs.length, today: todayCount, uniqueAdmins, topAction };
  }, [logs]);

  // Hourly buckets for last 24h chart
  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: { hour: string; count: number; key: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      buckets.push({
        key: startOfDay(d).getTime() + d.getHours() * 3600000,
        hour: format(d, 'HH', { locale: isRTL ? ar : enUS }),
        count: 0,
      });
    }
    if (logs) {
      const since = now.getTime() - 24 * 60 * 60 * 1000;
      logs.forEach(l => {
        const t = new Date(l.created_at).getTime();
        if (t < since) return;
        const d = new Date(t);
        const k = startOfDay(d).getTime() + d.getHours() * 3600000;
        const b = buckets.find(x => x.key === k);
        if (b) b.count += 1;
      });
    }
    return buckets;
  }, [logs, isRTL]);

  const exportToCSV = () => {
    if (!filteredLogs?.length) return;
    const headers = [
      isRTL ? tx.csvDate.ar : tx.csvDate.en,
      isRTL ? tx.csvAdmin.ar : tx.csvAdmin.en,
      isRTL ? tx.csvDesc.ar : tx.csvDesc.en,
      isRTL ? tx.csvDetails.ar : tx.csvDetails.en,
    ];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      getProfileName(log.user_id),
      buildSummary(log, getProfileName, isRTL),
      buildDetailItems(log.details, log.action, isRTL).map(d =>
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
    a.download = `${isRTL ? tx.csvFile.ar : tx.csvFile.en}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllFilters = () => {
    setSearchQuery(''); setActionFilter('all'); setEntityFilter('all'); setAdminFilter('all'); setRangeFilter('all');
  };
  const hasActiveFilters = !!searchQuery || actionFilter !== 'all' || entityFilter !== 'all' || adminFilter !== 'all' || rangeFilter !== 'all';

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-3">
        <AdminOpsQuickLinks />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              {isRTL ? tx.title.ar : tx.title.en}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{isRTL ? tx.subtitle.ar : tx.subtitle.en}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
              variant={liveOn ? 'default' : 'outline'} size="sm"
              className="h-9 text-xs gap-1.5 rounded-xl"
              onClick={() => setLiveOn(v => !v)}
              aria-pressed={liveOn}
            >
              <Radio className={`w-3.5 h-3.5 ${liveOn ? 'animate-pulse' : ''}`} />
              {liveOn ? (isRTL ? tx.liveOn.ar : tx.liveOn.en) : (isRTL ? tx.liveOff.ar : tx.liveOff.en)}
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl"
              onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isRTL ? tx.refresh.ar : tx.refresh.en}
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl"
              onClick={() => window.print()} disabled={!filteredLogs?.length}>
              <Printer className="w-3.5 h-3.5" />
              {isRTL ? tx.print.ar : tx.print.en}
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl"
              onClick={exportToCSV} disabled={!filteredLogs?.length}>
              <Download className="w-3.5 h-3.5" />
              {isRTL ? tx.exportCsv.ar : tx.exportCsv.en}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Activity, label: isRTL ? tx.totalOps.ar : tx.totalOps.en, value: stats.total, gradient: 'from-primary/10 to-primary/5', iconBg: 'bg-primary/15 text-primary' },
            { icon: TrendingUp, label: isRTL ? tx.todayOps.ar : tx.todayOps.en, value: stats.today, gradient: 'from-success/10 to-success/5', iconBg: 'bg-success/15 text-success' },
            { icon: Users, label: isRTL ? tx.activeAdmins.ar : tx.activeAdmins.en, value: stats.uniqueAdmins, gradient: 'from-info/10 to-info/5', iconBg: 'bg-info/15 text-info' },
            { icon: Zap, label: isRTL ? tx.topAction.ar : tx.topAction.en, value: pick(actionConfig[stats.topAction], isRTL, '—'), gradient: 'from-accent/10 to-accent/5', iconBg: 'bg-accent/15 text-accent-foreground' },
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

        {/* Chart */}
        <div className="rounded-2xl border border-border/30 bg-card p-4 print:hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isRTL ? tx.chartTitle.ar : tx.chartTitle.en}
            </p>
          </div>
          {chartData.every(d => d.count === 0) ? (
            <p className="text-xs text-muted-foreground text-center py-8">{isRTL ? tx.chartEmpty.ar : tx.chartEmpty.en}</p>
          ) : (
            <div className="w-full h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={2} />
                  <ChartTooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [v, isRTL ? 'العمليات' : 'Operations']}
                    labelFormatter={(l) => `${l}:00`}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border/30 bg-card p-4 print:hidden">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ insetInlineStart: '12px' }} />
              <Input
                placeholder={isRTL ? tx.searchPh.ar : tx.searchPh.en}
                value={searchQuery}
                onChange={e => { const v = e.target.value; startTransition(() => setSearchQuery(v)); }}
                className="ps-10 h-10 rounded-xl bg-muted/30 border-border/20 focus:bg-background transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" style={{ insetInlineEnd: '10px' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Select value={rangeFilter} onValueChange={(v) => setRangeFilter(v as typeof rangeFilter)}>
              <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl">
                <Calendar className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{isRTL ? tx.rangeAll.ar : tx.rangeAll.en}</SelectItem>
                <SelectItem value="24h">{isRTL ? tx.range24h.ar : tx.range24h.en}</SelectItem>
                <SelectItem value="7d">{isRTL ? tx.range7d.ar : tx.range7d.en}</SelectItem>
                <SelectItem value="30d">{isRTL ? tx.range30d.ar : tx.range30d.en}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl">
                <Filter className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{isRTL ? tx.allOps.ar : tx.allOps.en}</SelectItem>
                {Object.entries(actionConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <val.icon className="w-3.5 h-3.5" />
                      {isRTL ? val.ar : val.en}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full sm:w-[170px] h-10 rounded-xl">
                <FileText className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{isRTL ? tx.allEntities.ar : tx.allEntities.en}</SelectItem>
                {entityOptions.map(e => (
                  <SelectItem key={e} value={e}>{pick(entityLabels[e], isRTL, e)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl">
                <Users className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue placeholder={isRTL ? tx.allAdmins.ar : tx.allAdmins.en} />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-72">
                <SelectItem value="all">{isRTL ? tx.allAdmins.ar : tx.allAdmins.en}</SelectItem>
                {adminOptions.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
              <span className="text-[11px] text-muted-foreground">{isRTL ? tx.results.ar : tx.results.en}: {filteredLogs.length}</span>
              {searchQuery && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setSearchQuery('')}>"{searchQuery}" <X className="w-2.5 h-2.5" /></Badge>}
              {actionFilter !== 'all' && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setActionFilter('all')}>{pick(actionConfig[actionFilter], isRTL, actionFilter)} <X className="w-2.5 h-2.5" /></Badge>}
              {entityFilter !== 'all' && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setEntityFilter('all')}>{pick(entityLabels[entityFilter], isRTL, entityFilter)} <X className="w-2.5 h-2.5" /></Badge>}
              {adminFilter !== 'all' && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setAdminFilter('all')}>{getProfileName(adminFilter)} <X className="w-2.5 h-2.5" /></Badge>}
              {rangeFilter !== 'all' && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setRangeFilter('all')}>{rangeFilter} <X className="w-2.5 h-2.5" /></Badge>}
              <button className="text-[10px] text-primary hover:underline ms-auto"
                onClick={clearAllFilters}>
                {isRTL ? tx.clearAll.ar : tx.clearAll.en}
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
              <p className="font-heading font-bold text-sm mb-1">{isRTL ? tx.empty.ar : tx.empty.en}</p>
              <p className="text-xs">{isRTL ? tx.emptySub.ar : tx.emptySub.en}</p>
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
              {logs && logs.length >= pageSize && (
                <div className="p-4 text-center border-t border-border/20 print:hidden">
                  <Button variant="outline" size="sm" className="h-9 text-xs rounded-xl"
                    onClick={() => setPageSize(p => p + 200)} disabled={isFetching}>
                    {isFetching ? <RefreshCw className="w-3.5 h-3.5 animate-spin me-1.5" /> : null}
                    {isRTL ? tx.loadMore.ar : tx.loadMore.en}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminActivityLog;

