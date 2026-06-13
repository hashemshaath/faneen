/**
 * Monthly trend bar list for admin contract analytics.
 * Pure UI — no Supabase, no queries.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  fmtAnalyticsNumber,
  pickAnalyticsLabel,
  type AdminAnalyticsMonthlyTrendItem,
  type AnalyticsLanguage,
} from './types';

export interface ContractAnalyticsTrendSectionProps {
  items: AdminAnalyticsMonthlyTrendItem[];
  language: AnalyticsLanguage;
  locale: string;
}

export const ContractAnalyticsTrendSection: React.FC<ContractAnalyticsTrendSectionProps> = ({
  items,
  language,
  locale,
}) => {
  const t = (ar: string, en: string) => pickAnalyticsLabel(language, ar, en);
  const max = Math.max(1, ...items.map((m) => Math.max(m.created, m.completed)));
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
          {t('الاتجاه الشهري', 'Monthly trend')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li key={m.month} className="grid grid-cols-12 items-center gap-2 text-xs">
                <span className="col-span-2 tech-content text-muted-foreground">{m.month}</span>
                <div className="col-span-8 space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 rounded-full bg-primary/70"
                      style={{ width: `${(m.created / max) * 100}%` }}
                      aria-hidden
                    />
                    <span className="tech-content">
                      {fmtAnalyticsNumber(m.created, locale)} {t('منشأ', 'created')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 rounded-full bg-emerald-500/70"
                      style={{ width: `${(m.completed / max) * 100}%` }}
                      aria-hidden
                    />
                    <span className="tech-content">
                      {fmtAnalyticsNumber(m.completed, locale)} {t('مكتمل', 'completed')}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractAnalyticsTrendSection;