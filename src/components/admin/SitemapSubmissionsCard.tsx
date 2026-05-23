import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { pingSearchEngines } from '@/modules/seo';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Send, RefreshCw, CheckCircle2, XCircle, MinusCircle, Globe, Clock } from 'lucide-react';

interface Submission {
  id: string;
  provider: string;
  status: 'success' | 'failed' | 'skipped' | 'pending';
  http_status: number | null;
  message: string | null;
  url_count: number | null;
  trigger_source: string;
  duration_ms: number | null;
  created_at: string;
}

const PROVIDER_LABELS: Record<string, { ar: string; en: string }> = {
  google: { ar: 'Google', en: 'Google' },
  bing_indexnow: { ar: 'Bing (IndexNow)', en: 'Bing (IndexNow)' },
  yandex_indexnow: { ar: 'Yandex (IndexNow)', en: 'Yandex (IndexNow)' },
};

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-success bg-success/10 border-success/20' },
  failed: { icon: XCircle, cls: 'text-destructive bg-destructive/10 border-destructive/20' },
  skipped: { icon: MinusCircle, cls: 'text-muted-foreground bg-muted border-border' },
  pending: { icon: Clock, cls: 'text-warning bg-warning/10 border-warning/20' },
};

export const SitemapSubmissionsCard = () => {
  const { t, isRTL } = useLanguage();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sitemap-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sitemap_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Submission[];
    },
    refetchInterval: 30_000,
  });

  const triggerPing = useMutation({
    mutationFn: async () => {
      setSubmitting(true);
      const { data, error } = await pingSearchEngines({ source: 'manual' });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إرسال الـ sitemap بنجاح' : 'Sitemap submitted successfully');
      qc.invalidateQueries({ queryKey: ['sitemap-submissions'] });
    },
    onError: (e: Error) => {
      toast.error(isRTL ? `فشل الإرسال: ${e.message}` : `Submission failed: ${e.message}`);
    },
    onSettled: () => setSubmitting(false),
  });

  const summary = useMemo(() => {
    if (!data) return null;
    const last24h = data.filter(d => new Date(d.created_at).getTime() > Date.now() - 86400_000);
    const success = last24h.filter(d => d.status === 'success').length;
    const failed = last24h.filter(d => d.status === 'failed').length;
    return { last24h: last24h.length, success, failed, total: data.length };
  }, [data]);

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
              <Globe className="w-4.5 h-4.5 text-info" />
            </div>
            <div>
              <CardTitle className="text-base">
                {isRTL ? 'إعلام محركات البحث' : 'Search Engine Indexing'}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isRTL
                  ? 'إعلام Google و Bing و Yandex بتحديث sitemap.xml'
                  : 'Notify Google, Bing & Yandex about sitemap updates'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => refetch()}
              className="h-8 gap-1.5 text-xs rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
            <Button
              size="sm"
              onClick={() => triggerPing.mutate()}
              disabled={submitting}
              className="h-8 gap-1.5 text-xs rounded-lg"
            >
              <Send className={`w-3.5 h-3.5 ${submitting ? 'animate-pulse' : ''}`} />
              {submitting
                ? (isRTL ? 'جاري الإرسال...' : 'Submitting...')
                : (isRTL ? 'إرسال الآن' : 'Submit Now')}
            </Button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'آخر 24 ساعة' : 'Last 24h'}
              </p>
              <p className="text-lg font-bold tabular-nums">{summary.last24h}</p>
            </div>
            <div className="rounded-lg bg-success/5 border border-success/15 px-3 py-2">
              <p className="text-[10px] text-success dark:text-success uppercase tracking-wide">
                {isRTL ? 'نجح' : 'Success'}
              </p>
              <p className="text-lg font-bold tabular-nums text-success dark:text-success">{summary.success}</p>
            </div>
            <div className="rounded-lg bg-destructive/5 border border-destructive/15 px-3 py-2">
              <p className="text-[10px] text-destructive uppercase tracking-wide">
                {isRTL ? 'فشل' : 'Failed'}
              </p>
              <p className="text-lg font-bold tabular-nums text-destructive">{summary.failed}</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-72 px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : !data?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {isRTL ? 'لا توجد إرساليات بعد. اضغط "إرسال الآن"' : 'No submissions yet. Click "Submit Now"'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 py-2">
              {data.map(sub => {
                const style = STATUS_STYLES[sub.status] ?? STATUS_STYLES.pending;
                const StatusIcon = style.icon;
                const provider = PROVIDER_LABELS[sub.provider] ?? { ar: sub.provider, en: sub.provider };
                return (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors border border-transparent hover:border-border/40"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${style.cls}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{isRTL ? provider.ar : provider.en}</span>
                        {sub.http_status !== null && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
                            HTTP {sub.http_status}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          {sub.trigger_source === 'cron' ? (isRTL ? 'تلقائي' : 'auto') : (isRTL ? 'يدوي' : 'manual')}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {sub.message ?? '—'}
                      </p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {new Date(sub.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {sub.url_count !== null && (
                        <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                          {sub.url_count} {isRTL ? 'رابط' : 'URLs'}
                          {sub.duration_ms !== null && ` · ${sub.duration_ms}ms`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};