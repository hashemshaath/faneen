import { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listProfiles } from '@/modules/users';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, Search, Filter, Download, X,
  FileText, TrendingUp, Users, Zap, Printer, Radio, Calendar, RefreshCw,
} from 'lucide-react';
import { format, isToday, subDays, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useNoIndex } from '@/hooks/useNoIndex';
import { BarChart, Bar, XAxis, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { AdminOpsQuickLinks } from '@/components/admin/AdminOpsQuickLinks';
import { type AdminActivityLogRow } from './adminActivityLog.types';
import {
  OperationsAdminPageShell,
  OperationsStatsStrip,
  OperationsFiltersBar,
  type OperationsStatItem,
  type OperationsSelectOption,
} from '@/components/admin/ops';
import {
  AdminActivityLogTimelineSection,
  actionConfig,
  entityLabels,
  pick,
  tx,
  buildSummary,
  buildDetailItems,
  getDateGroup,
} from '@/components/admin/ops/logs';

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

  const adminOptions = useMemo(() => {
    if (!logs) return [];
    const ids = Array.from(new Set(logs.map(l => l.user_id))).filter(Boolean);
    return ids.map(id => ({ id, name: getProfileName(id) }));
  }, [logs, getProfileName]);

  const entityOptions = useMemo(() => {
    if (!logs) return [];
    return Array.from(new Set(logs.map(l => l.entity_type).filter(Boolean))) as string[];
  }, [logs]);

  const filteredLogs = useMemo<AdminActivityLogRow[]>(() => {
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
    const groups: { label: string; logs: AdminActivityLogRow[] }[] = [];
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

  const statItems: OperationsStatItem[] = [
    { key: 'total', label: isRTL ? tx.totalOps.ar : tx.totalOps.en, value: stats.total, icon: Activity, tone: 'primary' },
    { key: 'today', label: isRTL ? tx.todayOps.ar : tx.todayOps.en, value: stats.today, icon: TrendingUp, tone: 'success' },
    { key: 'admins', label: isRTL ? tx.activeAdmins.ar : tx.activeAdmins.en, value: stats.uniqueAdmins, icon: Users, tone: 'info' },
    { key: 'top', label: isRTL ? tx.topAction.ar : tx.topAction.en, value: pick(actionConfig[stats.topAction], isRTL, '—'), icon: Zap, tone: 'accent' },
  ];

  const rangeOptions: OperationsSelectOption[] = [
    { value: 'all', label: isRTL ? tx.rangeAll.ar : tx.rangeAll.en },
    { value: '24h', label: isRTL ? tx.range24h.ar : tx.range24h.en },
    { value: '7d', label: isRTL ? tx.range7d.ar : tx.range7d.en },
    { value: '30d', label: isRTL ? tx.range30d.ar : tx.range30d.en },
  ];

  const headerNode = (
    <div>
      <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shadow-sm">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        {isRTL ? tx.title.ar : tx.title.en}
      </h1>
      <p className="text-muted-foreground text-sm mt-1">{isRTL ? tx.subtitle.ar : tx.subtitle.en}</p>
    </div>
  );

  const headerActions = (
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
  );

  const extraFilters = (
    <>
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
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-3">
        <AdminOpsQuickLinks />
        <OperationsAdminPageShell
          header={headerNode}
          actionsSlot={headerActions}
          statsSlot={<OperationsStatsStrip items={statItems} columns={4} />}
          filtersSlot={
            <div className="space-y-3 print:hidden">
              <div className="rounded-2xl border border-border/30 bg-card p-4">
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

              <OperationsFiltersBar
                searchValue={searchQuery}
                onSearchChange={(v) => startTransition(() => setSearchQuery(v))}
                searchPlaceholder={isRTL ? tx.searchPh.ar : tx.searchPh.en}
                statusValue={rangeFilter}
                onStatusChange={(v) => setRangeFilter(v as typeof rangeFilter)}
                statusPlaceholder={isRTL ? tx.range.ar : tx.range.en}
                statusOptions={rangeOptions}
                rightSlot={extraFilters}
              />

              {hasActiveFilters && (
                <div className="flex items-center gap-2 rounded-2xl border border-border/30 bg-card px-4 py-3">
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
          }
        >
          <AdminActivityLogTimelineSection
            groups={groupedLogs}
            isLoading={isLoading}
            isFetching={isFetching}
            hasResults={filteredLogs.length > 0}
            canLoadMore={!!logs && logs.length >= pageSize}
            onLoadMore={() => setPageSize(p => p + 200)}
            getProfileName={getProfileName}
            isRTL={isRTL}
            emptyLabel={isRTL ? tx.empty.ar : tx.empty.en}
            emptySubLabel={isRTL ? tx.emptySub.ar : tx.emptySub.en}
            loadMoreLabel={isRTL ? tx.loadMore.ar : tx.loadMore.en}
          />
        </OperationsAdminPageShell>
      </div>
    </DashboardLayout>
  );
};

// Suppress unused import warning for Search/Calendar lucide icons that are now
// rendered inside OperationsFiltersBar (which provides its own Search icon).
void Search; void Calendar;

export default AdminActivityLog;
