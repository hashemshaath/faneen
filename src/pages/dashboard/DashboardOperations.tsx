import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, FileText, FolderOpen, Star, CreditCard, Shield, Wrench, Search,
  Calendar, Clock, TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const typeIcons: Record<string, React.ElementType> = {
  contract: FileText,
  project: FolderOpen,
  review: Star,
  payment: CreditCard,
  warranty: Shield,
  maintenance: Wrench,
};

const opTypeColors: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  status_change: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  review_received: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  payment: 'bg-accent/10 text-accent',
};

const opTypeLabels: Record<string, { ar: string; en: string }> = {
  create: { ar: 'إنشاء', en: 'Create' },
  status_change: { ar: 'تغيير حالة', en: 'Status Change' },
  review_received: { ar: 'تقييم', en: 'Review' },
  payment: { ar: 'دفع', en: 'Payment' },
};

const DashboardOperations = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations-log', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('operations_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    return operations.filter((op: any) => {
      if (filterType !== 'all' && op.entity_type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        const title = (language === 'ar' ? op.title_ar : (op.title_en || op.title_ar)) || '';
        if (!title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [operations, filterType, search, language]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return operations.filter((op: any) => {
      const d = new Date(op.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [operations]);

  const entityTypes = useMemo(() => {
    const types = new Set(operations.map((op: any) => op.entity_type));
    return Array.from(types);
  }, [operations]);

  const stats = [
    { label: isRTL ? 'إجمالي العمليات' : 'Total', value: operations.length, icon: Activity, color: 'text-accent' },
    { label: isRTL ? 'هذا الشهر' : 'This Month', value: thisMonth.length, icon: Calendar, color: 'text-blue-600 dark:text-blue-400' },
    { label: isRTL ? 'العقود' : 'Contracts', value: operations.filter((o: any) => o.entity_type === 'contract').length, icon: FileText, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: isRTL ? 'التقييمات' : 'Reviews', value: operations.filter((o: any) => o.entity_type === 'review').length, icon: Star, color: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            {isRTL ? 'سجل العمليات' : 'Operations Log'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isRTL ? 'تتبع جميع نشاطاتك وعملياتك في مكان واحد' : 'Track all your activities and operations in one place'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <Card key={i} className="border-border/40">
              <div className="p-3 sm:p-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className={`text-lg sm:text-xl font-bold ${stat.color}`}>
                  <span className="tech-content">{stat.value}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isRTL ? 'بحث في العمليات...' : 'Search operations...'}
              className="ps-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
              <SelectItem value="contract">{isRTL ? 'العقود' : 'Contracts'}</SelectItem>
              <SelectItem value="project">{isRTL ? 'المشاريع' : 'Projects'}</SelectItem>
              <SelectItem value="review">{isRTL ? 'التقييمات' : 'Reviews'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            <p>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-heading font-bold text-foreground mb-1">
                {isRTL ? 'لا توجد عمليات بعد' : 'No operations yet'}
              </p>
              <p className="text-sm">
                {isRTL ? 'ستظهر جميع نشاطاتك تلقائياً عند إنشاء العقود والمشاريع' : 'All your activities will appear here automatically'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((op: any) => {
              const Icon = typeIcons[op.entity_type] || Activity;
              const colorClass = opTypeColors[op.operation_type] || 'bg-muted text-muted-foreground';
              const title = language === 'ar' ? op.title_ar : (op.title_en || op.title_ar);
              const opLabel = opTypeLabels[op.operation_type]?.[isRTL ? 'ar' : 'en'] || op.operation_type;
              const timeAgo = formatDistanceToNow(new Date(op.created_at), {
                addSuffix: true,
                locale: language === 'ar' ? ar : enUS,
              });

              return (
                <Card key={op.id} className="border-border/40 hover:bg-muted/20 transition-colors">
                  <div className="p-3 sm:p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground line-clamp-1">{title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="tech-content text-[9px] px-1.5 py-0 h-4">
                          {op.ref_id}
                        </Badge>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                          {opLabel}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardOperations;
