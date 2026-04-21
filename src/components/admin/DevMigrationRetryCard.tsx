import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { runMigrationManually, type ManualMigrationResult } from '@/utils/migrateLocalStorage';
import {
  RefreshCw, FlaskConical, CheckCircle2, XCircle, MinusCircle,
  Database, HardDrive, Cookie, KeyRound, AlertTriangle, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DEV-only inline panel that lets an admin re-run the localStorage / cookie
 * migration on the current device and see a structured summary of what
 * was migrated and what was swept. Hidden in production builds.
 *
 * The retry button resets local gating flags before running, so each click
 * is a true fresh attempt — and it logs a new telemetry event so the result
 * also appears in the admin dashboard.
 */
export const DevMigrationRetryCard = () => {
  const { isRTL } = useLanguage();
  const [result, setResult] = useState<ManualMigrationResult | null>(null);
  const [running, setRunning] = useState(false);

  // Hide in production builds — this is a developer/QA tool
  if (!import.meta.env.DEV) return null;

  const handleRetry = async () => {
    setRunning(true);
    // Defer one tick so the UI updates the spinner before work starts
    await new Promise((r) => setTimeout(r, 0));
    const next = await runMigrationManually();
    setResult(next);
    setRunning(false);
  };

  const StatusBadge = ({ status }: { status: ManualMigrationResult['status'] }) => {
    const map = {
      success: { icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', ar: 'نجح', en: 'Success' },
      failed: { icon: XCircle, cls: 'bg-destructive/10 text-destructive border-destructive/20', ar: 'فشل', en: 'Failed' },
      skipped: { icon: MinusCircle, cls: 'bg-muted text-muted-foreground border-border', ar: 'متخطى', en: 'Skipped' },
      no_legacy_data: { icon: MinusCircle, cls: 'bg-muted text-muted-foreground border-border', ar: 'لا بيانات قديمة', en: 'No legacy data' },
    } as const;
    const m = map[status];
    const Icon = m.icon;
    return (
      <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium', m.cls)}>
        <Icon className="w-3.5 h-3.5" />
        {isRTL ? m.ar : m.en}
      </div>
    );
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              {isRTL ? 'أداة إعادة الترحيل (DEV فقط)' : 'Migration Retry Tool (DEV only)'}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL
                ? 'تعيد تشغيل الترحيل والتنظيف على هذا الجهاز فقط، وتعرض ملخصاً مفصلاً للنتيجة.'
                : 'Re-runs migration and sweep on this device only and shows a detailed summary.'}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">
            DEV
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleRetry}
            disabled={running}
            size="sm"
            variant="default"
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', running && 'animate-spin')} />
            {running
              ? (isRTL ? 'جاري التشغيل…' : 'Running…')
              : (isRTL ? 'إعادة تشغيل الترحيل' : 'Re-run migration')}
          </Button>
          {result && <StatusBadge status={result.status} />}
          {result && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {result.durationMs} ms
            </span>
          )}
        </div>

        {!result && !running && (
          <p className="text-xs text-muted-foreground italic">
            {isRTL
              ? 'اضغط الزر أعلاه لإجراء عملية ترحيل جديدة وعرض الملخص هنا.'
              : 'Click the button above to trigger a fresh migration and see the summary here.'}
          </p>
        )}

        {result && (
          <div className="space-y-3">
            {/* Counters grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <SummaryStat
                icon={KeyRound}
                label={isRTL ? 'مفاتيح مُرحَّلة' : 'Migrated'}
                value={result.migrated}
                tone="emerald"
              />
              <SummaryStat
                icon={Database}
                label={isRTL ? 'يتيمة في localStorage' : 'Local orphans'}
                value={result.sweptLocal}
                tone="blue"
              />
              <SummaryStat
                icon={HardDrive}
                label={isRTL ? 'يتيمة في sessionStorage' : 'Session orphans'}
                value={result.sweptSession}
                tone="purple"
              />
              <SummaryStat
                icon={Cookie}
                label={isRTL ? 'كوكيز محذوفة' : 'Cookies swept'}
                value={result.sweptCookies}
                tone="amber"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              {isRTL
                ? `الإجمالي المُنظَّف: ${result.totalCleaned} عنصر — تم في ${new Date(result.ranAt).toLocaleTimeString('ar-SA')}`
                : `Total cleaned: ${result.totalCleaned} items — at ${new Date(result.ranAt).toLocaleTimeString('en-US')}`}
            </div>

            {/* Error details when failed */}
            {result.errorCode && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-xs font-bold text-destructive">
                    {isRTL ? 'تفاصيل الخطأ' : 'Error details'}
                  </span>
                  <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 ms-auto">
                    {result.errorCode}
                  </code>
                </div>
                {result.errorMessage && (
                  <code className="block text-[11px] bg-background/60 rounded p-1.5 font-mono break-all whitespace-pre-wrap max-h-20 overflow-auto">
                    {result.errorMessage}
                  </code>
                )}
              </div>
            )}

            {/* Per-failure diagnostics — shown whenever any storage permission
                problem was captured, even if the run still succeeded overall. */}
            {result.diagnostics.length > 0 && (
              <details className="rounded-md border border-amber-500/30 bg-amber-500/5">
                <summary className="px-2.5 py-1.5 text-xs font-medium cursor-pointer list-none flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{isRTL ? 'سجل أخطاء التخزين/الكوكيز' : 'Storage / cookie permission log'}</span>
                  <Badge variant="outline" className="text-[10px] ms-auto">
                    {result.diagnostics.length}
                  </Badge>
                </summary>
                <Separator />
                <ScrollArea className="max-h-56">
                  <div className="p-2.5 space-y-1.5 text-[11px]">
                    {result.diagnostics.map((d, i) => (
                      <div
                        key={`${d.ts}-${i}`}
                        className="rounded border border-amber-500/20 bg-background/60 p-1.5 font-mono"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="px-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px]">
                            {d.scope}
                          </span>
                          <span className="px-1 rounded bg-muted text-[10px]">{d.phase}</span>
                          <span className="px-1 rounded bg-destructive/20 text-destructive text-[10px]">
                            {d.code}
                          </span>
                          {d.key && (
                            <span className="px-1 rounded bg-sky-500/20 text-sky-800 dark:text-sky-300 text-[10px] break-all">
                              {d.key}
                            </span>
                          )}
                          <span className="text-[10px] opacity-60 ms-auto">
                            {new Date(d.ts).toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US')}
                          </span>
                        </div>
                        <div className="break-all whitespace-pre-wrap text-foreground/80">
                          {d.message}
                        </div>
                        {(d.host || d.path) && (
                          <div className="mt-1 text-[10px] opacity-60 break-all">
                            {d.host || ''}{d.path || ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </details>
            )}

            {/* Detailed key list, collapsible */}
            {(result.migratedKeys.length > 0 ||
              result.sweptLocalKeys.length > 0 ||
              result.sweptSessionKeys.length > 0 ||
              result.sweptCookieKeys.length > 0) && (
              <details className="rounded-md border bg-background/40">
                <summary className="px-2.5 py-1.5 text-xs font-medium cursor-pointer list-none flex items-center gap-2">
                  <span>{isRTL ? 'المفاتيح المتأثرة' : 'Affected keys'}</span>
                  <Badge variant="outline" className="text-[10px] ms-auto">
                    {result.migratedKeys.length +
                      result.sweptLocalKeys.length +
                      result.sweptSessionKeys.length +
                      result.sweptCookieKeys.length}
                  </Badge>
                </summary>
                <Separator />
                <ScrollArea className="max-h-56">
                  <div className="p-2.5 space-y-2 text-[11px]">
                    <KeyGroup
                      title={isRTL ? 'مُرحَّلة' : 'Migrated'}
                      keys={result.migratedKeys}
                      tone="emerald"
                    />
                    <KeyGroup
                      title={isRTL ? 'يتيمة محذوفة (localStorage)' : 'Swept (localStorage)'}
                      keys={result.sweptLocalKeys}
                      tone="blue"
                    />
                    <KeyGroup
                      title={isRTL ? 'يتيمة محذوفة (sessionStorage)' : 'Swept (sessionStorage)'}
                      keys={result.sweptSessionKeys}
                      tone="purple"
                    />
                    <KeyGroup
                      title={isRTL ? 'كوكيز محذوفة' : 'Swept cookies'}
                      keys={result.sweptCookieKeys}
                      tone="amber"
                    />
                  </div>
                </ScrollArea>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Internal helpers ---

const TONE_CLASSES = {
  emerald: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  blue: 'text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
  purple: 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
  amber: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
} as const;

type Tone = keyof typeof TONE_CLASSES;

const SummaryStat = ({
  icon: Icon, label, value, tone,
}: {
  icon: typeof KeyRound;
  label: string;
  value: number;
  tone: Tone;
}) => (
  <div className={cn('rounded-lg border p-2.5', TONE_CLASSES[tone])}>
    <div className="flex items-center gap-1.5 text-[11px] opacity-90">
      <Icon className="w-3.5 h-3.5" />
      <span className="font-medium truncate">{label}</span>
    </div>
    <div className="text-lg font-bold mt-0.5">{value}</div>
  </div>
);

const KeyGroup = ({ title, keys, tone }: { title: string; keys: string[]; tone: Tone }) => {
  if (keys.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase opacity-70 mb-1">{title} ({keys.length})</div>
      <div className="flex flex-wrap gap-1">
        {keys.map((k) => (
          <code
            key={k}
            className={cn(
              'text-[10px] font-mono px-1.5 py-0.5 rounded border break-all',
              TONE_CLASSES[tone],
            )}
          >
            {k}
          </code>
        ))}
      </div>
    </div>
  );
};