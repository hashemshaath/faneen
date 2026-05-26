import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { listPasswordResetLogs } from '@/modules/identity';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Clock, CheckCircle2, XCircle, RefreshCw, AlertTriangle,
  Mail, Calendar, Filter, ChevronLeft, ChevronRight, Monitor,
} from 'lucide-react';

type ResetStatus = 'requested' | 'resend' | 'completed' | 'failed';

const STATUS_CONFIG: Record<ResetStatus, { icon: React.ElementType; color: string; labelAr: string; labelEn: string }> = {
  requested: { icon: Clock, color: 'bg-info text-info dark:bg-info/30 dark:text-info', labelAr: 'مطلوب', labelEn: 'Requested' },
  resend: { icon: RefreshCw, color: 'bg-warning text-warning dark:bg-warning/30 dark:text-warning', labelAr: 'إعادة إرسال', labelEn: 'Resent' },
  completed: { icon: CheckCircle2, color: 'bg-success text-success dark:bg-success/30 dark:text-success', labelAr: 'مكتمل', labelEn: 'Completed' },
  failed: { icon: XCircle, color: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive', labelAr: 'فشل', labelEn: 'Failed' },
};

const TIME_RANGES = [
  { key: '24h', labelAr: '24 ساعة', labelEn: '24h', hours: 24 },
  { key: '7d', labelAr: '7 أيام', labelEn: '7 days', hours: 168 },
  { key: '30d', labelAr: '30 يوم', labelEn: '30 days', hours: 720 },
  { key: 'all', labelAr: 'الكل', labelEn: 'All', hours: 0 },
] as const;

const PAGE_SIZE = 20;

const formatDate = (dateStr: string, lang: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return lang === 'ar' ? 'غير محدد' : 'N/A';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const PasswordResetLogPanel: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResetStatus | 'all'>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [page, setPage] = useState(0);

  const rangeStart = useMemo(() => {
    const range = TIME_RANGES.find(r => r.key === timeRange);
    if (!range || range.hours === 0) return null;
    return new Date(Date.now() - range.hours * 3600_000).toISOString();
  }, [timeRange]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['password-reset-log', rangeStart],
    queryFn: async () => {
      const { data, error } = await listPasswordResetLogs({
        sinceIso: rangeStart,
        limit: 500,
      });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => {
    let result = logs;
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter);
    if (searchTerm.trim()) {
      const s = searchTerm.trim().toLowerCase();
      result = result.filter(l => l.email?.toLowerCase().includes(s) || l.user_id?.toLowerCase().includes(s));
    }
    return result;
  }, [logs, statusFilter, searchTerm]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const requested = logs.filter(l => l.status === 'requested').length;
    const completed = logs.filter(l => l.status === 'completed').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const resend = logs.filter(l => l.status === 'resend').length;
    return { total, requested, completed, failed, resend };
  }, [logs]);

  const statCards = [
    { labelAr: 'الإجمالي', labelEn: 'Total', value: stats.total, color: 'text-foreground', bg: 'bg-muted/50' },
    { labelAr: 'مطلوب', labelEn: 'Requested', value: stats.requested, color: 'text-info', bg: 'bg-info dark:bg-info/20' },
    { labelAr: 'مكتمل', labelEn: 'Completed', value: stats.completed, color: 'text-success', bg: 'bg-success dark:bg-success/20' },
    { labelAr: 'فشل', labelEn: 'Failed', value: stats.failed, color: 'text-destructive', bg: 'bg-destructive dark:bg-destructive/20' },
    { labelAr: 'إعادة إرسال', labelEn: 'Resent', value: stats.resend, color: 'text-warning', bg: 'bg-warning dark:bg-warning/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map(s => (
          <div key={s.labelEn} className={`rounded-xl border border-border p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{isRTL ? s.labelAr : s.labelEn}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Time range */}
        <div className="flex rounded-lg bg-muted/40 p-0.5 gap-0.5">
          {TIME_RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => { setTimeRange(r.key); setPage(0); }}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                timeRange === r.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isRTL ? r.labelAr : r.labelEn}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg bg-muted/40 p-0.5 gap-0.5">
          <button
            onClick={() => { setStatusFilter('all'); setPage(0); }}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              statusFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isRTL ? 'الكل' : 'All'}
          </button>
          {(Object.keys(STATUS_CONFIG) as ResetStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(0); }}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  statusFilter === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isRTL ? cfg.labelAr : cfg.labelEn}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute top-2.5 w-4 h-4 text-muted-foreground" style={{ insetInlineStart: '10px' }} />
          <Input
            placeholder={isRTL ? 'بحث بالبريد...' : 'Search by email...'}
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            className="h-9 text-sm"
            style={{ paddingInlineStart: '34px' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">{isRTL ? 'البريد الإلكتروني' : 'Email'}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">{isRTL ? 'التاريخ' : 'Date'}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">{isRTL ? 'المتصفح' : 'Browser'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{isRTL ? 'لا توجد سجلات' : 'No records found'}</p>
                  </td>
                </tr>
              ) : paged.map(log => {
                const cfg = STATUS_CONFIG[log.status as ResetStatus] || STATUS_CONFIG.requested;
                const Icon = cfg.icon;
                const shortAgent = log.user_agent
                  ? log.user_agent.length > 40 ? log.user_agent.substring(0, 40) + '…' : log.user_agent
                  : '—';
                return (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs" dir="ltr">{log.email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`gap-1 text-[11px] ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {isRTL ? cfg.labelAr : cfg.labelEn}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {formatDate(log.created_at, language)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-[200px]" title={log.user_agent || ''}>
                        <Monitor className="w-3 h-3 shrink-0" />
                        <span className="truncate">{shortAgent}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? `${filtered.length} سجل — صفحة ${page + 1} من ${totalPages}`
              : `${filtered.length} records — page ${page + 1} of ${totalPages}`}
          </p>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};