import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { buildCsv, downloadCsv, defaultRange, type DateRange } from '@/lib/admin-reports-csv';
import { Loader2, Download, ShieldAlert, FileText, Building2, Activity } from 'lucide-react';
import { toast } from 'sonner';

type SourceKey = 'admin' | 'business' | 'security' | 'contract_amendment';

interface UnifiedRow {
  id: string;
  source: SourceKey;
  action: string;
  actor: string | null;
  entity: string | null;
  details: string;
  created_at: string;
}

const SOURCE_META: Record<SourceKey, { ar: string; en: string; icon: typeof Activity; color: string }> = {
  admin: { ar: 'الإدارة', en: 'Admin', icon: ShieldAlert, color: 'bg-primary/10 text-primary' },
  business: { ar: 'منشآت', en: 'Business', icon: Building2, color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  security: { ar: 'أمني', en: 'Security', icon: ShieldAlert, color: 'bg-destructive/10 text-destructive' },
  contract_amendment: { ar: 'تعديلات العقود', en: 'Contract Amendments', icon: FileText, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
};

function stringifyDetails(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function AdminAuditLog() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const [range, setRange] = useState<DateRange>(() => defaultRange(7));
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | SourceKey>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fromIso = `${range.from}T00:00:00Z`;
        const toIso = `${range.to}T23:59:59Z`;

        const [adminRes, bizRes, secRes, amendRes] = await Promise.all([
          supabase.from('admin_activity_log').select('id,action,user_id,entity_type,entity_id,details,created_at').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
          supabase.from('business_audit_log').select('id,action,actor_id,business_id,changes,created_at').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
          supabase.from('security_audit_log').select('id,action,user_id,resource_type,resource_id,metadata,created_at').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
          supabase.from('contract_amendment_audit_safe').select('id,action,actor_id,amendment_id,created_at,reason').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
        ]);

        if (cancelled) return;

        const merged: UnifiedRow[] = [];
        for (const r of (adminRes.data ?? []) as Array<{ id: string; action: string; user_id: string; entity_type: string | null; entity_id: string | null; details: unknown; created_at: string }>) {
          merged.push({ id: `a:${r.id}`, source: 'admin', action: r.action, actor: r.user_id, entity: r.entity_type ? `${r.entity_type}:${r.entity_id ?? ''}` : null, details: stringifyDetails(r.details), created_at: r.created_at });
        }
        for (const r of (bizRes.data ?? []) as Array<{ id: string; action: string; actor_id: string | null; business_id: string | null; changes: unknown; created_at: string }>) {
          merged.push({ id: `b:${r.id}`, source: 'business', action: r.action, actor: r.actor_id, entity: r.business_id ? `business:${r.business_id}` : null, details: stringifyDetails(r.changes), created_at: r.created_at });
        }
        for (const r of (secRes.data ?? []) as Array<{ id: string; action: string; user_id: string | null; resource_type: string | null; resource_id: string | null; metadata: unknown; created_at: string }>) {
          merged.push({ id: `s:${r.id}`, source: 'security', action: r.action, actor: r.user_id, entity: r.resource_type ? `${r.resource_type}:${r.resource_id ?? ''}` : null, details: stringifyDetails(r.metadata), created_at: r.created_at });
        }
        for (const r of (amendRes.data ?? []) as Array<{ id: string; action: string | null; actor_id: string | null; amendment_id: string | null; created_at: string; reason: string | null }>) {
          merged.push({ id: `c:${r.id}`, source: 'contract_amendment', action: r.action ?? 'amendment', actor: r.actor_id, entity: r.amendment_id ? `amendment:${r.amendment_id}` : null, details: r.reason ?? '', created_at: r.created_at });
        }

        merged.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        setRows(merged);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load audit log');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.source !== filter) return false;
      if (!q) return true;
      return (
        r.action.toLowerCase().includes(q) ||
        (r.actor ?? '').toLowerCase().includes(q) ||
        (r.entity ?? '').toLowerCase().includes(q) ||
        r.details.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  const counts = useMemo(() => {
    const c: Record<SourceKey, number> = { admin: 0, business: 0, security: 0, contract_amendment: 0 };
    for (const r of rows) c[r.source] += 1;
    return c;
  }, [rows]);

  function onExport() {
    const headers = ['source', 'action', 'actor', 'entity', 'details', 'created_at'] as const;
    const csv = buildCsv(headers, visible.map((r) => ({ ...r })));
    downloadCsv(`audit-log_${range.from}_${range.to}.csv`, csv);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              <Bi ar="سجل التدقيق الموحّد" en="Unified Audit Log" />
            </h1>
            <p className="text-sm text-muted-foreground">
              <Bi ar="جميع الأنشطة الإدارية، المنشآت، الأمن، وتعديلات العقود" en="Admin, business, security, and contract amendment activity" />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="h-10 w-auto" />
            <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="h-10 w-auto" />
            <Button variant="outline" onClick={onExport} disabled={!visible.length}>
              <Download className="me-2 h-4 w-4" />
              <Bi ar="تصدير CSV" en="Export CSV" />
            </Button>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(SOURCE_META) as SourceKey[]).map((k) => {
            const meta = SOURCE_META[k];
            const Icon = meta.icon;
            const active = filter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter((cur) => (cur === k ? 'all' : k))}
                className={`hover-lift rounded-xl border p-4 text-start transition ${active ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
              >
                <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <Bi ar={meta.ar} en={meta.en} />
                </div>
                <div className="text-xl font-bold tech-content">{counts[k].toLocaleString()}</div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={isRTL ? 'ابحث في السجل…' : 'Search the log…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 max-w-sm"
            dir="auto"
          />
          {filter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
              <Bi ar="إزالة الفلتر" en="Clear filter" />
            </Button>
          )}
          <span className="ms-auto text-xs text-muted-foreground tech-content">{visible.length} / {rows.length}</span>
        </div>

        <Card className="overflow-hidden">
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr className="text-start">
                  <th className="px-3 py-2 text-start"><Bi ar="المصدر" en="Source" /></th>
                  <th className="px-3 py-2 text-start"><Bi ar="الإجراء" en="Action" /></th>
                  <th className="px-3 py-2 text-start"><Bi ar="الفاعل" en="Actor" /></th>
                  <th className="px-3 py-2 text-start"><Bi ar="الكيان" en="Entity" /></th>
                  <th className="px-3 py-2 text-start"><Bi ar="التاريخ" en="Date" /></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const meta = SOURCE_META[r.source];
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className={meta.color}>
                          <Bi ar={meta.ar} en={meta.en} />
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-medium">{r.action}</td>
                      <td className="px-3 py-2 tech-content text-xs text-muted-foreground">{r.actor?.slice(0, 8) ?? '—'}</td>
                      <td className="px-3 py-2 tech-content text-xs text-muted-foreground">{r.entity ?? '—'}</td>
                      <td className="px-3 py-2 tech-content text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {!visible.length && !loading && (
                  <tr>
                    <td colSpan={5} className="px-3 py-12 text-center text-muted-foreground">
                      <Bi ar="لا توجد سجلات في هذه الفترة" en="No records in this period" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}