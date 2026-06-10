/**
 * AdminActivityLog — Full filterable audit log for `admin_activity_log`.
 *
 * Rendered as the "Audit Log" tab in the unified Account & Approvals
 * Center. Shows who did what and when, with action / entity-type / actor
 * / date-range filters, free-text search, and CSV export.
 *
 * Read-only surface; mutations are intentionally absent here — every row
 * is an after-the-fact record. Realtime INSERTs invalidate the query so
 * new admin actions appear within seconds.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Search, RefreshCw, Download, Filter, Calendar,
  Shield, UserPlus, Ban, CheckCircle2, Building2, KeyRound,
  Crown, Edit3, AlertCircle, Users as UsersIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { listProfilesByUserIds } from '@/modules/users/services/listProfilesByUserIds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

interface Row {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
interface ActorLite { user_id: string; full_name: string | null; avatar_url: string | null; ref_id: string | null }

function classify(action: string): { icon: React.ElementType; tone: string } {
  const a = action.toLowerCase();
  if (a.includes('disable') || a.includes('ban') || a.includes('delete') || a.includes('reject')) return { icon: Ban, tone: 'text-destructive bg-destructive/10' };
  if (a.includes('enable') || a.includes('approve') || a.includes('verify') || a.includes('activate')) return { icon: CheckCircle2, tone: 'text-success bg-success/10' };
  if (a.includes('create') || a.includes('insert') || a.includes('new')) return { icon: UserPlus, tone: 'text-info bg-info/10' };
  if (a.includes('role') || a.includes('permission') || a.includes('access')) return { icon: Shield, tone: 'text-warning bg-warning/10' };
  if (a.includes('reset') || a.includes('password') || a.includes('email')) return { icon: KeyRound, tone: 'text-accent bg-accent/10' };
  if (a.includes('business')) return { icon: Building2, tone: 'text-success bg-success/10' };
  if (a.includes('membership') || a.includes('tier') || a.includes('upgrade')) return { icon: Crown, tone: 'text-warning bg-warning/10' };
  if (a.includes('update') || a.includes('edit')) return { icon: Edit3, tone: 'text-primary bg-primary/10' };
  return { icon: Activity, tone: 'text-muted-foreground bg-muted/40' };
}

const DATE_RANGES = [
  { key: '24h',  ar: 'آخر 24 ساعة',  en: 'Last 24h',   ms: 24 * 60 * 60 * 1000 },
  { key: '7d',   ar: 'آخر 7 أيام',   en: 'Last 7d',    ms: 7 * 86_400_000 },
  { key: '30d',  ar: 'آخر 30 يوم',    en: 'Last 30d',   ms: 30 * 86_400_000 },
  { key: '90d',  ar: 'آخر 90 يوم',    en: 'Last 90d',   ms: 90 * 86_400_000 },
  { key: 'all',  ar: 'كل المدة',       en: 'All time',   ms: 0 },
] as const;
type RangeKey = typeof DATE_RANGES[number]['key'];

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export interface AdminActivityLogProps {
  externalSearch?: string;
}

export const AdminActivityLog: React.FC<AdminActivityLogProps> = ({ externalSearch }) => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const effectiveSearch = (externalSearch ?? '') || search;
  const [action, setAction] = useState<string>('all');
  const [entity, setEntity] = useState<string>('all');
  const [range, setRange] = useState<RangeKey>('7d');
  const [limit, setLimit] = useState<number>(200);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-activity-log', range, limit],
    queryFn: async (): Promise<{ rows: Row[]; actors: Map<string, ActorLite> }> => {
      let q = supabase
        .from('admin_activity_log')
        .select('id, user_id, action, entity_type, entity_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      const rng = DATE_RANGES.find((r) => r.key === range);
      if (rng && rng.ms > 0) {
        const since = new Date(Date.now() - rng.ms).toISOString();
        q = q.gte('created_at', since);
      }
      const { data: rows, error } = await q;
      if (error) throw error;
      const list = (rows ?? []) as Row[];
      const ids = Array.from(new Set(list.map((r) => r.user_id))).filter(Boolean);
      const actors = new Map<string, ActorLite>();
      if (ids.length > 0) {
        const { data: profs } = await listProfilesByUserIds<ActorLite>({
          userIds: ids,
          select: 'user_id, full_name, avatar_url, ref_id',
        });
        (profs ?? []).forEach((p) => actors.set(p.user_id, p as ActorLite));
      }
      return { rows: list, actors };
    },
    staleTime: 30_000,
  });

  // Realtime invalidation — new admin actions surface immediately.
  useEffect(() => {
    const ch = supabase
      .channel('admin-activity-log-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_activity_log' }, () => {
        qc.invalidateQueries({ queryKey: ['admin-activity-log'] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  const rows = data?.rows ?? [];
  const actors = data?.actors ?? new Map<string, ActorLite>();

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.action));
    return Array.from(set).sort();
  }, [rows]);

  const entityOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.entity_type) set.add(r.entity_type); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = effectiveSearch.trim().toLowerCase();
    return rows.filter((r) => {
      if (action !== 'all' && r.action !== action) return false;
      if (entity !== 'all' && r.entity_type !== entity) return false;
      if (q) {
        const actor = actors.get(r.user_id);
        const hay = [
          r.action, r.entity_type ?? '', r.entity_id ?? '',
          actor?.full_name ?? '', actor?.ref_id ?? '',
          JSON.stringify(r.details ?? {}),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, actors, action, entity, effectiveSearch]);

  function exportCsv() {
    const headers = ['created_at', 'actor_ref', 'actor_name', 'action', 'entity_type', 'entity_id', 'details'];
    const lines = [headers.join(',')];
    filtered.forEach((r) => {
      const a = actors.get(r.user_id);
      lines.push([
        r.created_at,
        a?.ref_id ?? '',
        a?.full_name ?? '',
        r.action,
        r.entity_type ?? '',
        r.entity_id ?? '',
        JSON.stringify(r.details ?? {}),
      ].map(csvEscape).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? `تم تصدير ${filtered.length} سجل` : `Exported ${filtered.length} rows`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>{isRTL ? 'سجل عمليات الإدارة' : 'Admin audit log'}</span>
          <Badge variant="outline" className="tech-content">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['admin-activity-log'] })} disabled={isFetching} className="gap-2 h-9">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
          <Button variant="default" size="sm" onClick={exportCsv} disabled={filtered.length === 0} className="gap-2 h-9">
            <Download className="h-4 w-4" />
            {isRTL ? 'تصدير CSV' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-3 md:p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {externalSearch === undefined && (
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground start-3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث: مسؤول، إجراء، كيان…' : 'Search: actor, action, entity…'}
                className="h-11 ps-9"
                dir="auto"
              />
            </div>
          )}
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-11 w-[200px] gap-2"><Filter className="h-4 w-4" /><SelectValue placeholder={isRTL ? 'الإجراء' : 'Action'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الإجراءات' : 'All actions'}</SelectItem>
              {actionOptions.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="h-11 w-[170px] gap-2"><Filter className="h-4 w-4" /><SelectValue placeholder={isRTL ? 'النوع' : 'Entity'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All entities'}</SelectItem>
              {entityOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="h-11 w-[160px] gap-2"><Calendar className="h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => <SelectItem key={r.key} value={r.key}>{isRTL ? r.ar : r.en}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="h-11 w-[120px] gap-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[100, 200, 500, 1000].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-base font-medium">{isRTL ? 'لا توجد سجلات مطابقة' : 'No matching log entries'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'جرّب توسيع نطاق التاريخ أو إزالة الفلاتر.' : 'Try a wider date range or clear filters.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => {
              const { icon: Icon, tone } = classify(r.action);
              const actor = actors.get(r.user_id);
              return (
                <li key={r.id} className="p-3 md:p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 h-10 w-10 rounded-xl grid place-items-center ${tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{r.action.replace(/_/g, ' ')}</span>
                        {r.entity_type && (
                          <Badge variant="outline" className="text-[10px] font-normal">{r.entity_type}</Badge>
                        )}
                        {r.entity_id && (
                          <span className="text-[10px] text-muted-foreground tech-content truncate max-w-[180px]">{r.entity_id}</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <UsersIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{actor?.full_name || (isRTL ? 'مسؤول' : 'admin')}</span>
                        {actor?.ref_id && <span className="tech-content text-[10px]">{actor.ref_id}</span>}
                        <span>•</span>
                        <span className="tech-content">{new Date(r.created_at).toLocaleString(isRTL ? 'ar-u-nu-latn' : 'en')}</span>
                      </div>
                      {r.details && Object.keys(r.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">
                            {isRTL ? 'التفاصيل' : 'Details'}
                          </summary>
                          <pre className="mt-1 text-[10px] bg-muted/40 rounded-lg p-2 overflow-x-auto tech-content max-w-full">
                            {JSON.stringify(r.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminActivityLog;