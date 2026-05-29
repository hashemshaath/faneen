/**
 * ProviderGrowthCard — provider-facing growth summary.
 *
 * Mounted inside DashboardBusinessEdit. Pure presentation over the
 * helpers in `@/modules/growth/providerGrowth`. No DB access, no
 * publishing actions — only score, readiness, visibility, SEO and
 * curated next-best-action links into the Help Center.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp, ShieldCheck, Globe, ArrowRight, BookOpen, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  computeProviderProfileScore,
  computeProviderSeoScore,
  helpLinkForKey,
  type GrowthBusiness,
} from '@/modules/growth/providerGrowth';
import { computePublicVisibility } from '@/components/admin/PublishReadinessPanel';

interface Props {
  business: GrowthBusiness;
}

const levelTone: Record<'weak' | 'good' | 'excellent', string> = {
  weak: 'bg-destructive/10 text-destructive border-destructive/20',
  good: 'bg-warning/10 text-warning border-warning/20',
  excellent: 'bg-success/10 text-success border-success/20',
};

export const ProviderGrowthCard: React.FC<Props> = ({ business }) => {
  const { isRTL } = useLanguage();
  const profile = computeProviderProfileScore(business);
  const seo = computeProviderSeoScore(business);
  const visibility = computePublicVisibility({
    name_ar: business.name_ar ?? null,
    name_en: business.name_en ?? null,
    username: business.username ?? null,
    username_status: business.username_status ?? null,
    logo_url: business.logo_url ?? null,
    sectors: business.sectors ?? null,
    sub_services: business.sub_services ?? null,
    email: business.email ?? null,
    phone: business.phone ?? null,
    approval_status: business.approval_status ?? null,
    is_active: business.is_active ?? null,
    is_demo: business.is_demo ?? null,
  });

  const levelLabel = isRTL
    ? { weak: 'ضعيف', good: 'جيد', excellent: 'ممتاز' }[profile.level]
    : profile.level.charAt(0).toUpperCase() + profile.level.slice(1);

  return (
    <Card data-testid="provider-growth-card" className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-background">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              {isRTL ? 'مركز نمو المزود' : 'Provider Growth'}
            </CardTitle>
            <CardDescription className="mt-1">
              {isRTL
                ? 'ملخّص جاهزية ملفك، ظهورك العام، وجودة SEO — مع الخطوات التالية.'
                : 'Snapshot of profile readiness, public visibility, and SEO — with your next best steps.'}
            </CardDescription>
          </div>
          <Badge variant="outline" className={levelTone[profile.level]}>{levelLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scores row */}
        <div className="grid gap-3 sm:grid-cols-3">
          <ScoreTile
            icon={<TrendingUp className="w-4 h-4" />}
            label={isRTL ? 'اكتمال الملف' : 'Profile score'}
            value={profile.score}
          />
          <ScoreTile
            icon={<Globe className="w-4 h-4" />}
            label={isRTL ? 'الظهور العام' : 'Public visibility'}
            value={visibility.visible ? 100 : visibility.status === 'pending' ? 60 : 20}
            text={visibility.status}
          />
          <ScoreTile
            icon={<ShieldCheck className="w-4 h-4" />}
            label={isRTL ? 'جاهزية SEO' : 'SEO score'}
            value={seo.score}
          />
        </div>

        {/* Next best actions */}
        {profile.nextBestActions.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              {isRTL ? 'الخطوات التالية المقترحة' : 'Suggested next steps'}
            </div>
            <ul className="space-y-1.5">
              {profile.nextBestActions.map((a) => (
                <li key={a.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate" dir="auto">{isRTL ? a.ar : a.en}</span>
                  <Link
                    to={helpLinkForKey(a.helpSlug ?? a.key)}
                    className="inline-flex items-center gap-1 text-primary hover:underline shrink-0"
                  >
                    <BookOpen className="w-3 h-3" />
                    {isRTL ? 'دليل' : 'Guide'}
                    <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SEO recommendations */}
        {(seo.issues.length > 0 || seo.recommendations.length > 0) && (
          <div className="rounded-lg border border-border/60 p-3">
            <div className="mb-2 text-xs font-semibold">
              {isRTL ? 'تحسينات SEO' : 'SEO improvements'}
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {[...seo.issues, ...seo.recommendations].slice(0, 4).map((i) => (
                <li key={i.key} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span className="flex-1" dir="auto">{isRTL ? i.ar : i.en}</span>
                  <Link to={helpLinkForKey(i.helpSlug ?? i.key)} className="text-primary hover:underline shrink-0">
                    {isRTL ? 'تعلم' : 'Learn'}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface ScoreTileProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  text?: string;
}

const ScoreTile: React.FC<ScoreTileProps> = ({ icon, label, value, text }) => {
  const v = Math.max(0, Math.min(100, value));
  const tone = v >= 85 ? 'text-success' : v >= 60 ? 'text-warning' : 'text-destructive';
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tech-content ${tone}`}>{v}<span className="text-xs font-normal opacity-70">/100</span></div>
      {text && <div className="text-[10px] text-muted-foreground mt-0.5">{text}</div>}
      <Progress value={v} className="mt-2 h-1.5" />
    </div>
  );
};

export default ProviderGrowthCard;