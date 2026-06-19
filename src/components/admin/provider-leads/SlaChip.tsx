import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { SlaStatus } from './providerLeadHelpers';

const TONE: Record<SlaStatus['tone'], string> = {
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
  muted: 'bg-muted text-muted-foreground border-border',
};

export const SlaChip: React.FC<{ sla: SlaStatus; size?: 'sm' | 'md' }> = ({ sla, size = 'sm' }) => {
  const { isRTL } = useLanguage();
  const Icon = sla.overdue ? AlertTriangle : Clock;
  const cls = size === 'md' ? 'text-[11px] px-2 py-0.5' : 'text-[10px] px-1.5 py-0';
  return (
    <Badge variant="outline" className={`${TONE[sla.tone]} ${cls} gap-1 tech-content`}>
      <Icon className="h-3 w-3" aria-hidden />
      {isRTL ? sla.label.ar : sla.label.en}
    </Badge>
  );
};

export default SlaChip;