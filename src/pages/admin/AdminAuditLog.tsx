import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Bi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { buildCsv, downloadCsv, defaultRange, type DateRange } from '@/lib/admin-reports-csv';
import { Loader2, Download, ShieldAlert, FileText, Building2, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  OperationsAdminPageShell,
  OperationsStatsStrip,
  OperationsFiltersBar,
  type OperationsStatItem,
} from '@/components/admin/ops';
import {
  AdminAuditLogTableSection,
  type AdminAuditLogTableRow,
} from '@/components/admin/ops/logs';

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
          supabase.from('security_audit_log').select('id,event_action,event_type,user_id,metadata,created_at').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
          supabase.from('contract_amendment_audit_safe').select('id,action,amendment_id,old_status,new_status,created_at').gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500),
        ]);

        if (cancelled) return;

        const merged: UnifiedRow[] = [];
        for (const r of (adminRes.data ?? []) as Array<{ id: string; action: string; user_id: string; entity_type: string | null; entity_id: string | null; details: unknown; created_at: string }>) {
          merged.push({ id: `a:${r.id}`, source: 'admin', action: r.action, actor: r.user_id, entity: r.entity_type ? `${r.entity_type}:${r.entity_id ?? ''}` : null, details: stringifyDetails(r.details), created_at: r.created_at });
        }
        for (const r of (bizRes.data ?? []) as Array<{ id: string; action: string; actor_id: string | null; business_id: string | null; changes: unknown; created_at: string }>) {
          merged.push({ id: `b:${r.id}`, source: 'business', action: r.action, actor: r.actor_id, entity: r.business_id ? `business:${r.business_id}` : null, details: stringifyDetails(r.changes), created_at: r.created_at });
        }
        for (const r of (secRes.data ?? []) as Array<{ id: string; event_action: string; event_type: string; user_id: string | null; metadata: unknown; created_at: string }>) {
          merged.push({ id: `s:${r.id}`, source: 'security', action: `${r.event_type}:${r.event_action}`, actor: r.user_id, entity: null, details: stringifyDetails(r.metadata), created_at: r.created_at });
        }
        for (const r of (amendRes.data ?? []) as Array<{ id: string | null; action: string | null; amendment_id: string | null; old_status: string | null; new_status: string | null; created_at: string | null }>) {
          if (!r.id || !r.created_at) continue;
          merged.push({ id: `c:${r.id}`, source: 'contract_amendment', action: r.action ?? 'amendment', actor: null, entity: r.amendment_id ? `amendment:${r.amendment_id}` : null, details: `${r.old_status ?? ''} → ${r.new_status ?? ''}`, created_at: r.created_at });
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
    const headers: ReadonlyArray<keyof UnifiedRow & string> = ['source', 'action', 'actor', 'entity', 'details', 'created_at'];
    const csv = buildCsv(visible as unknown as Array<Record<string, unknown> & UnifiedRow>, headers);
    downloadCsv(`audit-log_${range.from}_${range.to}.csv`, csv);
  }

  const sourceKeys = Object.keys(SOURCE_META) as SourceKey[];

  const statItems: OperationsStatItem[] = sourceKeys.map((k) => {
    const meta = SOURCE_META[k];
    return {
      key: k,
      label: isRTL ? meta.ar : meta.en,
      value: counts[k],
      icon: meta.icon,
      tone: k === 'admin' ? 'primary' : k === 'business' ? 'success' : k === 'security' ? 'destructive' : 'warning',
      active: filter === k,
      onClick: () => setFilter((cur) => (cur === k ? 'all' : k)),
    };
  });

  const tableRows: AdminAuditLogTableRow[] = visible.map((r) => {
    const meta = SOURCE_META[r.source];
    return {
      id: r.id,
      source: r.source,
      sourceLabelAr: meta.ar,
      sourceLabelEn: meta.en,
      sourceBadgeClass: meta.color,
      action: r.action,
      actor: r.actor,
      entity: r.entity,
      created_at: r.created_at,
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <AdminPageHeader
          tone="info"
          icon={ShieldAlert}
          eyebrow={isRTL ? 'لوحة الإدارة' : 'Admin Console'}
          breadcrumbs={[
            { label: isRTL ? 'الإدارة' : 'Admin', href: '/admin' },
            { label: isRTL ? 'سجل التدقيق' : 'Audit Log' },
          ]}
          title={isRTL ? 'سجل التدقيق الموحّد' : 'Unified Audit Log'}
          subtitle={isRTL
            ? 'جميع الأنشطة الإدارية، المنشآت، الأمن، وتعديلات العقود في مكان واحد.'
            : 'Admin, business, security, and contract amendment activity — one feed.'}
          actions={
            <>
              <Button variant="outline" size="sm" className="h-10 rounded-xl gap-1.5" onClick={onExport} disabled={!visible.length}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline"><Bi ar="تصدير CSV" en="Export CSV" /></span>
              </Button>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </>
          }
        />

        <OperationsAdminPageShell
          header={null}
          statsSlot={<OperationsStatsStrip items={statItems} columns={4} />}
          filtersSlot={
            <OperationsFiltersBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={isRTL ? 'ابحث في السجل…' : 'Search the log…'}
              fromDate={range.from}
              toDate={range.to}
              onFromDateChange={(v) => setRange((r) => ({ ...r, from: v }))}
              onToDateChange={(v) => setRange((r) => ({ ...r, to: v }))}
              fromLabel={isRTL ? 'من' : 'From'}
              toLabel={isRTL ? 'إلى' : 'To'}
              canReset={filter !== 'all'}
              onReset={() => setFilter('all')}
              resetLabel={isRTL ? 'إزالة الفلتر' : 'Clear filter'}
              rightSlot={
                <span className="text-xs text-muted-foreground tech-content">{visible.length} / {rows.length}</span>
              }
            />
          }
        >
          <AdminAuditLogTableSection
            rows={tableRows}
            loading={loading}
            emptyAr="لا توجد سجلات في هذه الفترة"
            emptyEn="No records in this period"
          />
        </OperationsAdminPageShell>
      </div>
    </DashboardLayout>
  );
}
