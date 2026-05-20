import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  QrCode, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Hash,
  Activity, ShieldCheck, ShieldAlert, Archive, Snowflake, ArrowRightLeft,
  Eye, EyeOff, Link2, Zap,
} from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// Types (safe payloads only — no PII, no token hash)
// ──────────────────────────────────────────────
interface BarcodeRow {
  barcode_id: string;
  barcode_code: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  owner_label: string | null;
  owner_business_label: string | null;
  status: string;
  visibility: string;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
  linked_entities_count: number;
  events_count: number;
}

interface RegistrySummary {
  total: number;
  active: number;
  frozen: number;
  archived: number;
  revoked: number;
  transferred: number;
  total_scans: number;
  scanned_last_7d: number;
  by_entity_type: Record<string, number>;
  by_visibility: Record<string, number>;
  top_scanned: Array<{
    barcode_code: string;
    entity_type: string;
    scan_count: number;
    last_scanned_at: string | null;
  }>;
}

interface BarcodeDetail {
  barcode: BarcodeRow & {
    permanent_public_code: boolean;
    scan_url_path: string | null;
    archived_at: string | null;
    frozen_at: string | null;
    transferred_at: string | null;
    updated_at: string;
    source: string | null;
  };
  events: Array<{
    id: string;
    event_type: string;
    actor_role: string | null;
    created_at: string;
    metadata_safe: { source?: string; reason?: string; note?: string };
  }>;
  links: Array<{
    id: string;
    linked_entity_type: string;
    linked_entity_id: string;
    relationship_type: string;
    created_at: string;
    label: string | null;
  }>;
  counts: { events_count: number; links_count: number };
}

const ENTITY_TYPES = ['client_site', 'contract', 'business', 'customer', 'lead'];
const STATUSES = ['active', 'frozen', 'archived', 'revoked', 'transferred'];
const VISIBILITIES = ['public', 'private', 'restricted'];
const PAGE_SIZES = [25, 50, 100];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function statusVariant(status: string): { cls: string; icon: React.ElementType } {
  switch (status) {
    case 'active':      return { cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: ShieldCheck };
    case 'frozen':      return { cls: 'bg-sky-500/10 text-sky-600 border-sky-500/30', icon: Snowflake };
    case 'archived':    return { cls: 'bg-muted text-muted-foreground border-border', icon: Archive };
    case 'revoked':     return { cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: ShieldAlert };
    case 'transferred': return { cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: ArrowRightLeft };
    default:            return { cls: 'bg-muted text-muted-foreground border-border', icon: Hash };
  }
}

function visibilityIcon(v: string) {
  if (v === 'public') return Eye;
  if (v === 'private') return EyeOff;
  return ShieldAlert;
}

function fmtDate(iso: string | null, isRTL: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-GB', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ──────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string; value: number | string; icon: React.ElementType; tone?: string;
}> = ({ label, value, icon: Icon, tone = 'text-primary' }) => (
  <Card className="hover-lift">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center bg-muted/50', tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-2xl font-bold tech-content">{value}</div>
      </div>
    </CardContent>
  </Card>
);

// ──────────────────────────────────────────────
// Copy code button
// ──────────────────────────────────────────────
const CopyCode: React.FC<{ code: string }> = ({ code }) => {
  const [done, setDone] = useState(false);
  const bi = useBi();
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          toast.success(bi('تم النسخ', 'Copied'));
          setTimeout(() => setDone(false), 1500);
        } catch { toast.error(bi('تعذر النسخ', 'Copy failed')); }
      }}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-xs font-mono tech-content transition"
      aria-label={bi('نسخ الكود', 'Copy code')}
    >
      <span className="truncate max-w-[180px]">{code}</span>
      {done ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
    </button>
  );
};

// ──────────────────────────────────────────────
// Detail panel (inline — no popups per project rules)
// ──────────────────────────────────────────────
const DetailPanel: React.FC<{ barcodeId: string; onClose: () => void }> = ({ barcodeId, onClose }) => {
  const bi = useBi();
  const { isRTL } = useLanguage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-barcode-detail', barcodeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_barcode_detail', { _barcode_id: barcodeId });
      if (error) throw error;
      return data as unknown as BarcodeDetail;
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{bi('جارٍ التحميل…', 'Loading…')}</div>;
  }
  if (isError || !data?.barcode) {
    return (
      <div className="p-6 text-sm text-destructive flex items-center justify-between">
        <span>{bi('تعذر تحميل التفاصيل', 'Failed to load details')}</span>
        <Button size="sm" variant="outline" onClick={() => refetch()}>{bi('إعادة', 'Retry')}</Button>
      </div>
    );
  }

  const b = data.barcode;
  const sv = statusVariant(b.status);

  return (
    <div className="p-5 space-y-5 bg-muted/20 border-t">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono tech-content font-semibold">{b.barcode_code}</span>
            <Badge className={cn('text-[10px] border', sv.cls)} variant="outline">
              <sv.icon className="h-3 w-3 me-1 inline" />{b.status}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{b.visibility}</Badge>
            <Badge variant="secondary" className="text-[10px]">{b.entity_type}</Badge>
          </div>
          <div className="text-sm">{b.entity_label || '—'}</div>
          <div className="text-xs text-muted-foreground">
            {b.owner_business_label || b.owner_label || ''}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>{bi('إغلاق', 'Close')}</Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="rounded-md bg-card p-2 border">
          <div className="text-muted-foreground">{bi('عدد المسحات', 'Scans')}</div>
          <div className="font-semibold tech-content">{b.scan_count}</div>
        </div>
        <div className="rounded-md bg-card p-2 border">
          <div className="text-muted-foreground">{bi('آخر مسح', 'Last scan')}</div>
          <div className="font-semibold tech-content">{fmtDate(b.last_scanned_at, isRTL)}</div>
        </div>
        <div className="rounded-md bg-card p-2 border">
          <div className="text-muted-foreground">{bi('الروابط', 'Links')}</div>
          <div className="font-semibold tech-content">{data.counts.links_count}</div>
        </div>
        <div className="rounded-md bg-card p-2 border">
          <div className="text-muted-foreground">{bi('الأحداث', 'Events')}</div>
          <div className="font-semibold tech-content">{data.counts.events_count}</div>
        </div>
      </div>

      {/* Linked entities */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          {bi('الكيانات المرتبطة', 'Linked entities')}
        </div>
        {data.links.length === 0 ? (
          <div className="text-xs text-muted-foreground">{bi('لا توجد روابط', 'No links')}</div>
        ) : (
          <div className="space-y-1">
            {data.links.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-xs rounded-md border bg-card px-2 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="text-[10px]">{l.linked_entity_type}</Badge>
                  <span className="truncate">{l.label || l.linked_entity_id}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{l.relationship_type}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent events */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          {bi('آخر الأحداث', 'Recent events')}
        </div>
        {data.events.length === 0 ? (
          <div className="text-xs text-muted-foreground">{bi('لا توجد أحداث', 'No events')}</div>
        ) : (
          <div className="space-y-1 max-h-[320px] overflow-auto">
            {data.events.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs rounded-md border bg-card px-2 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                  {e.actor_role && <span className="text-muted-foreground">{e.actor_role}</span>}
                  {e.metadata_safe?.source && (
                    <span className="text-muted-foreground truncate">· {e.metadata_safe.source}</span>
                  )}
                </div>
                <span className="text-muted-foreground tech-content shrink-0">{fmtDate(e.created_at, isRTL)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────
const AdminBarcodeRegistry: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const { isRTL } = useLanguage();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [entityType, setEntityType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [visibility, setVisibility] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [entityType, status, visibility, pageSize]);

  const summaryQ = useQuery({
    queryKey: ['admin-barcode-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_barcode_registry_summary');
      if (error) throw error;
      return data as unknown as RegistrySummary;
    },
    staleTime: 60_000,
  });

  const listQ = useQuery({
    queryKey: ['admin-barcode-list', debouncedSearch, entityType, status, visibility, page, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_barcodes', {
        _search: debouncedSearch || null,
        _entity_type: entityType === 'all' ? null : entityType,
        _status: status === 'all' ? null : status,
        _visibility: visibility === 'all' ? null : visibility,
        _limit: pageSize,
        _offset: page * pageSize,
      });
      if (error) throw error;
      return data as unknown as { total: number; rows: BarcodeRow[]; limit: number; offset: number };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const summary = summaryQ.data;
  const rows = listQ.data?.rows ?? [];
  const total = listQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const entityTypeChips = useMemo(() => {
    if (!summary?.by_entity_type) return [];
    return Object.entries(summary.by_entity_type).sort((a, b) => Number(b[1]) - Number(a[1]));
  }, [summary]);

  return (
    <DashboardLayout>
      <div className="space-y-5 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              {bi('سجل الأكواد', 'Barcode Registry')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bi(
                'مراقبة وفحص جميع أكواد الباركود الموحدة عبر النظام.',
                'Monitor and inspect all unified barcode codes across the platform.'
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { summaryQ.refetch(); listQ.refetch(); }}
            disabled={summaryQ.isFetching || listQ.isFetching}
          >
            <RefreshCw className={cn('h-4 w-4 me-1.5', (summaryQ.isFetching || listQ.isFetching) && 'animate-spin')} />
            {bi('تحديث', 'Refresh')}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label={bi('الإجمالي', 'Total')} value={summary?.total ?? '—'} icon={Hash} tone="text-primary" />
          <KpiCard label={bi('نشط', 'Active')} value={summary?.active ?? '—'} icon={ShieldCheck} tone="text-emerald-600" />
          <KpiCard label={bi('مجمّد', 'Frozen')} value={summary?.frozen ?? '—'} icon={Snowflake} tone="text-sky-600" />
          <KpiCard label={bi('مؤرشف/ملغى', 'Archived/Revoked')} value={(summary?.archived ?? 0) + (summary?.revoked ?? 0)} icon={Archive} tone="text-muted-foreground" />
          <KpiCard label={bi('إجمالي المسحات', 'Total scans')} value={summary?.total_scans ?? '—'} icon={Zap} tone="text-amber-600" />
          <KpiCard label={bi('آخر 7 أيام', 'Last 7 days')} value={summary?.scanned_last_7d ?? '—'} icon={Activity} tone="text-primary" />
        </div>

        {/* Entity type chips */}
        {entityTypeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{bi('حسب النوع:', 'By type:')}</span>
            {entityTypeChips.map(([t, c]) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}: <span className="ms-1 tech-content font-semibold">{c}</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid gap-3 md:grid-cols-5">
            <Input
              placeholder={bi('بحث بكود الباركود…', 'Search barcode code…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:col-span-2 h-10"
              dir="auto"
            />
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="h-10"><SelectValue placeholder={bi('النوع', 'Type')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل الأنواع', 'All types')}</SelectItem>
                {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10"><SelectValue placeholder={bi('الحالة', 'Status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل الحالات', 'All statuses')}</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="h-10"><SelectValue placeholder={bi('الظهور', 'Visibility')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل', 'All')}</SelectItem>
                {VISIBILITIES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">{bi('الكود', 'Code')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('النوع', 'Type')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('الكيان', 'Entity')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('المالك', 'Owner')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('الحالة', 'Status')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('الظهور', 'Visibility')}</th>
                  <th className="text-end px-3 py-2 font-medium">{bi('المسحات', 'Scans')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('آخر مسح', 'Last scan')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('أُنشئ في', 'Created')}</th>
                  <th className="text-center px-3 py-2 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {listQ.isLoading && (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">{bi('جارٍ التحميل…', 'Loading…')}</td></tr>
                )}
                {listQ.isError && (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-destructive">{bi('تعذر التحميل', 'Failed to load')}</td></tr>
                )}
                {!listQ.isLoading && rows.length === 0 && !listQ.isError && (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">{bi('لا توجد نتائج', 'No results')}</td></tr>
                )}
                {rows.map((r) => {
                  const sv = statusVariant(r.status);
                  const VIcon = visibilityIcon(r.visibility);
                  const expanded = expandedId === r.barcode_id;
                  return (
                    <React.Fragment key={r.barcode_id}>
                      <tr
                        className={cn('border-t hover:bg-muted/30 cursor-pointer transition', expanded && 'bg-muted/40')}
                        onClick={() => setExpandedId(expanded ? null : r.barcode_id)}
                      >
                        <td className="px-3 py-2"><CopyCode code={r.barcode_code} /></td>
                        <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{r.entity_type}</Badge></td>
                        <td className="px-3 py-2 max-w-[220px] truncate">{r.entity_label || '—'}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground">
                          {r.owner_business_label || r.owner_label || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={cn('text-[10px] border', sv.cls)} variant="outline">
                            <sv.icon className="h-3 w-3 me-1 inline" />{r.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <VIcon className="h-3.5 w-3.5" />{r.visibility}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-end font-semibold tech-content">{r.scan_count}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground tech-content">{fmtDate(r.last_scanned_at, isRTL)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground tech-content">{fmtDate(r.created_at, isRTL)}</td>
                        <td className="px-3 py-2 text-center">
                          {expanded ? <ChevronUp className="h-4 w-4 inline opacity-70" /> : <ChevronDown className="h-4 w-4 inline opacity-70" />}
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={10} className="p-0">
                            <DetailPanel barcodeId={r.barcode_id} onClose={() => setExpandedId(null)} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-muted-foreground">
            {bi('إجمالي', 'Total')}: <span className="font-semibold tech-content">{total}</span>
            {' · '}
            {bi('صفحة', 'Page')} <span className="tech-content">{page + 1}</span>/<span className="tech-content">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s} / {bi('صفحة', 'page')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              {bi('السابق', 'Prev')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              {bi('التالي', 'Next')}
            </Button>
          </div>
        </div>

        {/* Top scanned */}
        {summary?.top_scanned && summary.top_scanned.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                {bi('الأكثر مسحاً', 'Top scanned')}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {summary.top_scanned.map((t) => (
                  <div key={t.barcode_code} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="text-[10px]">{t.entity_type}</Badge>
                      <span className="font-mono tech-content truncate">{t.barcode_code}</span>
                    </div>
                    <span className="font-semibold tech-content">{t.scan_count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminBarcodeRegistry;