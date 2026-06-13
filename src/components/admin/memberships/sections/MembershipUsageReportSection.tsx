/**
 * Presentational usage-report tab (M3A read-only) for AdminMemberships.
 * Pure UI — receives pre-fetched usage rows from the parent.
 */
import React from 'react';
import { pickBi } from '@/components/common/Bilingual';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Activity, Loader2 } from 'lucide-react';

export interface MembershipUsageRow {
  business_id: string;
  business_name_ar: string | null;
  business_name_en: string | null;
  owner_user_id: string;
  tier: string | null;
  metric: string;
  used: number;
  limit_value: number;
  period: string;
  near_cap: boolean;
  over_limit: boolean;
}

export interface MembershipUsageReportSectionProps {
  usageReport: MembershipUsageRow[];
  loadingUsage: boolean;
  usageOnlyFlagged: boolean;
  onToggleUsageFlagged: (value: boolean) => void;
  isRTL: boolean;
}

export const MembershipUsageReportSection: React.FC<MembershipUsageReportSectionProps> = ({
  usageReport, loadingUsage, usageOnlyFlagged, onToggleUsageFlagged, isRTL,
}) => {
  return (
    <div className="space-y-3">
      <Card className="border-info/30 bg-info/5">
        <CardContent className="p-3 text-[11px] text-foreground/80 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
          <span>
            {pickBi(isRTL, 'هذه مؤشرات استخدام فقط. لا يتم فرض الحدود تلقائيًا بعد.', 'Usage indicators only. Limits are not enforced automatically yet.')}
          </span>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Switch checked={usageOnlyFlagged} onCheckedChange={onToggleUsageFlagged} />
          <Label className="text-xs">
            {pickBi(isRTL, 'إظهار المتجاوزين/القريبين من الحد فقط', 'Show only over-limit / near-cap')}
          </Label>
        </div>
        <Badge variant="outline" className="h-7 px-2 text-[10px] gap-1">
          <Activity className="w-3 h-3" />
          {usageReport.length}
        </Badge>
      </div>

      {loadingUsage ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : usageReport.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-xs text-muted-foreground">
            {pickBi(isRTL, 'لا توجد جهات قريبة من الحد أو متجاوزة.', 'No businesses near or over their limits.')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground">
                <th className="text-start p-2 font-semibold">{pickBi(isRTL, 'الجهة', 'Business')}</th>
                <th className="text-start p-2 font-semibold">{pickBi(isRTL, 'الباقة', 'Tier')}</th>
                <th className="text-start p-2 font-semibold">{pickBi(isRTL, 'المؤشر', 'Metric')}</th>
                <th className="text-center p-2 font-semibold">{pickBi(isRTL, 'الاستخدام', 'Used / Limit')}</th>
                <th className="text-start p-2 font-semibold">{pickBi(isRTL, 'الفترة', 'Period')}</th>
                <th className="text-center p-2 font-semibold">{pickBi(isRTL, 'الحالة', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {usageReport.map((r, i) => {
                const limText = r.limit_value === 0 ? pickBi(isRTL, 'غير محدود', '∞') : String(r.limit_value);
                return (
                  <tr key={`${r.business_id}-${r.metric}-${i}`} className="border-t border-border/30 hover:bg-muted/10">
                    <td className="p-2 truncate max-w-[180px]">
                      {isRTL ? r.business_name_ar : (r.business_name_en || r.business_name_ar)}
                    </td>
                    <td className="p-2 capitalize">{r.tier || '—'}</td>
                    <td className="p-2 capitalize">{r.metric}</td>
                    <td className="p-2 text-center tech-content font-bold">
                      {r.used} / {limText}
                    </td>
                    <td className="p-2 text-[10px] text-muted-foreground">{r.period}</td>
                    <td className="p-2 text-center">
                      {r.over_limit ? (
                        <Badge className="text-[9px] bg-destructive/15 text-destructive">
                          {pickBi(isRTL, 'تجاوز الحد', 'Over limit')}
                        </Badge>
                      ) : r.near_cap ? (
                        <Badge className="text-[9px] bg-warning/15 text-warning">
                          {pickBi(isRTL, 'اقترب من الحد', 'Near cap')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px]">OK</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MembershipUsageReportSection;