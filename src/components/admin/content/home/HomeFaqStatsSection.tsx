import React from 'react';

export interface HomeFaqStatsSectionProps {
  isRTL: boolean;
  total: number;
  enabled: number;
  hidden: number;
}

/**
 * HomeFaqStatsSection — KPI strip for Home FAQ admin. Pure
 * presentational; counts are computed in the parent page.
 */
export const HomeFaqStatsSection: React.FC<HomeFaqStatsSectionProps> = ({
  isRTL,
  total,
  enabled,
  hidden,
}) => {
  const items = [
    { label: isRTL ? 'الإجمالي' : 'Total', value: total },
    { label: isRTL ? 'مفعّل' : 'Enabled', value: enabled },
    { label: isRTL ? 'مخفي' : 'Hidden', value: hidden },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="text-[11px] text-muted-foreground">{it.label}</div>
          <div className="text-xl font-bold tabular-nums tech-content">{it.value}</div>
        </div>
      ))}
    </div>
  );
};

export default HomeFaqStatsSection;