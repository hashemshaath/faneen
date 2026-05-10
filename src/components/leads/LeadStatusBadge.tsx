import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';

export type LeadStatus =
  | 'new' | 'viewed' | 'needs_info' | 'accepted' | 'rejected' | 'closed' | 'cancelled' | 'quoted'
  | 'contacted' | 'qualified' | 'spam';

const map: Record<LeadStatus, { ar: string; en: string; cls: string }> = {
  new:         { ar: 'جديد',         en: 'New',         cls: 'bg-info/10 text-info border-info/30' },
  viewed:      { ar: 'تمت المشاهدة',  en: 'Viewed',      cls: 'bg-muted text-foreground border-border' },
  needs_info:  { ar: 'بحاجة معلومات', en: 'Needs info',  cls: 'bg-warning/10 text-warning border-warning/30' },
  accepted:    { ar: 'مقبول',         en: 'Accepted',    cls: 'bg-success/10 text-success border-success/30' },
  rejected:    { ar: 'مرفوض',         en: 'Rejected',    cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  closed:      { ar: 'مغلق',          en: 'Closed',      cls: 'bg-muted text-muted-foreground border-border' },
  cancelled:   { ar: 'ملغي',          en: 'Cancelled',   cls: 'bg-muted text-muted-foreground border-border' },
  quoted:      { ar: 'تم إرسال عرض سعر', en: 'Quote sent', cls: 'bg-primary/10 text-primary border-primary/30' },
  contacted:   { ar: 'تم التواصل',    en: 'Contacted',   cls: 'bg-info/10 text-info border-info/30' },
  qualified:   { ar: 'مؤهَّل',        en: 'Qualified',   cls: 'bg-secondary/10 text-secondary border-secondary/30' },
  spam:        { ar: 'سبام',          en: 'Spam',        cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export const LeadStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const { isRTL } = useLanguage();
  const cfg = map[status as LeadStatus] ?? { ar: status, en: status, cls: 'bg-muted text-foreground border-border' };
  return <Badge variant="outline" className={cfg.cls}>{isRTL ? cfg.ar : cfg.en}</Badge>;
};

export default LeadStatusBadge;