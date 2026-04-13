import React, { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Activity, FileText, FolderOpen, Star, CreditCard, Shield, Wrench, Search,
  Calendar, Clock, TrendingUp, Filter, BarChart3, Zap, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import { formatDistanceToNow, format, isThisWeek, isToday, isThisMonth } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const typeIcons: Record<string, React.ElementType> = {
  contract: FileText, project: FolderOpen, review: Star,
  payment: CreditCard, warranty: Shield, maintenance: Wrench,
};

const typeColors: Record<string, string> = {
  contract: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  project: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  payment: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warranty: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  maintenance: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

const opTypeColors: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30',
  status_change: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30',
  review_received: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30',
  payment: 'bg-accent/10 text-accent border-accent/20',
};

const opTypeLabels: Record<string, { ar: string; en: string }> = {
  create: { ar: 'إنشاء', en: 'Create' },
  status_change: { ar: 'تغيير حالة', en: 'Status Change' },
  review_received: { ar: 'تقييم', en: 'Review' },
  payment: { ar: 'دفع', en: 'Payment' },
};

const entityLabels: Record<string, { ar: string; en: string }> = {
  contract: { ar: 'عقد', en: 'Contract' },
  project: { ar: 'مشروع', en: 'Project' },
  review: { ar: 'تقييم', en: 'Review' },
  payment: { ar: 'دفعة', en: 'Payment' },
  warranty: { ar: 'ضمان', en: 'Warranty' },
  maintenance: { ar: 'صيانة', en: 'Maintenance' },
};

/* ── Timeline Item (memo) ── */
const TimelineItem = React.memo(({ op, isRTL, language, isExpanded, onToggle }: {
  op: any; isRTL: boolean; language: string; isExpanded: boolean; onToggle: () => void;
}) => {
  const Icon = typeIcons[op.entity_type] || Activity;
  const colorClass = typeColors[op.entity_type] || 'bg-muted text-muted-foreground';
  const opColor = opTypeColors[op.operation_type] || 'bg-muted/50 text-muted-foreground border-border/30';
  const title = language === 'ar' ? op.title_ar : (op.title_en || op.title_ar);
  const opLabel = opTypeLabels[op.operation_type]?.[isRTL ? 'ar' : 'en'] || op.operation_type;
  const entityLabel = entityLabels[op.entity_type]?.[isRTL ? 'ar' : 'en'] || op.entity_type;
  const timeAgo = formatDistanceToNow(new Date(op.created_at), { addSuffix: true, locale: language === 'ar' ? ar : enUS });
  const fullDate = format(new Date(op.created_at), 'yyyy/MM/dd HH:mm', { locale: language === 'ar' ? ar : enUS });
  const isNew = isToday(new Date(op.created_at));

  return (
    <div className="group relative">
      <Card className={`border-border/40 transition-all duration-200 hover:shadow-sm hover:border-border/60 ${isExpanded ? 'ring-1 ring-primary/10' : ''}`}>
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex items-start gap-2.5">
            {/* Icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass} transition-transform group-hover:scale-105`}>
              <Icon className="w-3.5 h-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <p className="font-medium text-xs text-foreground line-clamp-1 flex items-center gap-1.5">
                  {title}
                  {isNew && <span className="inline-flex w-1.5 h-1.5 rounded-full bg-accent shrink-0 animate-pulse" />}
                </p>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onToggle}>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="outline" className="tech-content text-[8px] px-1.5 py-0 h-[14px] font-mono">
                  {op.ref_id}
                </Badge>
                <Badge className={`text-[8px] px-1.5 py-0 h-[14px] border ${opColor}`}>
                  {opLabel}
                </Badge>
                <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-[14px]">
                  {entityLabel}
                </Badge>
                <span className="text-[9px] text-muted-foreground">{timeAgo}</span>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-2.5 pt-2 border-t border-border/30 space-y-1.5 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-1.5 rounded bg-muted/30 border border-border/20">
                      <p className="text-[8px] text-muted-foreground">{isRTL ? 'التاريخ الكامل' : 'Full Date'}</p>
                      <p className="text-[10px] font-medium tech-content">{fullDate}</p>
                    </div>
                    <div className="p-1.5 rounded bg-muted/30 border border-border/20">
                      <p className="text-[8px] text-muted-foreground">{isRTL ? 'الحالة' : 'Status'}</p>
                      <p className="text-[10px] font-medium">{op.status}</p>
                    </div>
                  </div>
                  {op.details && (
                    <div className="p-1.5 rounded bg-muted/30 border border-border/20">
                      <p className="text-[8px] text-muted-foreground mb-0.5">{isRTL ? 'التفاصيل' : 'Details'}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{typeof op.details === 'string' ? op.details : JSON.stringify(op.details, null, 2)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
TimelineItem.displayName = 'TimelineItem';

/* ── Date Group Header ── */
const DateGroupHeader = React.memo(({ label, count }: { label: string; count: number }) => (
  <div className="flex items-center gap-2 py-1">
    <div className="h-px flex-1 bg-border/40" />
    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
      <Calendar className="w-3 h-3" />{label}
      <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3.5">{count}</Badge>
    </span>
    <div className="h-px flex-1 bg-border/40" />
  </div>
));
DateGroupHeader.displayName = 'DateGroupHeader';

/* ──────────── Main ──────────── */
const DashboardOperations = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterOp, setFilterOp] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations-log', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('operations_log').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    return operations.filter((op) => {
      if (filterType !== 'all' && op.entity_type !== filterType) return false;
      if (filterOp !== 'all' && op.operation_type !== filterOp) return false;
      if (search) {
        const q = search.toLowerCase();
        const title = (language === 'ar' ? op.title_ar : (op.title_en || op.title_ar)) || '';
        if (!title.toLowerCase().includes(q) && !op.ref_id?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [operations, filterType, filterOp, search, language]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: any[] }[] = [];
    let currentLabel = '';
    filtered.slice(0, visibleCount).forEach((op) => {
      const date = new Date(op.created_at);
      let label: string;
      if (isToday(date)) label = isRTL ? 'اليوم' : 'Today';
      else if (isThisWeek(date)) label = isRTL ? 'هذا الأسبوع' : 'This Week';
      else if (isThisMonth(date)) label = isRTL ? 'هذا الشهر' : 'This Month';
      else label = format(date, 'MMMM yyyy', { locale: language === 'ar' ? ar : enUS });

      if (label !== currentLabel) {
        groups.push({ label, items: [op] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].items.push(op);
      }
    });
    return groups;
  }, [filtered, visibleCount, isRTL, language]);

  const stats = useMemo(() => {
    const today = operations.filter((o) => isToday(new Date(o.created_at))).length;
    const thisWeek = operations.filter((o) => isThisWeek(new Date(o.created_at))).length;
    const thisMonth = operations.filter((o) => isThisMonth(new Date(o.created_at))).length;

    // Entity type breakdown
    const byEntity: Record<string, number> = {};
    operations.forEach((o) => { byEntity[o.entity_type] = (byEntity[o.entity_type] || 0) + 1; });
    const topEntity = Object.entries(byEntity).sort((a, b) => b[1] - a[1])[0];

    return { total: operations.length, today, thisWeek, thisMonth, topEntity, byEntity };
  }, [operations]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(c => c + 30);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            {isRTL ? 'سجل العمليات' : 'Operations Log'}
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {isRTL ? 'تتبع جميع نشاطاتك وعملياتك في مكان واحد' : 'Track all your activities and operations in one place'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: isRTL ? 'إجمالي العمليات' : 'Total', value: stats.total, icon: Activity, color: 'text-accent bg-accent/10', trend: null },
            { label: isRTL ? 'اليوم' : 'Today', value: stats.today, icon: Zap, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10', trend: stats.today > 0 ? 'up' : null },
            { label: isRTL ? 'هذا الأسبوع' : 'This Week', value: stats.thisWeek, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10', trend: null },
            { label: isRTL ? 'هذا الشهر' : 'This Month', value: stats.thisMonth, icon: Calendar, color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10', trend: null },
          ].map((stat, i) => (
            <Card key={i} className="border-border/40 bg-card/50 overflow-hidden">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold flex items-center gap-1">
                      <span className="tech-content">{stat.value}</span>
                      {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Entity Breakdown Mini Chart */}
        {Object.keys(stats.byEntity).length > 1 && (
          <Card className="border-border/40 bg-card/50">
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold">{isRTL ? 'توزيع العمليات' : 'Operations Breakdown'}</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(stats.byEntity).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => {
                  const Icon = typeIcons[type] || Activity;
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  const label = entityLabels[type]?.[isRTL ? 'ar' : 'en'] || type;
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRTL ? 'بحث بالعنوان أو الرقم المرجعي...' : 'Search by title or ref...'} className="ps-9 h-8 text-xs" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
              <Filter className="w-3 h-3 me-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All Types'}</SelectItem>
              <SelectItem value="contract">{isRTL ? 'العقود' : 'Contracts'}</SelectItem>
              <SelectItem value="project">{isRTL ? 'المشاريع' : 'Projects'}</SelectItem>
              <SelectItem value="review">{isRTL ? 'التقييمات' : 'Reviews'}</SelectItem>
              <SelectItem value="payment">{isRTL ? 'المدفوعات' : 'Payments'}</SelectItem>
              <SelectItem value="warranty">{isRTL ? 'الضمانات' : 'Warranties'}</SelectItem>
              <SelectItem value="maintenance">{isRTL ? 'الصيانة' : 'Maintenance'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOp} onValueChange={setFilterOp}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل العمليات' : 'All Ops'}</SelectItem>
              <SelectItem value="create">{isRTL ? 'إنشاء' : 'Create'}</SelectItem>
              <SelectItem value="status_change">{isRTL ? 'تغيير حالة' : 'Status Change'}</SelectItem>
              <SelectItem value="review_received">{isRTL ? 'تقييم' : 'Review'}</SelectItem>
              <SelectItem value="payment">{isRTL ? 'دفع' : 'Payment'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-[9px] text-muted-foreground">
            {isRTL ? `عرض ${Math.min(visibleCount, filtered.length)} من ${filtered.length} عملية` : `Showing ${Math.min(visibleCount, filtered.length)} of ${filtered.length} operations`}
          </p>
        )}

        {/* Timeline */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            <p className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Activity className="w-7 h-7 text-primary opacity-50" />
              </div>
              <p className="font-heading font-bold text-foreground mb-1 text-sm">
                {isRTL ? 'لا توجد عمليات بعد' : 'No operations yet'}
              </p>
              <p className="text-xs">
                {isRTL ? 'ستظهر جميع نشاطاتك تلقائياً عند إنشاء العقود والمشاريع' : 'All your activities will appear here automatically'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {grouped.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <DateGroupHeader label={group.label} count={group.items.length} />
                {group.items.map((op) => (
                  <TimelineItem
                    key={op.id} op={op} isRTL={isRTL} language={language}
                    isExpanded={expandedId === op.id}
                    onToggle={() => handleToggle(op.id)}
                  />
                ))}
              </div>
            ))}

            {/* Load More */}
            {visibleCount < filtered.length && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleLoadMore}>
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {isRTL ? `تحميل المزيد (${filtered.length - visibleCount} متبقية)` : `Load More (${filtered.length - visibleCount} remaining)`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardOperations;
