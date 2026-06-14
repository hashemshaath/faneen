import React from 'react';

export interface HomeSectorsStatsSectionProps {
  isRTL: boolean;
  total: number;
  visible: number;
  hidden: number;
  unsaved: number;
}

/**
 * HomeSectorsStatsSection — KPI strip for Home Sectors admin.
 * Pure presentational. All counts come from the parent page.
 */
export const HomeSectorsStatsSection: React.FC<HomeSectorsStatsSectionProps> = ({
  isRTL,
  total,
  visible,
  hidden,
  unsaved,
}) => {
  const items = [
    { label: isRTL ? 'الإجمالي' : 'Total', value: total },
    { label: isRTL ? 'ظاهر' : 'Visible', value: visible },
    { label: isRTL ? 'مخفي' : 'Hidden', value: hidden },
    { label: isRTL ? 'تغييرات غير محفوظة' : 'Unsaved', value: unsaved },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-border bg-muted/30 p-3"
        >
          <div className="text-[11px] text-muted-foreground">{it.label}</div>
          <div className="text-xl font-bold tabular-nums tech-content">{it.value}</div>
        </div>
      ))}
    </div>
  );
};

export default HomeSectorsStatsSection;