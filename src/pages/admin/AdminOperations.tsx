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
import { useMemo } from 'react';
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
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAdminOperationsPreview } from '@/modules/operations';
import type {
  PreviewSlaSweepResult,
  SafeActionSample,
} from '@/modules/operations/services/previewSlaSweepForAdmin';

/** Mask an idempotency key to its trailing bucket suffix for safe display. */
export function maskIdempotencyKey(key: string | undefined): string {
  if (!key) return '—';
  const parts = key.split(':');
  if (parts.length <= 2) return '••••';
  const tail = parts.slice(-2).join(':');
  return `••••:${tail}`;
}

function StatBlock({ label, value, tone = 'default' }: {
  label: string;
  value: number | string;
  tone?: 'default' | 'warn' | 'ok' | 'danger';
}) {
  const toneClass =
    tone === 'warn' ? 'text-warning'
      : tone === 'danger' ? 'text-destructive'
      : tone === 'ok' ? 'text-success'
      : 'text-foreground';
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function formatTime(iso: string | undefined, isRTL: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
      dateStyle: 'medium', timeStyle: 'medium',
    });
  } catch {
    return iso;
  }
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
  if (codes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        {bi('لا توجد بيانات شروط.', 'No condition data.')}
      </div>
    );
  }
  return (
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
  );
}

const AdminOperations = () => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  usePageMeta({
    title: isRTL ? 'لوحة العمليات (معاينة)' : 'Operations Preview (Dry-run)',
  });
  useNoIndex();

  const { data, isLoading, isFetching, isError, error, refetch, fetchedAt } =
    useAdminOperationsPreview();

  const totals = data?.totals;
  const fetchedAtIso = fetchedAt ? new Date(fetchedAt).toISOString() : undefined;

  return (
    <main className="container mx-auto py-8 space-y-6" data-testid="admin-operations-page">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-semibold">
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
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {bi(
              'هذه الصفحة لا تُغيّر أي تنبيهات، ولا ترسل إشعارات، ولا تُشغّل مهام مجدولة.',
              'This page does not mutate alerts, send notifications, or run cron.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {bi('آخر تحديث:', 'Last refresh:')} <span className="tech-content">{formatTime(fetchedAtIso, isRTL)}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void refetch(); }}
            disabled={isFetching}
            data-testid="refresh-preview"
          >
            {isFetching
              ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
              : <RefreshCw className="w-4 h-4 me-2" />}
            {bi('تحديث المعاينة', 'Refresh preview')}
          </Button>
        </div>
      </header>

      {/* Error state */}
      {isError && (
        <Card className="border-destructive/40" data-testid="preview-error">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">{bi('تعذّر تحميل المعاينة', 'Could not load preview')}</div>
              <div className="text-muted-foreground mt-1">{error?.message ?? '—'}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totals grid */}
      <section
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        data-testid="totals-grid"
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : (
          <>
            <StatBlock label={bi('مرشحون', 'Candidates')} value={totals?.candidates ?? 0} />
            <StatBlock label={bi('إنشاء', 'Create')} value={totals?.create ?? 0} tone="warn" />
            <StatBlock label={bi('تصعيد', 'Escalate')} value={totals?.escalate ?? 0} tone="warn" />
            <StatBlock label={bi('إغلاق', 'Resolve')} value={totals?.resolve ?? 0} tone="ok" />
            <StatBlock label={bi('تم تخطيه', 'Skipped')} value={totals?.skipped ?? 0} />
            <StatBlock
              label={bi('إشعارات مخططة', 'Planned notifications')}
              value={totals?.plannedNotifications ?? 0}
            />
          </>
        )}
      </section>

      {/* Log status + loader health summary */}
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
              <Database className="w-4 h-4" />
              {bi('سلامة المحمّلات', 'Loader health')}
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="loader-health">
            {isLoading ? <Skeleton className="h-16" /> : data ? (
              <LoaderHealthTable preview={data} bi={bi} />
            ) : null}
          </CardContent>
        </Card>
      </section>

      {/* Action samples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>{bi('عينات الإجراءات', 'Action samples')}</span>
            <span className="text-xs text-muted-foreground">
              {bi('الحد الأقصى', 'Cap')}: {data?.sampleLimit ?? '—'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent data-testid="action-samples">
          {isLoading ? <Skeleton className="h-24" /> : data ? (
            <ActionSamplesTable samples={data.sampleActions} bi={bi} />
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminOperations;