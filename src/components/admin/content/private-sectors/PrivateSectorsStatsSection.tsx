import React from 'react';
import { Layers, Clock, CheckCircle2, XCircle, Pause, FileEdit } from 'lucide-react';
import { ContentStatsStrip, type ContentStatItem } from '@/components/admin/content';

export interface PrivateSectorsStatsSectionProps {
  totals: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
    draft: number;
  };
  labels: {
    all: string;
    pending: string;
    approved: string;
    rejected: string;
    suspended: string;
    draft: string;
  };
  activeKey?: string;
  onSelect?: (key: 'all' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'draft') => void;
}

export const PrivateSectorsStatsSection: React.FC<PrivateSectorsStatsSectionProps> = ({
  totals, labels, activeKey, onSelect,
}) => {
  const items: ContentStatItem[] = [
    { key: 'pending',   label: labels.pending,   value: totals.pending,   tone: 'warning',     icon: Clock,        active: activeKey === 'pending',   onClick: onSelect ? () => onSelect('pending')   : undefined },
    { key: 'approved',  label: labels.approved,  value: totals.approved,  tone: 'success',     icon: CheckCircle2, active: activeKey === 'approved',  onClick: onSelect ? () => onSelect('approved')  : undefined },
    { key: 'rejected',  label: labels.rejected,  value: totals.rejected,  tone: 'destructive', icon: XCircle,      active: activeKey === 'rejected',  onClick: onSelect ? () => onSelect('rejected')  : undefined },
    { key: 'suspended', label: labels.suspended, value: totals.suspended, tone: 'muted',       icon: Pause,        active: activeKey === 'suspended', onClick: onSelect ? () => onSelect('suspended') : undefined },
    { key: 'draft',     label: labels.draft,     value: totals.draft,     tone: 'muted',       icon: FileEdit,     active: activeKey === 'draft',     onClick: onSelect ? () => onSelect('draft')     : undefined },
    { key: 'all',       label: labels.all,       value: totals.all,       tone: 'info',        icon: Layers,       active: activeKey === 'all',       onClick: onSelect ? () => onSelect('all')       : undefined },
  ];
  return <ContentStatsStrip items={items} columns={6} />;
};

export default PrivateSectorsStatsSection;