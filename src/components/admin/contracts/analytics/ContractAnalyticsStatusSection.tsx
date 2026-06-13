/**
 * by_status breakdown for admin contract analytics.
 *
 * Pure UI — uses `ContractLifecycleBadge` (which sources labels from
 * `getContractStatusMeta`) so we never redefine contract status labels here.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { ContractLifecycleBadge } from '../shared';
import type { ContractStatus } from '@/lib/contract-statuses';
import { CONTRACT_STATUS_KEYS } from '@/lib/contract-statuses';
import {
  fmtAnalyticsNumber,
  pickAnalyticsLabel,
  type AdminAnalyticsSummary,
  type AnalyticsLanguage,
} from './types';

export interface ContractAnalyticsStatusSectionProps {
  summary: AdminAnalyticsSummary;
  language: AnalyticsLanguage;
  locale: string;
  isRTL?: boolean;
}

export const ContractAnalyticsStatusSection: React.FC<ContractAnalyticsStatusSectionProps> = ({
  summary,
  language,
  locale,
  isRTL = true,
}) => {
  const t = (ar: string, en: string) => pickAnalyticsLabel(language, ar, en);
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
          {t('توزيع الحالات', 'By status')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CONTRACT_STATUS_KEYS.map((status: ContractStatus) => (
            <div
              key={status}
              className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
            >
              <ContractLifecycleBadge status={status} isRTL={isRTL} size="xs" />
              <span className="text-2xl font-semibold tabular-nums tech-content">
                {fmtAnalyticsNumber(summary.by_status[status] ?? 0, locale)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractAnalyticsStatusSection;