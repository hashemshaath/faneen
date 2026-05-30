import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Award, Sparkles } from 'lucide-react';
import { getLoyaltySummary, listLoyaltyEntries, LEVEL_THRESHOLDS, nextLevel, type LoyaltyLevel } from '@/modules/loyalty/services';

const LEVEL_LABEL: Record<LoyaltyLevel, { ar: string; en: string; color: string }> = {
  bronze: { ar: 'برونزي', en: 'Bronze', color: 'bg-amber-700' },
  silver: { ar: 'فضي', en: 'Silver', color: 'bg-slate-400' },
  gold: { ar: 'ذهبي', en: 'Gold', color: 'bg-yellow-500' },
  platinum: { ar: 'بلاتيني', en: 'Platinum', color: 'bg-cyan-500' },
};

const DashboardLoyalty: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['loyalty-summary', user?.id],
    queryFn: () => getLoyaltySummary(user!.id),
    enabled: !!user?.id,
  });
  const { data: entries } = useQuery({
    queryKey: ['loyalty-entries', user?.id],
    queryFn: () => listLoyaltyEntries(user!.id),
    enabled: !!user?.id,
  });

  const next = summary ? nextLevel(summary.level) : null;
  const nextThreshold = next ? LEVEL_THRESHOLDS[next] : null;
  const progress = summary && nextThreshold
    ? Math.min(100, (summary.total_points / nextThreshold) * 100)
    : 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            {isRTL ? 'نقاط الولاء' : 'Loyalty Points'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? 'اكسب نقاطًا مع كل تفاعل وارتقِ في المستويات' : 'Earn points with every interaction and climb levels'}
          </p>
        </div>

        {isLoading || !summary ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{isRTL ? 'الرصيد الحالي' : 'Current balance'}</div>
                  <div className="text-4xl font-bold tech-content mt-1">{summary.total_points}</div>
                </div>
                <Badge className={`${LEVEL_LABEL[summary.level].color} text-white border-0 px-4 py-2 text-base`}>
                  <Sparkles className="w-4 h-4 me-1" />
                  {isRTL ? LEVEL_LABEL[summary.level].ar : LEVEL_LABEL[summary.level].en}
                </Badge>
              </div>
              {next && nextThreshold && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{isRTL ? 'التقدم إلى' : 'Progress to'} {isRTL ? LEVEL_LABEL[next].ar : LEVEL_LABEL[next].en}</span>
                    <span className="tech-content">{summary.total_points} / {nextThreshold}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-3">{isRTL ? 'سجل النقاط' : 'Points History'}</h2>
          {!entries || entries.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              {isRTL ? 'لا توجد حركات بعد' : 'No entries yet'}
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {entries.map(e => (
                <Card key={e.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{e.reason}</div>
                      <div className="text-xs text-muted-foreground tech-content">
                        {new Date(e.created_at).toLocaleString(isRTL ? 'ar' : 'en')}
                      </div>
                    </div>
                    <div className={`font-bold tech-content ${e.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {e.points >= 0 ? '+' : ''}{e.points}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardLoyalty;