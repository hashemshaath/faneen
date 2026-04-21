import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2, XCircle, MinusCircle, Database, Smartphone,
  ShieldAlert, KeyRound, FileJson, HardDrive, WifiOff, AlertTriangle,
} from 'lucide-react';

interface TelemetryRow {
  id: string;
  migration_key: string;
  status: 'success' | 'failed' | 'skipped' | 'no_legacy_data';
  keys_migrated: number;
  user_agent: string | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_META: Record<TelemetryRow['status'], { icon: typeof CheckCircle2; cls: string; ar: string; en: string }> = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', ar: 'نجح', en: 'Success' },
  failed: { icon: XCircle, cls: 'text-destructive bg-destructive/10 border-destructive/20', ar: 'فشل', en: 'Failed' },
  skipped: { icon: MinusCircle, cls: 'text-muted-foreground bg-muted border-border', ar: 'متخطى', en: 'Skipped' },
  no_legacy_data: { icon: MinusCircle, cls: 'text-muted-foreground bg-muted border-border', ar: 'لا بيانات قديمة', en: 'No legacy data' },
};

/**
 * Error classification for migration failures. Helps admins triage root causes
 * quickly without reading every raw error_message string.
 */
type ErrorCategory = 'rls' | 'keys_missing' | 'json_parse' | 'quota' | 'network' | 'unknown';

const CATEGORY_META: Record<ErrorCategory, {
  icon: typeof ShieldAlert;
  cls: string;
  ar: { label: string; hint: string };
  en: { label: string; hint: string };
}> = {
  rls: {
    icon: ShieldAlert,
    cls: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    ar: { label: 'صلاحيات RLS', hint: 'سياسة Row-Level Security ترفض الكتابة. تحقق من سياسات الجدول.' },
    en: { label: 'RLS denied', hint: 'Row-Level Security policy blocked the write. Review table policies.' },
  },
  keys_missing: {
    icon: KeyRound,
    cls: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    ar: { label: 'مفاتيح مفقودة', hint: 'مفتاح متوقع غير موجود في localStorage على جهاز المستخدم.' },
    en: { label: 'Keys missing', hint: 'An expected localStorage key was absent on the device.' },
  },
  json_parse: {
    icon: FileJson,
    cls: 'text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
    ar: { label: 'خطأ تحليل JSON', hint: 'القيمة المخزنة تالفة أو ليست JSON صالحاً.' },
    en: { label: 'JSON parse error', hint: 'Stored value is corrupt or not valid JSON.' },
  },
  quota: {
    icon: HardDrive,
    cls: 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    ar: { label: 'حصة التخزين', hint: 'تم تجاوز سعة localStorage على المتصفح.' },
    en: { label: 'Storage quota', hint: 'Browser localStorage quota exceeded.' },
  },
  network: {
    icon: WifiOff,
    cls: 'text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    ar: { label: 'خطأ شبكة', hint: 'فشل الاتصال بخادم التحليلات أثناء الإرسال.' },
    en: { label: 'Network error', hint: 'Failed to reach the telemetry endpoint.' },
  },
  unknown: {
    icon: AlertTriangle,
    cls: 'text-muted-foreground bg-muted border-border',
    ar: { label: 'سبب غير مصنّف', hint: 'استعرض الرسالة الخام للتفاصيل.' },
    en: { label: 'Unclassified', hint: 'Inspect the raw message for details.' },
  },
};

/**
 * Classify a raw error_message string into one of the known categories.
 * Pattern order matters — more specific patterns must come first.
 */
function classifyError(msg: string | null): ErrorCategory | null {
  if (!msg) return null;
  const m = msg.toLowerCase();
  if (
    m.includes('row-level security') ||
    m.includes('row level security') ||
    m.includes('rls') ||
    m.includes('permission denied') ||
    m.includes('not authorized') ||
    m.includes('policy')
  ) return 'rls';
  if (
    m.includes('quotaexceeded') ||
    m.includes('quota exceeded') ||
    m.includes('exceeded the quota')
  ) return 'quota';
  if (
    m.includes('unexpected token') ||
    m.includes('json.parse') ||
    m.includes('invalid json') ||
    m.includes('json at position')
  ) return 'json_parse';
  if (
    m.includes('missing key') ||
    m.includes('key not found') ||
    m.includes('null is not') ||
    m.includes('cannot read properties of null')
  ) return 'keys_missing';
  if (
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('fetch failed') ||
    m.includes('timeout') ||
    m.includes('timed out')
  ) return 'network';
  return 'unknown';
}

function detectDevice(ua: string | null): string {
  if (!ua) return '—';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

export const MigrationTelemetryCard = () => {
  const { isRTL } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['migration-telemetry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('migration_telemetry')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as TelemetryRow[];
    },
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    const rows = data || [];
    const last24h = rows.filter(r => new Date(r.created_at) > new Date(Date.now() - 86_400_000));
    const success = rows.filter(r => r.status === 'success').length;
    const failed = rows.filter(r => r.status === 'failed').length;
    const skipped = rows.filter(r => r.status === 'skipped' || r.status === 'no_legacy_data').length;
    const totalKeysMigrated = rows.reduce((sum, r) => sum + (r.keys_migrated || 0), 0);
    const successRate = rows.length > 0 ? Math.round((success / rows.length) * 100) : 100;
    return { total: rows.length, last24h: last24h.length, success, failed, skipped, totalKeysMigrated, successRate };
  }, [data]);

  // Aggregate failures by category for the diagnostic breakdown panel
  const errorBreakdown = useMemo(() => {
    const rows = data || [];
    const buckets: Record<ErrorCategory, TelemetryRow[]> = {
      rls: [], keys_missing: [], json_parse: [], quota: [], network: [], unknown: [],
    };
    for (const r of rows) {
      if (r.status !== 'failed') continue;
      const cat = classifyError(r.error_message) || 'unknown';
      buckets[cat].push(r);
    }
    const ordered = (Object.keys(buckets) as ErrorCategory[])
      .map(cat => ({ cat, rows: buckets[cat] }))
      .filter(b => b.rows.length > 0)
      .sort((a, b) => b.rows.length - a.rows.length);
    return ordered;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="w-4 h-4 text-accent" />
          {isRTL ? 'تحليلات ترحيل بيانات المتصفح' : 'Browser Storage Migration Telemetry'}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isRTL
            ? 'تتبع نجاح ترحيل localStorage من faneen_* إلى qitaat_* عبر أجهزة المستخدمين.'
            : 'Tracks success of localStorage migration from faneen_* to qitaat_* across user devices.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">{isRTL ? 'إجمالي الأجهزة' : 'Total devices'}</div>
            <div className="text-xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">{isRTL ? 'آخر 24 ساعة' : 'Last 24h'}</div>
            <div className="text-xl font-bold">{stats.last24h}</div>
          </div>
          <div className="rounded-lg border p-3 bg-emerald-500/5 border-emerald-500/20">
            <div className="text-xs text-emerald-700 dark:text-emerald-400">{isRTL ? 'معدل النجاح' : 'Success rate'}</div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.successRate}%</div>
          </div>
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">{isRTL ? 'مفاتيح مُرحَّلة' : 'Keys migrated'}</div>
            <div className="text-xl font-bold">{stats.totalKeysMigrated}</div>
          </div>
        </div>

        {/* Error breakdown by category — admin diagnostics */}
        {errorBreakdown.length > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h4 className="text-sm font-bold text-destructive">
                {isRTL ? 'تشخيص الأخطاء حسب التصنيف' : 'Error diagnostics by category'}
              </h4>
              <Badge variant="destructive" className="text-[10px] ms-auto">
                {errorBreakdown.reduce((s, b) => s + b.rows.length, 0)}{' '}
                {isRTL ? 'حالة فشل' : 'failures'}
              </Badge>
            </div>
            <div className="space-y-2">
              {errorBreakdown.map(({ cat, rows }) => {
                const meta = CATEGORY_META[cat];
                const CatIcon = meta.icon;
                const label = isRTL ? meta.ar.label : meta.en.label;
                const hint = isRTL ? meta.ar.hint : meta.en.hint;
                const sample = rows[0];
                return (
                  <details
                    key={cat}
                    className={`rounded-md border ${meta.cls} group`}
                  >
                    <summary className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer list-none">
                      <CatIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-bold">{label}</span>
                      <Badge variant="outline" className="text-[10px] h-5 bg-background/60">
                        {rows.length}
                      </Badge>
                      <span className="text-[11px] opacity-80 ms-auto truncate hidden sm:inline">
                        {hint}
                      </span>
                    </summary>
                    <div className="px-2.5 pb-2 pt-1 border-t border-current/10 space-y-1.5">
                      <p className="text-[11px] opacity-90 sm:hidden">{hint}</p>
                      <div className="text-[11px] font-medium opacity-80">
                        {isRTL ? 'أحدث رسالة:' : 'Latest message:'}
                      </div>
                      <code className="block text-[11px] bg-background/60 rounded p-1.5 font-mono break-all whitespace-pre-wrap max-h-24 overflow-auto">
                        {sample?.error_message || (isRTL ? '(لا رسالة)' : '(no message)')}
                      </code>
                      <div className="flex items-center gap-2 text-[10px] opacity-75">
                        <Smartphone className="w-3 h-3" />
                        <span>{detectDevice(sample?.user_agent)}</span>
                        <span className="ms-auto">
                          {sample && new Date(sample.created_at).toLocaleString(
                            isRTL ? 'ar-SA' : 'en-US',
                            { dateStyle: 'short', timeStyle: 'short' },
                          )}
                        </span>
                      </div>
                      {rows.length > 1 && (
                        <div className="text-[10px] opacity-70 pt-1">
                          {isRTL
                            ? `+${rows.length - 1} حالة أخرى من نفس النوع`
                            : `+${rows.length - 1} more in this category`}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent events */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">{isRTL ? 'أحدث الأحداث' : 'Recent events'}</h4>
            {stats.failed > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {stats.failed} {isRTL ? 'فشل' : 'failed'}
              </Badge>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {isRTL ? 'لا توجد سجلات بعد' : 'No records yet'}
            </p>
          ) : (
            <ScrollArea className="h-64 rounded-lg border">
              <div className="divide-y">
                {data.map(row => {
                  const meta = STATUS_META[row.status];
                  const Icon = meta.icon;
                  const device = detectDevice(row.user_agent);
                  const cat = row.status === 'failed' ? classifyError(row.error_message) : null;
                  const catMeta = cat ? CATEGORY_META[cat] : null;
                  const CatIcon = catMeta?.icon;
                  return (
                    <div key={row.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${meta.cls}`}>
                        <Icon className="w-3 h-3" />
                        <span className="font-medium">{isRTL ? meta.ar : meta.en}</span>
                      </div>
                      {catMeta && CatIcon && (
                        <div
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${catMeta.cls}`}
                          title={isRTL ? catMeta.ar.hint : catMeta.en.hint}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span className="font-medium">
                            {isRTL ? catMeta.ar.label : catMeta.en.label}
                          </span>
                        </div>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Smartphone className="w-3 h-3" />
                        {device}
                      </span>
                      {row.keys_migrated > 0 && (
                        <span className="text-muted-foreground">
                          {row.keys_migrated} {isRTL ? 'مفتاح' : 'keys'}
                        </span>
                      )}
                      {row.error_message && (
                        <span className="text-destructive truncate max-w-xs" title={row.error_message}>
                          {row.error_message}
                        </span>
                      )}
                      <span className="text-muted-foreground ms-auto shrink-0">
                        {new Date(row.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
                          dateStyle: 'short', timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
