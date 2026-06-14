import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { runSiteAudit } from '@/modules/seo';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Gauge, RefreshCw, Loader2 } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  SeoHubPageShell,
  SiteAuditSummarySection,
  SiteAuditPerfSection,
  SiteAuditSeoHealthSection,
  SiteAuditIssuesSection,
  type PerfRunRow,
  type PerfTrendPoint,
  type WebVitalSummaryRow,
  type SeoLatestSummary,
} from '@/components/admin/content/seo';

const AdminSiteAudit = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [windowHours, setWindowHours] = useState<24 | 72 | 168>(24);

  const vitalsQuery = useQuery({
    queryKey: ['web-vitals-summary', windowHours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_web_vitals_summary', { _hours: windowHours });
      if (error) throw error;
      return (data ?? []) as WebVitalSummaryRow[];
    },
    staleTime: 60_000,
  });

  const perfQuery = useQuery({
    queryKey: ['perf-audit-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perf_audit_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const grouped = new Map<string, typeof data>();
      for (const row of data ?? []) {
        const key = `${row.url}::${row.strategy}`;
        const arr = grouped.get(key) ?? [];
        if (arr.length < 2) arr.push(row);
        grouped.set(key, arr);
      }
      return Array.from(grouped.values()).map(([latest, previous]) => ({
        ...latest,
        previous: previous ?? null,
      }));
    },
    staleTime: 60_000,
  });

  const perfHistoryQuery = useQuery({
    queryKey: ['perf-audit-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perf_audit_runs')
        .select('created_at, performance_score, url')
        .gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())
        .order('created_at', { ascending: true });
      if (error) throw error;
      const buckets = new Map<string, { sum: number; n: number }>();
      for (const r of data ?? []) {
        if (r.performance_score == null) continue;
        const day = new Date(r.created_at).toISOString().slice(0, 10);
        const b = buckets.get(day) ?? { sum: 0, n: 0 };
        b.sum += r.performance_score;
        b.n += 1;
        buckets.set(day, b);
      }
      return Array.from(buckets.entries())
        .map(([day, b]): PerfTrendPoint => ({ day, score: Math.round(b.sum / b.n) }))
        .sort((a, b) => a.day.localeCompare(b.day));
    },
    staleTime: 60_000,
  });

  const seoQuery = useQuery({
    queryKey: ['seo-audit-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_audit_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await runSiteAudit();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم تشغيل التدقيق بنجاح' : 'Audit completed successfully');
      queryClient.invalidateQueries({ queryKey: ['perf-audit-latest'] });
      queryClient.invalidateQueries({ queryKey: ['perf-audit-history'] });
      queryClient.invalidateQueries({ queryKey: ['seo-audit-latest'] });
    },
    onError: (e: Error) => {
      toast.error((isRTL ? 'فشل التدقيق: ' : 'Audit failed: ') + e.message);
    },
  });

  const seoLatest = seoQuery.data as SeoLatestSummary | null;
  const pageResults = useMemo(() => {
    const arr = (seoLatest?.page_results as unknown);
    return Array.isArray(arr) ? arr as Array<Record<string, unknown>> : [];
  }, [seoLatest]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <SeoHubPageShell
          className="space-y-4"
          header={
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
                  <Gauge className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                  {isRTL ? 'تدقيق الأداء و SEO' : 'Performance & SEO Audit'}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRTL
                    ? 'بيانات حقيقية من الزوار + فحص PageSpeed + سلامة Sitemap و Robots'
                    : 'Real-user metrics + PageSpeed lab data + Sitemap/Robots health'}
                </p>
              </div>
              <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="gap-2">
                {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isRTL ? 'تشغيل تدقيق الآن' : 'Run audit now'}
              </Button>
            </div>
          }
          statsSlot={
            <SiteAuditSummarySection
              isLoading={vitalsQuery.isLoading}
              rows={vitalsQuery.data ?? []}
              windowHours={windowHours}
              onWindowChange={setWindowHours}
              isRTL={isRTL}
            />
          }
          contentSlot={
            <div className="space-y-4">
              <SiteAuditPerfSection
                isLoading={perfQuery.isLoading}
                rows={(perfQuery.data ?? []) as unknown as PerfRunRow[]}
                trendLoading={perfHistoryQuery.isLoading}
                trend={perfHistoryQuery.data ?? []}
                isRTL={isRTL}
              />
              <SiteAuditSeoHealthSection
                isLoading={seoQuery.isLoading}
                seoLatest={seoLatest}
                pageResults={pageResults}
                isRTL={isRTL}
              />
              <SiteAuditIssuesSection
                pageResults={pageResults}
                isRTL={isRTL}
                hasData={!!seoLatest}
              />
            </div>
          }
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminSiteAudit;
