/**
 * AdminProviderGrowthPanel — growth section embedded inside
 * AdminProviderReview. Surfaces the funnel, directory quality, and
 * curated work queues (drafts, ready-to-publish, username-pending,
 * missing logos/services, low-score profiles). Read-only over the
 * provider list already fetched by the parent; never auto-publishes.
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Users, Globe, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  computeProviderFunnel,
  computeProviderProfileScore,
  computeDirectoryQuality,
  type GrowthBusiness,
  type FunnelStage,
} from '@/modules/growth/providerGrowth';

export interface AdminGrowthProvider extends GrowthBusiness {
  id: string;
  ref_id?: string | null;
}

interface Props {
  providers: AdminGrowthProvider[];
  onSelectProvider?: (id: string) => void;
}

const stageLabel = (s: FunnelStage, isRTL: boolean): string => {
  const map: Record<FunnelStage, { ar: string; en: string }> = {
    registered:         { ar: 'مُسجَّل',          en: 'Registered' },
    onboarding_started: { ar: 'بدأ الإعداد',      en: 'Onboarding started' },
    profile_completed:  { ar: 'الملف مكتمل',      en: 'Profile completed' },
    username_approved:  { ar: 'اسم مستخدم معتمد', en: 'Username approved' },
    published:          { ar: 'منشور',            en: 'Published' },
    active:             { ar: 'نشِط',             en: 'Active' },
    verified:           { ar: 'موثّق',            en: 'Verified' },
  };
  return isRTL ? map[s].ar : map[s].en;
};

export const AdminProviderGrowthPanel: React.FC<Props> = ({ providers, onSelectProvider }) => {
  const { isRTL } = useLanguage();

  const funnel = useMemo(() => computeProviderFunnel(providers), [providers]);
  const quality = useMemo(() => computeDirectoryQuality(providers), [providers]);

  const queues = useMemo(() => {
    const scored = providers.map((p) => ({ p, score: computeProviderProfileScore(p).score }));
    return {
      drafts: providers.filter((p) => (p.approval_status ?? 'draft') === 'draft').slice(0, 6),
      readyToPublish: providers.filter((p) => {
        if (p.approval_status === 'published') return false;
        const s = computeProviderProfileScore(p);
        return s.missingRequired.length === 0;
      }).slice(0, 6),
      usernamePending: providers.filter((p) => p.username && p.username_status !== 'approved').slice(0, 6),
      missingLogos: providers.filter((p) => !p.logo_url).slice(0, 6),
      missingServices: providers.filter((p) => (p.sub_services?.length ?? 0) === 0).slice(0, 6),
      lowScore: scored.filter((x) => x.score < 50).map((x) => x.p).slice(0, 6),
    };
  }, [providers]);

  return (
    <Card data-testid="admin-provider-growth-panel" className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-background">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          {isRTL ? 'مركز نمو المزودين' : 'Provider Growth Center'}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? 'قياس قمع التحويل، جودة الدليل، وقوائم عمل لتسريع النشر — بدون نشر تلقائي.'
            : 'Funnel, directory quality, and curated work queues — no auto-publish.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI strip */}
        <div className="grid gap-3 sm:grid-cols-4">
          <Kpi icon={<Users className="w-3.5 h-3.5" />} label={isRTL ? 'المزودون' : 'Providers'} value={quality.totalProviders} />
          <Kpi icon={<Globe className="w-3.5 h-3.5" />} label={isRTL ? 'منشورون' : 'Published'} value={quality.publishedProviders} />
          <Kpi icon={<ShieldCheck className="w-3.5 h-3.5" />} label={isRTL ? 'موثَّقون' : 'Verified'} value={quality.verifiedProviders} />
          <Kpi icon={<TrendingUp className="w-3.5 h-3.5" />} label={isRTL ? 'جودة الدليل' : 'Directory quality'} value={quality.readinessScore} suffix="/100" />
        </div>

        {/* Funnel */}
        <div className="rounded-lg border border-border/60 bg-background p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span>{isRTL ? 'قمع التحويل' : 'Conversion funnel'}</span>
            {funnel.largestDropOffStage && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                <AlertTriangle className="w-3 h-3 me-1" />
                {isRTL ? 'أكبر تسرّب' : 'Largest drop'}: {stageLabel(funnel.largestDropOffStage, isRTL)}
              </Badge>
            )}
          </div>
          <ul className="space-y-1.5">
            {funnel.stages.map((s, i) => (
              <li key={s.stage} className="grid grid-cols-[1fr_60px_80px] items-center gap-2 text-xs">
                <span className="truncate">{stageLabel(s.stage, isRTL)}</span>
                <span className="tech-content text-end font-semibold">{s.count}</span>
                <div className="flex items-center gap-1.5">
                  <Progress value={i === 0 ? 100 : s.conversionFromPrev * 100} className="h-1.5 flex-1" />
                  <span className="tech-content text-[10px] text-muted-foreground w-9 text-end">
                    {i === 0 ? '—' : `${Math.round(s.conversionFromPrev * 100)}%`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Work queues */}
        <div className="grid gap-3 md:grid-cols-2">
          <Queue
            title={isRTL ? 'جاهز للنشر (لا توجد متطلبات ناقصة)' : 'Ready to publish'}
            tone="success"
            items={queues.readyToPublish}
            isRTL={isRTL}
            onSelect={onSelectProvider}
          />
          <Queue
            title={isRTL ? 'مسوّدات' : 'Drafts'}
            tone="muted"
            items={queues.drafts}
            isRTL={isRTL}
            onSelect={onSelectProvider}
          />
          <Queue
            title={isRTL ? 'بانتظار اعتماد اسم المستخدم' : 'Username pending'}
            tone="warning"
            items={queues.usernamePending}
            isRTL={isRTL}
            onSelect={onSelectProvider}
          />
          <Queue
            title={isRTL ? 'بدون شعار' : 'Missing logos'}
            tone="warning"
            items={queues.missingLogos}
            isRTL={isRTL}
            onSelect={onSelectProvider}
          />
          <Queue
            title={isRTL ? 'بدون خدمات' : 'Missing services'}
            tone="warning"
            items={queues.missingServices}
            isRTL={isRTL}
            onSelect={onSelectProvider}
          />
          <Queue
            title={isRTL ? 'جودة منخفضة (<50)' : 'Low score (<50)'}
            tone="destructive"
            items={queues.lowScore}
            isRTL={isRTL}
            onSelect={onSelectProvider}
          />
        </div>

        {quality.suggestedAdminActions.length > 0 && (
          <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-[11px] text-warning">
            <div className="font-semibold mb-1">{isRTL ? 'إجراءات إدارية مقترحة' : 'Suggested admin actions'}</div>
            <ul className="list-disc list-inside space-y-0.5 opacity-90">
              {quality.suggestedAdminActions.map((a) => (
                <li key={a}>{a.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: number; suffix?: string }> = ({ icon, label, value, suffix }) => (
  <div className="rounded-lg border border-border/60 bg-background p-2.5">
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">{icon}{label}</div>
    <div className="mt-0.5 text-xl font-bold tech-content">{value}{suffix && <span className="text-xs font-normal opacity-70">{suffix}</span>}</div>
  </div>
);

interface QueueProps {
  title: string;
  tone: 'success' | 'warning' | 'destructive' | 'muted';
  items: AdminGrowthProvider[];
  isRTL: boolean;
  onSelect?: (id: string) => void;
}

const toneBorder: Record<QueueProps['tone'], string> = {
  success: 'border-success/30',
  warning: 'border-warning/30',
  destructive: 'border-destructive/30',
  muted: 'border-border/60',
};

const Queue: React.FC<QueueProps> = ({ title, tone, items, isRTL, onSelect }) => (
  <div className={`rounded-lg border ${toneBorder[tone]} bg-background p-3`}>
    <div className="flex items-center justify-between mb-1.5">
      <div className="text-xs font-semibold">{title}</div>
      <Badge variant="outline" className="text-[10px] tech-content">{items.length}</Badge>
    </div>
    {items.length === 0 ? (
      <div className="text-[11px] text-muted-foreground">{isRTL ? 'لا يوجد' : 'None'}</div>
    ) : (
      <ul className="space-y-1">
        {items.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate" dir="auto">
              {isRTL ? (p.name_ar ?? p.name_en ?? '—') : (p.name_en ?? p.name_ar ?? '—')}
              {p.username && <span className="opacity-60 ms-1 tech-content">/{p.username}</span>}
            </span>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="inline-flex items-center gap-0.5 text-primary hover:underline shrink-0"
              >
                {isRTL ? 'فتح' : 'Open'}
                <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <Link to="#" className="text-primary hover:underline shrink-0">{isRTL ? 'فتح' : 'Open'}</Link>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default AdminProviderGrowthPanel;