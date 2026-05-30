/**
 * BUSINESS-OPERATIONS-2J — Admin operations dry-run preview dashboard.
 *
 * SAFETY CONTRACT (do not weaken):
 *   - Dry-run preview ONLY. Renders `previewSlaSweepForAdmin` output.
 *   - No "Run real dispatch" / mutation / notification-send controls.
 *   - No raw rows, no PII, no notification bodies. Idempotency keys are
 *     masked (suffix only).
 *   - Manual refresh only — no polling, no cron, no auto re-run.
 *   - Admin-guarded via `ProtectedRoute requireAdmin` in `App.tsx`.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Bell,
  Inbox,
  ServerOff,
  Download,
  Printer,
  Users,
  ListChecks,
  TrendingUp,
  CheckCheck,
  SkipForward,
  Send,
  Terminal,
  FileClock,
  ScrollText,
  Stethoscope,
  History,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useAdminOperationsPreview,
  useRecentManualSlaPreviewRuns,
  MANUAL_PREVIEW_RUNS_CAP,
  type ManualPreviewRunSummary,
} from '@/modules/operations';
import {
  getOperationsRealRunReadiness,
  useOperationsApprovalAudit,
  OPERATIONS_APPROVAL_AUDIT_CAP,
  type OperationsApprovalAuditEntry,
} from '@/modules/operations';
import type {
  PreviewSlaSweepResult,
  SafeActionSample,
} from '@/modules/operations/services/previewSlaSweepForAdmin';
import { buildCsv, downloadCsv, printCurrentView, tsStamp } from '@/lib/admin/exportUtils';

/** Mask an idempotency key to its trailing bucket suffix for safe display. */
export function maskIdempotencyKey(key: string | undefined): string {
  if (!key) return '—';
  const parts = key.split(':');
  if (parts.length <= 2) return '••••';
  const tail = parts.slice(-2).join(':');
  return `••••:${tail}`;
}

function StatBlock({ label, value, tone = 'default', Icon }: {
  label: string;
  value: number | string;
  tone?: 'default' | 'warn' | 'ok' | 'danger';
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneText =
    tone === 'warn' ? 'text-warning'
      : tone === 'danger' ? 'text-destructive'
      : tone === 'ok' ? 'text-success'
      : 'text-foreground';
  const toneBg =
    tone === 'warn' ? 'bg-warning/10 text-warning'
      : tone === 'danger' ? 'bg-destructive/10 text-destructive'
      : tone === 'ok' ? 'bg-success/10 text-success'
      : 'bg-primary/10 text-primary';
  return (
    <div className="group rounded-xl border bg-card p-4 hover-lift transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        {Icon && (
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${toneBg}`}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${toneText}`}>{value}</div>
    </div>
  );
}

function formatTime(iso: string | undefined, isRTL: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
      dateStyle: 'medium', timeStyle: 'medium',
    });
  } catch {
    return iso;
  }
}

/** Status badge color tone for the preview's coarse `status` field. */
function StatusBadge({ status, bi }: {
  status: PreviewSlaSweepResult['status'];
  bi: (ar: string, en: string) => string;
}) {
  if (status === 'failed') {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30" data-testid="status-badge" data-status="failed">
        <XCircle className="w-3 h-3 me-1" />{bi('فشل المعاينة', 'Preview failed')}
      </Badge>
    );
  }
  if (status === 'partial') {
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30" data-testid="status-badge" data-status="partial">
        <AlertTriangle className="w-3 h-3 me-1" />{bi('معاينة جزئية', 'Partial preview')}
      </Badge>
    );
  }
  if (status === 'empty') {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border" data-testid="status-badge" data-status="empty">
        <Inbox className="w-3 h-3 me-1" />{bi('لا توجد بيانات', 'No data')}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-success/10 text-success border-success/30" data-testid="status-badge" data-status="success">
      <CheckCircle2 className="w-3 h-3 me-1" />{bi('معاينة جاهزة', 'Preview ready')}
    </Badge>
  );
}

/** Dry-run safety reassurance panel. Pure copy — no controls. */
function SafetyPanel({ bi }: { bi: (ar: string, en: string) => string }) {
  const items = [
    bi('معاينة فقط', 'Preview only'),
    bi('لا يتم تعديل أي تنبيهات', 'No alerts are changed'),
    bi('لا يتم إرسال أي إشعارات', 'No notifications are sent'),
    bi('لا توجد مهمة مجدولة قيد التشغيل', 'No cron job is running'),
  ];
  return (
    <Card data-testid="safety-panel">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium">
          <ShieldCheck className="w-4 h-4 text-primary" />
          {bi('ضمانات السلامة', 'Safety guarantees')}
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
          {items.map((label) => (
            <li key={label} className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Real-run readiness panel — read-only status grid. No controls. */
function ReadinessPanel({ bi }: { bi: (ar: string, en: string) => string }) {
  const readiness = useMemo(() => getOperationsRealRunReadiness(), []);
  const rows: Array<{ label: string; value: string; tone: 'ok' | 'off' }> = [
    {
      label: bi('التشغيل الفعلي', 'Real-run'),
      value: bi('معطّل', 'Disabled'),
      tone: 'off',
    },
    {
      label: bi('المهام المجدولة', 'Cron'),
      value: bi('معطّل', 'Disabled'),
      tone: 'off',
    },
    {
      label: bi('قنوات الإشعارات الخارجية', 'External notification channels'),
      value: bi('معطّل', 'Disabled'),
      tone: 'off',
    },
    {
      label: bi('سجل المعاينة اليدوية', 'Manual preview ledger'),
      value: bi('مفعّل', 'Enabled'),
      tone: 'ok',
    },
    {
      label: bi('المعاينة (Dry-run)', 'Dry-run preview'),
      value: bi('مفعّل', 'Enabled'),
      tone: 'ok',
    },
    {
      label: bi('تعديل التنبيهات من الواجهة', 'Alert mutation from UI'),
      value: bi('معطّل (محصور بالخادم)', 'Server-gated only / Disabled'),
      tone: 'off',
    },
    {
      label: bi('مسار التشغيل اليدوي الفعلي', 'Manual real-run pathway'),
      value: bi('مُصمَّم ومعطّل', 'Designed, disabled'),
      tone: 'off',
    },
    {
      label: bi('موافقة الإنتاج', 'Production approval'),
      value: bi('مطلوبة', 'Required'),
      tone: 'off',
    },
    {
      label: bi('التنفيذ من جانب الخادم فقط', 'Server-only execution'),
      value: bi('مطلوب', 'Required'),
      tone: 'off',
    },
    {
      label: bi('تسجيل تدقيق الموافقات', 'Approval audit logging'),
      value: bi('مفعّل', 'Enabled'),
      tone: 'ok',
    },
    {
      label: bi('عقد نقطة النهاية على الخادم', 'Server endpoint contract'),
      value: bi('مُصمَّم ومعطّل', 'Designed, disabled'),
      tone: 'off',
    },
    {
      label: bi('التشغيل الفعلي المُتحكَّم به', 'Controlled server real-run'),
      value: bi('متاح من جانب الخادم فقط', 'Server-only, not from UI'),
      tone: 'off',
    },
    {
      label: bi('كتابة الإشعارات', 'Notification writes'),
      value: bi('مؤجَّلة', 'Deferred'),
      tone: 'off',
    },
    {
      label: bi('مُحرِّك الاستدعاء اليدوي', 'Manual invocation harness'),
      value: bi('من جانب الخادم فقط', 'Server-only'),
      tone: 'off',
    },
    {
      label: bi('تنفيذ الواجهة للتشغيل الفعلي', 'UI real-run execution'),
      value: bi('معطّل', 'Disabled'),
      tone: 'off',
    },
    {
      label: bi('ربط اعتماديات قاعدة البيانات', 'Supabase dependency wiring'),
      value: bi('جاهز / من جانب الخادم فقط', 'Ready / Server-only'),
      tone: 'off',
    },
    {
      label: bi('نقطة طرف SLA اليدوية', 'Manual SLA edge endpoint'),
      value: bi('منشورة / معطّلة بالعلامة', 'Deployed / Disabled by flag'),
      tone: 'off',
    },
    {
      label: bi('دليل تشغيل SLA اليدوي', 'Manual SLA runbook'),
      value: bi('متاح', 'Available'),
      tone: 'ok',
    },
  ];
  return (
    <Card data-testid="readiness-panel">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          {bi('جاهزية التشغيل الفعلي', 'Real-run readiness')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"
          data-testid="readiness-rows"
        >
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
              data-testid="readiness-row"
              data-tone={r.tone}
            >
              <span className="text-muted-foreground">{r.label}</span>
              <Badge
                variant="outline"
                className={
                  r.tone === 'ok'
                    ? 'bg-success/10 text-success border-success/30'
                    : 'bg-muted text-muted-foreground border-border'
                }
              >
                {r.value}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground" data-testid="readiness-recommendation">
          {bi(
            'استمر في استخدام المعاينة (Dry-run) حتى الحصول على موافقة الإنتاج الصريحة.',
            readiness.recommendation,
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function ActionSamplesTable({ samples, bi }: {
  samples: SafeActionSample[];
  bi: (ar: string, en: string) => string;
}) {
  if (samples.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        {bi('لا توجد عينات إجراءات.', 'No action samples.')}
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{bi('النوع', 'Kind')}</TableHead>
          <TableHead>{bi('الشرط', 'Condition')}</TableHead>
          <TableHead>{bi('الخطورة', 'Severity')}</TableHead>
          <TableHead>{bi('مفتاح ال idempotency', 'Idempotency Key')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {samples.map((s, i) => (
          <TableRow key={`${s.conditionCode}-${s.entityId}-${i}`}>
            <TableCell>
              <Badge variant="outline" className="tech-content">{s.kind}</Badge>
            </TableCell>
            <TableCell className="tech-content text-xs">{s.conditionCode}</TableCell>
            <TableCell className="tech-content text-xs">
              {s.severity ? <Badge variant="secondary">{s.severity}</Badge> : '—'}
            </TableCell>
            <TableCell className="tech-content text-xs text-muted-foreground">
              {maskIdempotencyKey(s.idempotencyKey)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LoaderHealthTable({ preview, bi }: {
  preview: PreviewSlaSweepResult;
  bi: (ar: string, en: string) => string;
}) {
  const codes = useMemo(() => {
    const errs = new Map(preview.loaderErrors.map((e) => [e.conditionCode, e.message] as const));
    const all = new Set<string>([
      ...errs.keys(),
      ...preview.sampleActions.map((s) => s.conditionCode),
    ]);
    return Array.from(all).sort().map((code) => ({
      code,
      error: errs.get(code) ?? null,
    }));
  }, [preview]);
  const healthy = codes.filter((c) => !c.error).length;
  const failed = codes.filter((c) => c.error).length;
  if (codes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        {bi('لا توجد بيانات شروط.', 'No condition data.')}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs" data-testid="loader-health-summary">
        <span className="inline-flex items-center gap-1 text-success">
          <CheckCircle2 className="w-3 h-3" />
          {bi('سليم', 'Healthy')}: <span className="tabular-nums">{healthy}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-destructive">
          <XCircle className="w-3 h-3" />
          {bi('فشل', 'Failed')}: <span className="tabular-nums">{failed}</span>
        </span>
      </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{bi('الشرط', 'Condition')}</TableHead>
          <TableHead>{bi('الحالة', 'Status')}</TableHead>
          <TableHead>{bi('الخطأ', 'Error')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {codes.map(({ code, error }) => (
          <TableRow key={code}>
            <TableCell className="tech-content text-xs">{code}</TableCell>
            <TableCell>
              {error ? (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  <XCircle className="w-3 h-3 me-1" />{bi('خطأ', 'error')}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <CheckCircle2 className="w-3 h-3 me-1" />{bi('سليم', 'healthy')}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-md truncate">
              {error ?? '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

function RecentRunsTable({ runs, bi, isRTL }: {
  runs: ManualPreviewRunSummary[];
  bi: (ar: string, en: string) => string;
  isRTL: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{bi('بدء', 'Started')}</TableHead>
          <TableHead>{bi('الحالة', 'Status')}</TableHead>
          <TableHead>{bi('النوع', 'Run type')}</TableHead>
          <TableHead>{bi('إجمالي الإجراءات', 'Total actions')}</TableHead>
          <TableHead>{bi('المدة (ms)', 'Duration (ms)')}</TableHead>
          <TableHead>{bi('رمز الخطأ', 'Error code')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((r) => (
          <TableRow key={r.id} data-testid="recent-run-row">
            <TableCell className="tech-content text-xs">{formatTime(r.startedAt, isRTL)}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={
                  r.status === 'failed'
                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                    : r.status === 'partial'
                      ? 'bg-warning/10 text-warning border-warning/30'
                      : r.status === 'empty'
                        ? 'bg-muted text-muted-foreground border-border'
                        : 'bg-success/10 text-success border-success/30'
                }
              >
                {r.status ?? '—'}
              </Badge>
            </TableCell>
            <TableCell className="tech-content text-xs">{r.runType}</TableCell>
            <TableCell className="tech-content text-xs tabular-nums">{r.totalActionCount}</TableCell>
            <TableCell className="tech-content text-xs tabular-nums">{r.durationMs ?? '—'}</TableCell>
            <TableCell className="tech-content text-xs text-muted-foreground">{r.errorCode ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ApprovalAuditTable({ entries, bi, isRTL }: {
  entries: OperationsApprovalAuditEntry[];
  bi: (ar: string, en: string) => string;
  isRTL: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{bi('الوقت', 'Time')}</TableHead>
          <TableHead>{bi('الحدث', 'Event')}</TableHead>
          <TableHead>{bi('الحالة', 'Status')}</TableHead>
          <TableHead>{bi('السبب', 'Reason')}</TableHead>
          <TableHead>{bi('التذكرة', 'Ticket')}</TableHead>
          <TableHead>{bi('السياق', 'Context')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id} data-testid="approval-audit-row">
            <TableCell className="tech-content text-xs">{formatTime(e.startedAt, isRTL)}</TableCell>
            <TableCell className="tech-content text-xs">{e.eventType ?? '—'}</TableCell>
            <TableCell className="tech-content text-xs">{e.auditStatus ?? e.status ?? '—'}</TableCell>
            <TableCell className="tech-content text-xs text-muted-foreground">{e.reasonCode ?? '—'}</TableCell>
            <TableCell className="tech-content text-xs text-muted-foreground">{e.approvalTicket ?? '—'}</TableCell>
            <TableCell className="tech-content text-xs text-muted-foreground">{e.context}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const AdminOperations = () => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  usePageMeta({
    title: isRTL ? 'لوحة العمليات (معاينة)' : 'Operations Preview (Dry-run)',
  });
  useNoIndex();

  const {
    data, isLoading, isFetching, isError, error, refetch,
    lastSuccessfulAt, phase, ledger,
  } = useAdminOperationsPreview();
  const recent = useRecentManualSlaPreviewRuns();
  const approvalAudit = useOperationsApprovalAudit();

  const totals = data?.totals;
  const lastGoodIso = lastSuccessfulAt ? new Date(lastSuccessfulAt).toISOString() : undefined;
  // Show stale data on transient refresh failure rather than clearing it.
  const showStale = isError && !!data;

  const [tab, setTab] = useState<'samples' | 'health' | 'runs' | 'audit'>('samples');
  const ArrowFwd = isRTL ? ArrowLeft : ArrowRight;

  const quickLinks: Array<{
    to: string; ar: string; en: string;
    desc: { ar: string; en: string };
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    { to: '/admin/operations/console', ar: 'مركز العمليات', en: 'Operations Console',
      desc: { ar: 'الوحدة المركزية للعمليات', en: 'Central ops module' }, Icon: Terminal },
    { to: '/admin/quote-operations', ar: 'تشغيل عروض الأسعار', en: 'Quote Operations',
      desc: { ar: 'متابعة دورة الأسعار', en: 'Quote lifecycle ops' }, Icon: Send },
    { to: '/admin/cron-runs', ar: 'تشغيل المهام', en: 'Cron Runs',
      desc: { ar: 'المهام المجدولة', en: 'Scheduled jobs' }, Icon: FileClock },
    { to: '/admin/activity-log', ar: 'سجل النشاط', en: 'Activity Log',
      desc: { ar: 'الأنشطة عبر المنصة', en: 'Platform activities' }, Icon: History },
    { to: '/admin/audit-log', ar: 'سجل التدقيق الموحّد', en: 'Unified Audit Log',
      desc: { ar: 'تدقيق شامل', en: 'Comprehensive audit' }, Icon: ScrollText },
    { to: '/admin/diagnostics', ar: 'التشخيص', en: 'Diagnostics',
      desc: { ar: 'صحة النظام', en: 'System health' }, Icon: Stethoscope },
  ];

  return (
    <DashboardLayout>
    <main className="container mx-auto py-8 space-y-6" data-testid="admin-operations-page">
      {/* Hero header */}
      <header
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6"
        data-testid="ops-hero"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary">
                <Activity className="w-4.5 h-4.5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">
                {bi('لوحة العمليات', 'Operations Dashboard')}
              </h1>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/30"
                data-testid="dry-run-badge"
              >
                <ShieldCheck className="w-3 h-3 me-1" />
                {bi('معاينة فقط — بدون كتابة', 'Dry-run preview only')}
              </Badge>
              {data && <StatusBadge status={data.status} bi={bi} />}
              {phase === 'refreshing' && (
                <Badge variant="outline" data-testid="refreshing-badge">
                  <Loader2 className="w-3 h-3 me-1 animate-spin" />
                  {bi('جارٍ التحديث', 'Refreshing')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {bi(
                'هذه الصفحة لا تُغيّر أي تنبيهات، ولا ترسل إشعارات، ولا تُشغّل مهام مجدولة.',
                'This page does not mutate alerts, send notifications, or run cron.',
              )}
            </p>
            <div className="mt-2 text-xs text-muted-foreground" data-testid="last-success-time">
              {bi('آخر معاينة ناجحة:', 'Last successful preview:')}{' '}
              <span className="tech-content font-medium text-foreground/80">{formatTime(lastGoodIso, isRTL)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
            variant="outline"
            size="sm"
            disabled={!data || data.sampleActions.length === 0}
            data-testid="export-samples-csv"
            onClick={() => {
              if (!data) return;
              const headers = ['Kind', 'Condition', 'Severity', 'Entity ID', 'Idempotency (masked)'];
              const rows = data.sampleActions.map((s) => [
                s.kind,
                s.conditionCode,
                s.severity ?? '',
                s.entityId,
                maskIdempotencyKey(s.idempotencyKey),
              ]);
              downloadCsv(`ops-preview-samples-${tsStamp()}`, buildCsv(headers, rows));
            }}
            className="h-10 rounded-xl"
          >
            <Download className="w-4 h-4 me-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={printCurrentView}
            data-testid="print-preview"
            className="h-10 rounded-xl"
          >
            <Printer className="w-4 h-4 me-2" />
            {bi('طباعة', 'Print')}
          </Button>
          <Button
            size="sm"
            onClick={() => { void refetch(); }}
            aria-busy={isFetching}
            data-testid="refresh-preview"
            className="h-10 rounded-xl"
          >
            {isFetching
              ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
              : <RefreshCw className="w-4 h-4 me-2" />}
            {bi('تحديث المعاينة', 'Refresh preview')}
          </Button>
          </div>
        </div>
      </header>

      {/* Quick navigation to related operations modules */}
      <section data-testid="ops-quick-links">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {bi('عمليات ذات صلة', 'Related operations')}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group rounded-xl border bg-card p-3 hover-lift hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                  <q.Icon className="w-4 h-4" />
                </span>
                <ArrowFwd className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-sm font-semibold leading-tight">{bi(q.ar, q.en)}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {bi(q.desc.ar, q.desc.en)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Safety panel — always visible. Pure copy, no controls. */}
      <SafetyPanel bi={bi} />

      {/* Real-run readiness panel — read-only. No buttons. */}
      <ReadinessPanel bi={bi} />

      {/* Ledger status banner — surfaces the most recent manual-preview log result. */}
      {ledger && (
        <Card data-testid="ledger-status">
          <CardContent className="p-3 flex items-start gap-2 text-xs">
            {ledger.ok ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  {bi('تم تسجيل تشغيل المعاينة (سجل المعاينة اليدوية فقط).',
                      'Preview run logged (manual preview log only).')}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span className="text-warning tech-content" data-testid="ledger-error">
                  {bi('فشل تسجيل المعاينة:', 'Logging failed:')} {ledger.error ?? '—'}
                </span>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && (
        <Card className="border-destructive/40" data-testid="preview-error">
          <CardContent className="p-4 flex items-start gap-3">
            <ServerOff className="w-5 h-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">{bi('تعذّر تحميل المعاينة', 'Could not load preview')}</div>
              <div className="text-muted-foreground mt-1">{error?.message ?? '—'}</div>
              {showStale && (
                <div className="text-xs text-muted-foreground mt-2">
                  {bi(
                    'تم الإبقاء على آخر معاينة ناجحة معروضة أدناه.',
                    'Showing the last successful preview below.',
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totals grid */}
      <section
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        data-testid="totals-grid"
      >
        {isLoading && !data ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : (
          <>
            <StatBlock label={bi('مرشحون', 'Candidates')} value={totals?.candidates ?? 0} Icon={Users} />
            <StatBlock label={bi('إنشاء', 'Create')} value={totals?.create ?? 0} tone="warn" Icon={ListChecks} />
            <StatBlock label={bi('تصعيد', 'Escalate')} value={totals?.escalate ?? 0} tone="warn" Icon={TrendingUp} />
            <StatBlock label={bi('إغلاق', 'Resolve')} value={totals?.resolve ?? 0} tone="ok" Icon={CheckCheck} />
            <StatBlock label={bi('تم تخطيه', 'Skipped')} value={totals?.skipped ?? 0} Icon={SkipForward} />
            <StatBlock
              label={bi('إشعارات مخططة', 'Planned notifications')}
              value={totals?.plannedNotifications ?? 0}
              Icon={Bell}
            />
          </>
        )}
      </section>

      {/* Log status — quick summary */}
      <section className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {bi('حالة سجل التشغيل', 'Run log status')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2" data-testid="log-status">
            {isLoading ? (
              <Skeleton className="h-16" />
            ) : data ? (
              <>
                <div className="flex items-center gap-2">
                  {data.log.status === 'ok' ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                      <CheckCircle2 className="w-3 h-3 me-1" />{bi('ناجح', 'ok')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      <XCircle className="w-3 h-3 me-1" />{bi('فشل', 'failed')}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground tech-content">
                    {data.log.runType}
                  </span>
                </div>
                {data.log.error && (
                  <div className="text-xs text-destructive tech-content">{data.log.error}</div>
                )}
                {data.logError && (
                  <div className="text-xs text-warning tech-content">
                    {bi('خطأ المُسجِّل:', 'Logger error:')} {data.logError}
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              {bi('روابط سريعة', 'Quick console links')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Link to="/admin/operations/console" className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/40 transition-colors">
              <span className="flex items-center gap-2"><Terminal className="w-4 h-4 text-primary" /> {bi('مركز العمليات الكامل', 'Full Operations Console')}</span>
              <ArrowFwd className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
            <Link to="/admin/cron-runs" className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/40 transition-colors">
              <span className="flex items-center gap-2"><FileClock className="w-4 h-4 text-primary" /> {bi('سجل تشغيل المهام', 'Cron run history')}</span>
              <ArrowFwd className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
            <Link to="/admin/audit-log" className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/40 transition-colors">
              <span className="flex items-center gap-2"><ScrollText className="w-4 h-4 text-primary" /> {bi('سجل التدقيق الموحّد', 'Unified audit log')}</span>
              <ArrowFwd className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Detailed sections — tabbed to reduce scroll while preserving all data. */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 rounded-xl">
          <TabsTrigger value="samples" className="rounded-lg gap-1.5">
            <ListChecks className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{bi('العينات', 'Samples')}</span>
            {data && (
              <Badge variant="secondary" className="ms-1 h-4 text-[10px] tech-content">{data.actionSampleCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="health" className="rounded-lg gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{bi('السلامة', 'Health')}</span>
          </TabsTrigger>
          <TabsTrigger value="runs" className="rounded-lg gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{bi('التشغيلات', 'Runs')}</span>
            {recent.runs.length > 0 && (
              <Badge variant="secondary" className="ms-1 h-4 text-[10px] tech-content">{recent.runs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{bi('التدقيق', 'Audit')}</span>
            {approvalAudit.entries.length > 0 && (
              <Badge variant="secondary" className="ms-1 h-4 text-[10px] tech-content">{approvalAudit.entries.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="samples" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{bi('عينات الإجراءات', 'Action samples')}</span>
                <span className="text-xs text-muted-foreground" data-testid="sample-cap-text">
                  {data
                    ? bi(
                        `عرض ${data.actionSampleCount} من ${data.totalActionCount} (الحد ${data.sampleLimit})`,
                        `Showing ${data.actionSampleCount} of ${data.totalActionCount} (cap ${data.sampleLimit})`,
                      )
                    : bi('الحد الأقصى', 'Cap') + ': —'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="action-samples">
              {isLoading && !data ? <Skeleton className="h-24" /> : data ? (
                data.sampleActions.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 text-center" data-testid="empty-state">
                    {bi(
                      'لا توجد إجراءات SLA تتطلب الانتباه حاليًا.',
                      'No SLA actions currently require attention.',
                    )}
                  </div>
                ) : (
                  <ActionSamplesTable samples={data.sampleActions} bi={bi} />
                )
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                {bi('سلامة المحمّلات', 'Loader health')}
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="loader-health">
              {isLoading && !data ? <Skeleton className="h-16" /> : data ? (
                <LoaderHealthTable preview={data} bi={bi} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{bi('آخر عمليات المعاينة اليدوية', 'Recent manual preview runs')}</span>
                <span className="text-xs text-muted-foreground">
                  {bi(`الحد ${MANUAL_PREVIEW_RUNS_CAP}`, `cap ${MANUAL_PREVIEW_RUNS_CAP}`)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="recent-runs">
              {recent.isLoading ? (
                <Skeleton className="h-16" />
              ) : recent.isError ? (
                <div className="text-xs text-muted-foreground">
                  {bi('تعذّر تحميل السجلات الأخيرة.', 'Could not load recent runs.')}
                </div>
              ) : recent.runs.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  {bi('لا توجد عمليات معاينة مسجّلة بعد.', 'No manual preview runs logged yet.')}
                </div>
              ) : (
                <RecentRunsTable runs={recent.runs} bi={bi} isRTL={isRTL} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{bi('سجل تدقيق موافقات الإنتاج', 'Production approval audit')}</span>
                <span className="text-xs text-muted-foreground">
                  {bi(`الحد ${OPERATIONS_APPROVAL_AUDIT_CAP}`, `cap ${OPERATIONS_APPROVAL_AUDIT_CAP}`)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="approval-audit">
              {approvalAudit.isLoading ? (
                <Skeleton className="h-16" />
              ) : approvalAudit.isError ? (
                <div className="text-xs text-muted-foreground">
                  {bi('تعذّر تحميل سجل التدقيق.', 'Could not load approval audit.')}
                </div>
              ) : approvalAudit.entries.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  {bi('لا توجد محاولات موافقة مسجّلة بعد.', 'No approval attempts logged yet.')}
                </div>
              ) : (
                <ApprovalAuditTable entries={approvalAudit.entries} bi={bi} isRTL={isRTL} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
    </DashboardLayout>
  );
};

export default AdminOperations;