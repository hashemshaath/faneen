/**
 * BUSINESS-FINISHING-1 Phase D — Shared health badge.
 * Purely presentational; consumes pure helpers from @/modules/health.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  WORK_ORDER_HEALTH_LABELS, WORK_ORDER_HEALTH_TONE,
  CONTRACT_HEALTH_LABELS, CONTRACT_HEALTH_TONE,
  RFQ_HEALTH_LABELS, RFQ_HEALTH_TONE,
  QUOTATION_HEALTH_LABELS, QUOTATION_HEALTH_TONE,
  pickHealthLabel,
  type WorkOrderHealth, type ContractHealth, type RfqHealth, type QuotationHealth,
} from '@/modules/health';

type Kind =
  | { kind: 'work_order'; value: WorkOrderHealth }
  | { kind: 'contract'; value: ContractHealth }
  | { kind: 'rfq'; value: RfqHealth }
  | { kind: 'quotation'; value: QuotationHealth };

export type HealthBadgeProps = Kind & {
  className?: string;
  ariaLabel?: string;
};

export const HealthBadge: React.FC<HealthBadgeProps> = (props) => {
  const { isRTL } = useLanguage();
  const { className, ariaLabel } = props;

  let label = '';
  let tone = '';
  switch (props.kind) {
    case 'work_order':
      label = pickHealthLabel(WORK_ORDER_HEALTH_LABELS[props.value], isRTL);
      tone = WORK_ORDER_HEALTH_TONE[props.value];
      break;
    case 'contract':
      label = pickHealthLabel(CONTRACT_HEALTH_LABELS[props.value], isRTL);
      tone = CONTRACT_HEALTH_TONE[props.value];
      break;
    case 'rfq':
      label = pickHealthLabel(RFQ_HEALTH_LABELS[props.value], isRTL);
      tone = RFQ_HEALTH_TONE[props.value];
      break;
    case 'quotation':
      label = pickHealthLabel(QUOTATION_HEALTH_LABELS[props.value], isRTL);
      tone = QUOTATION_HEALTH_TONE[props.value];
      break;
  }

  return (
    <Badge
      variant="outline"
      aria-label={ariaLabel ?? label}
      className={cn('text-[10px] font-medium', tone, className)}
    >
      {label}
    </Badge>
  );
};

export default HealthBadge;