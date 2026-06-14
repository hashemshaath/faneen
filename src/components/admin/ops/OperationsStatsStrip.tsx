import React from 'react';
import { Activity } from 'lucide-react';
import { AdminKpiCard, type AdminKpiTone } from '@/components/admin/AdminKpiCard';

export interface OperationsStatItem {
  key: string;
  label: string;
  value: number | string;
  helper?: string;
  tone?: AdminKpiTone;
  icon?: React.ElementType;
  active?: boolean;
  onClick?: () => void;
}

export interface OperationsStatsStripProps {
  items: OperationsStatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const COL_CLASS: Record<NonNullable<OperationsStatsStripProps['columns']>, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

/**
 * OperationsStatsStrip — props-only KPI grid for ops/notifications/SLA
 * admin surfaces. Never queries DB or aggregates.
 */
export const OperationsStatsStrip: React.FC<OperationsStatsStripProps> = ({
  items, columns = 4, className,
}) => (
  <div className={['grid gap-3', COL_CLASS[columns], className ?? ''].join(' ')}>
    {items.map((it) => (
      <AdminKpiCard
        key={it.key}
        label={it.label}
        value={it.value}
        icon={it.icon ?? Activity}
        tone={it.tone ?? 'muted'}
        hint={it.helper}
        active={it.active}
        onClick={it.onClick}
      />
    ))}
  </div>
);

export default OperationsStatsStrip;