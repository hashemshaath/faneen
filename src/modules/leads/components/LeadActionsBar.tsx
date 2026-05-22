import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, XCircle, HelpCircle, Archive, Loader2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { LeadStatus } from './LeadStatusBadge';

interface Props {
  status: LeadStatus | string;
  pending?: boolean;
  onAction: (next: LeadStatus) => void;
}

const labels = {
  view:       { ar: 'تمت المشاهدة', en: 'Mark viewed' },
  accept:     { ar: 'قبول',          en: 'Accept' },
  reject:     { ar: 'رفض',           en: 'Reject' },
  needs_info: { ar: 'بحاجة معلومات', en: 'Needs info' },
  close:      { ar: 'إغلاق',         en: 'Close' },
};

export const LeadActionsBar: React.FC<Props> = ({ status, pending, onAction }) => {
  const { isRTL } = useLanguage();
  const t = (k: keyof typeof labels) => (isRTL ? labels[k].ar : labels[k].en);
  const Spin = () => <Loader2 className="animate-spin" />;

  const can = (next: LeadStatus): boolean => {
    const matrix: Record<string, LeadStatus[]> = {
      new:        ['viewed','accepted','rejected','needs_info','closed'],
      viewed:     ['accepted','rejected','needs_info','closed'],
      needs_info: ['accepted','rejected','closed','viewed'],
      accepted:   ['closed'],
      rejected:   ['closed'],
      closed:     [],
    };
    return (matrix[status] ?? ['viewed','accepted','rejected','needs_info','closed']).includes(next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {can('viewed') && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => onAction('viewed')} aria-label={t('view')}>
          {pending ? <Spin /> : <Eye />}<span>{t('view')}</span>
        </Button>
      )}
      {can('accepted') && (
        <Button size="sm" variant="default" disabled={pending} onClick={() => onAction('accepted')} aria-label={t('accept')}>
          {pending ? <Spin /> : <CheckCircle2 />}<span>{t('accept')}</span>
        </Button>
      )}
      {can('needs_info') && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => onAction('needs_info')} aria-label={t('needs_info')}>
          {pending ? <Spin /> : <HelpCircle />}<span>{t('needs_info')}</span>
        </Button>
      )}
      {can('rejected') && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => onAction('rejected')} aria-label={t('reject')} className="text-destructive hover:text-destructive">
          {pending ? <Spin /> : <XCircle />}<span>{t('reject')}</span>
        </Button>
      )}
      {can('closed') && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => onAction('closed')} aria-label={t('close')}>
          {pending ? <Spin /> : <Archive />}<span>{t('close')}</span>
        </Button>
      )}
    </div>
  );
};

export default LeadActionsBar;