import React from 'react';
import { Lightbulb, CheckCircle2, AlertTriangle, Wrench, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export type SitemapRecommendationSeverity = 'critical' | 'warning' | 'info';

export interface SitemapRecommendation {
  id: string;
  severity: SitemapRecommendationSeverity;
  title: string;
  detail: string;
  affected?: string[];
  actionLabel?: string;
  action?: () => void;
  actionPending?: boolean;
}

/**
 * SitemapRecommendationsSection — presentational. Receives already-built
 * recommendations from the page; never inspects sitemap output, never
 * triggers edge functions directly (parent owns `action` callbacks).
 */
export interface SitemapRecommendationsSectionProps {
  isLoading: boolean;
  recommendations: ReadonlyArray<SitemapRecommendation>;
  isAr: boolean;
}

export const SitemapRecommendationsSection: React.FC<SitemapRecommendationsSectionProps> = ({
  isLoading, recommendations, isAr,
}) => {
  const criticalCount = recommendations.filter((r) => r.severity === 'critical').length;
  const warningCount = recommendations.filter((r) => r.severity === 'warning').length;

  return (
    <Card className={criticalCount ? 'border-destructive/40' : warningCount ? 'border-warning/40' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Lightbulb className="h-5 w-5 text-warning" />
          {isAr ? 'التوصيات والإصلاح التلقائي' : 'Recommendations & auto-fix'}
          {criticalCount > 0 && (
            <Badge variant="destructive" className="tech-content">
              {criticalCount} {isAr ? 'حرج' : 'critical'}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="tech-content bg-warning/15 text-warning border-warning/30">
              {warningCount} {isAr ? 'تحذير' : 'warning'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {!isLoading && recommendations.length === 0 && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground py-6 justify-center">
            <CheckCircle2 className="h-5 w-5 text-success" />
            {isAr ? 'لا توجد توصيات — كل النقاط تعمل بشكل مثالي.' : 'No recommendations — all endpoints are perfect.'}
          </div>
        )}
        {!isLoading && recommendations.map((rec) => {
          const sevTone =
            rec.severity === 'critical'
              ? 'border-destructive/40 bg-destructive/5'
              : rec.severity === 'warning'
              ? 'border-warning/40 bg-warning/5'
              : 'border-primary/30 bg-primary/5';
          const SevIcon =
            rec.severity === 'critical' ? AlertTriangle : rec.severity === 'warning' ? Wrench : Zap;
          const sevColor =
            rec.severity === 'critical' ? 'text-destructive' : rec.severity === 'warning' ? 'text-warning' : 'text-primary';
          return (
            <div key={rec.id} className={`border rounded-2xl p-4 ${sevTone}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <SevIcon className={`h-5 w-5 mt-0.5 shrink-0 ${sevColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{rec.title}</div>
                    <p className="text-sm text-muted-foreground mt-1">{rec.detail}</p>
                    {rec.affected && rec.affected.length > 0 && (
                      <ul className="mt-2 text-xs text-muted-foreground tech-content space-y-0.5 list-disc ms-5">
                        {rec.affected.slice(0, 5).map((a) => (
                          <li key={a} className="break-all">{a}</li>
                        ))}
                        {rec.affected.length > 5 && (
                          <li className="opacity-70">+{rec.affected.length - 5} {isAr ? 'أخرى' : 'more'}</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
                {rec.action && rec.actionLabel && (
                  <Button
                    size="sm"
                    variant={rec.severity === 'critical' ? 'default' : 'outline'}
                    onClick={rec.action}
                    disabled={rec.actionPending}
                    className="gap-2 shrink-0"
                  >
                    <Wrench className={`h-3.5 w-3.5 ${rec.actionPending ? 'animate-pulse' : ''}`} />
                    {rec.actionLabel}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SitemapRecommendationsSection;