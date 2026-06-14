import React from 'react';
import { Activity } from 'lucide-react';
import { AdminKpiCard, type AdminKpiTone } from '@/components/admin/AdminKpiCard';

/**
 * ContentStatsStrip — props-driven KPI grid for content/directory
 * admin pages. Items are pre-computed by the caller; this component
 * never queries DB and never aggregates.
 */
export interface ContentStatItem {
  key: string;
  label: string;
  value: number | string;
  helper?: string;
  tone?: AdminKpiTone;
  icon?: React.ElementType;
  active?: boolean;
  onClick?: () => void;
}

export interface ContentStatsStripProps {
  items: ContentStatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const COL_CLASS: Record<NonNullable<ContentStatsStripProps['columns']>, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

export const ContentStatsStrip: React.FC<ContentStatsStripProps> = ({
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

export default ContentStatsStrip;