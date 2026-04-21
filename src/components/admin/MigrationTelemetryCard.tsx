import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, MinusCircle, Database, Smartphone } from 'lucide-react';

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
                  return (
                    <div key={row.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${meta.cls}`}>
                        <Icon className="w-3 h-3" />
                        <span className="font-medium">{isRTL ? meta.ar : meta.en}</span>
                      </div>
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
