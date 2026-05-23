import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listPublicProvidersForAnalytics } from '@/modules/businesses';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BarChart3, Eye, MousePointerClick, ExternalLink, TrendingUp, Users, Clock,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type Period = '24h' | '7d' | '30d' | 'all';

const periodToInterval: Record<Period, string> = {
  '24h': "now() - interval '24 hours'",
  '7d': "now() - interval '7 days'",
  '30d': "now() - interval '30 days'",
  all: "'1970-01-01'::timestamptz",
};

const AdminProviderAnalytics = () => {
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'تحليلات المزودين' : 'Provider Analytics', noindex: true });
  useNoIndex();
  const [period, setPeriod] = useState<Period>('7d');

  // Summary stats
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-provider-interactions-summary', period],
    queryFn: async () => {
      const since = period === 'all' ? undefined : { '24h': 1, '7d': 7, '30d': 30 }[period];
      let query = supabase.from('provider_interactions').select('event_type', { count: 'exact', head: false });
      if (since) {
        const d = new Date();
        d.setDate(d.getDate() - since);
        query = query.gte('created_at', d.toISOString());
      }
      const { data, count } = await query;
      const events = data as any[] || [];
      return {
        total: count || 0,
        section_views: events.filter(e => e.event_type === 'section_view').length,
        card_clicks: events.filter(e => e.event_type === 'card_click').length,
        view_all: events.filter(e => e.event_type === 'view_all_click').length,
      };
    },
  });

  // Top clicked providers
  const { data: topProviders = [], isLoading: topLoading } = useQuery({
    queryKey: ['admin-top-clicked-providers', period],
    queryFn: async () => {
      let query = supabase
        .from('provider_interactions')
        .select('provider_id, provider_username')
        .eq('event_type', 'card_click')
        .not('provider_id', 'is', null);
      if (period !== 'all') {
        const d = new Date();
        d.setDate(d.getDate() - ({ '24h': 1, '7d': 7, '30d': 30 }[period] || 7));
        query = query.gte('created_at', d.toISOString());
      }
      const { data } = await query;
      if (!data || data.length === 0) return [];

      // Aggregate clicks per provider
      const map = new Map<string, { id: string; username: string; clicks: number }>();
      for (const row of data as any[]) {
        const key = row.provider_id;
        const existing = map.get(key);
        if (existing) {
          existing.clicks++;
        } else {
          map.set(key, { id: key, username: row.provider_username || '', clicks: 1 });
        }
      }
      const sorted = Array.from(map.values()).sort((a, b) => b.clicks - a.clicks).slice(0, 20);

      // Fetch business details for top providers
      const ids = sorted.map(p => p.id);
      const businesses = await listPublicProvidersForAnalytics<{ id: string }>(ids);
      const bizMap = new Map(businesses.map((b: any) => [b.id, b]));

      return sorted.map(p => ({
        ...p,
        business: bizMap.get(p.id) || null,
      }));
    },
  });

  const statCards = useMemo(() => [
    {
      icon: Eye,
      label: isRTL ? 'مشاهدات القسم' : 'Section Views',
      value: summary?.section_views ?? 0,
      color: 'text-info bg-info/10',
    },
    {
      icon: MousePointerClick,
      label: isRTL ? 'نقرات البطاقات' : 'Card Clicks',
      value: summary?.card_clicks ?? 0,
      color: 'text-accent bg-accent/10',
    },
    {
      icon: ExternalLink,
      label: isRTL ? 'نقرات عرض الكل' : 'View All Clicks',
      value: summary?.view_all ?? 0,
      color: 'text-success bg-success/10',
    },
    {
      icon: TrendingUp,
      label: isRTL ? 'معدل التحويل' : 'CTR',
      value: summary && summary.section_views > 0
        ? `${((summary.card_clicks / summary.section_views) * 100).toFixed(1)}%`
        : '0%',
      color: 'text-warning bg-warning/10',
    },
  ], [summary, isRTL]);

  const periods: { key: Period; label: string; labelAr: string }[] = [
    { key: '24h', label: '24h', labelAr: '24 ساعة' },
    { key: '7d', label: '7 days', labelAr: '7 أيام' },
    { key: '30d', label: '30 days', labelAr: '30 يوم' },
    { key: 'all', label: 'All time', labelAr: 'الكل' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
              <BarChart3 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground">
                {isRTL ? 'تحليلات المزودين' : 'Provider Analytics'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'تتبع تفاعلات الزوار مع قسم مزودي الخدمة' : 'Track visitor interactions with the providers section'}
              </p>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 dark:bg-muted/15 border border-border/15">
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p.key
                    ? 'bg-card shadow-sm text-accent ring-1 ring-accent/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isRTL ? p.labelAr : p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/30 dark:border-border/15 bg-card dark:bg-card/60 p-4 sm:p-5 space-y-3"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <div>
                {summaryLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="font-heading font-bold text-xl sm:text-2xl text-foreground tabular-nums">
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Top Providers Table */}
        <div className="rounded-2xl border border-border/30 dark:border-border/15 bg-card dark:bg-card/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/15 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <h2 className="font-heading font-bold text-sm sm:text-base">
              {isRTL ? 'أكثر المزودين نقراً' : 'Most Clicked Providers'}
            </h2>
          </div>

          {topLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          ) : topProviders.length === 0 ? (
            <div className="p-8 text-center">
              <MousePointerClick className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'لا توجد بيانات نقرات بعد' : 'No click data yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {topProviders.map((provider, idx) => {
                const biz = provider.business as any;
                const name = biz
                  ? (isRTL ? biz.name_ar : biz.name_en || biz.name_ar)
                  : provider.username || '—';
                const maxClicks = topProviders[0]?.clicks || 1;
                const pct = (provider.clicks / maxClicks) * 100;

                return (
                  <div key={provider.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    {/* Rank */}
                    <span className="w-6 text-center font-bold text-xs text-muted-foreground tabular-nums">
                      {idx + 1}
                    </span>

                    {/* Avatar */}
                    <Avatar className="w-10 h-10 rounded-xl ring-1 ring-border/10">
                      <AvatarImage src={biz?.logo_url} className="object-cover" />
                      <AvatarFallback className="rounded-xl bg-accent/10 text-accent font-bold text-sm">
                        {name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-heading font-bold text-sm truncate">{name}</p>
                        {biz?.is_verified && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-accent/10 text-accent border-accent/20">
                            {isRTL ? 'موثق' : 'Verified'}
                          </Badge>
                        )}
                        {biz?.membership_tier && biz.membership_tier !== 'free' && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-accent/10 text-accent border-accent/20">
                            {biz.membership_tier}
                          </Badge>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1.5 h-1.5 w-full max-w-[200px] rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Click count */}
                    <div className="text-end">
                      <p className="font-heading font-bold text-sm tabular-nums">{provider.clicks}</p>
                      <p className="text-[10px] text-muted-foreground">{isRTL ? 'نقرة' : 'clicks'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminProviderAnalytics;