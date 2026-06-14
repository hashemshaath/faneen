import React from 'react';
import { Layers, Eye, EyeOff, Building2 } from 'lucide-react';
import { ContentStatsStrip, type ContentStatItem } from '@/components/admin/content/ContentStatsStrip';
import { useBi } from '@/components/common/Bilingual';

/**
 * PartnerShowcaseStatsSection — read-only KPI strip for the Partner
 * Showcase admin page. Computes nothing from DB; receives a pre-counted
 * items array from the parent page.
 */
export interface PartnerShowcaseStatsSectionProps {
  items: ReadonlyArray<{ is_active: boolean; source_type: 'business' | 'external' }>;
  className?: string;
}

export const PartnerShowcaseStatsSection: React.FC<PartnerShowcaseStatsSectionProps> = ({
  items,
  className,
}) => {
  const bi = useBi();
  const total = items.length;
  const active = items.filter((i) => i.is_active).length;
  const inactive = total - active;
  const systemLinked = items.filter((i) => i.source_type === 'business').length;

  const stats: ContentStatItem[] = [
    { key: 'total', label: bi('الإجمالي', 'Total'), value: total, icon: Layers, tone: 'muted' },
    { key: 'active', label: bi('ظاهرة', 'Visible'), value: active, icon: Eye, tone: 'success' },
    { key: 'inactive', label: bi('مخفية', 'Hidden'), value: inactive, icon: EyeOff, tone: 'muted' },
    { key: 'system', label: bi('من النظام', 'System-linked'), value: systemLinked, icon: Building2, tone: 'info' },
  ];

  return <ContentStatsStrip items={stats} columns={4} className={className} />;
};

export default PartnerShowcaseStatsSection;