import { Link } from 'react-router-dom';
import { ScrollText, FileClock, MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN UX RECONSOLIDATION PHASE 3 — Logs landing tile.
 *
 * Presentational links to the existing log pages. The pages themselves
 * own all queries, CSV exports, and privacy masking — nothing is moved
 * or re-implemented here.
 */

type LogTile = {
  key: string;
  to: string;
  icon: typeof ScrollText;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
};

const TILES: ReadonlyArray<LogTile> = [
  {
    key: 'activity',
    to: '/admin/activity-log',
    icon: ScrollText,
    title: { ar: 'سجل النشاط', en: 'Activity Log' },
    description: {
      ar: 'سجل النشاط الإداري الكامل مع التصفية والتصدير.',
      en: 'Full admin activity log with filtering and export.',
    },
  },
  {
    key: 'audit',
    to: '/admin/audit-log',
    icon: FileClock,
    title: { ar: 'سجل التدقيق', en: 'Audit Log' },
    description: {
      ar: 'تدقيق التغييرات الحساسة على بيانات النظام.',
      en: 'Audit trail for sensitive system data changes.',
    },
  },
  {
    key: 'contact-audit',
    to: '/admin/contact-messages?tab=audit',
    icon: MessageSquare,
    title: { ar: 'تدقيق التواصل', en: 'Contact Audit Log' },
    description: {
      ar: 'سجل تدقيق رسائل التواصل ومعالجاتها.',
      en: 'Audit log of contact messages and handling actions.',
    },
  },
];

const OperationsLogsLanding = () => {
  const { isRTL } = useLanguage();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.key}
            to={tile.to}
            className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
          >
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="flex flex-1 items-center justify-between gap-2 text-base">
                  <span className="truncate">{isRTL ? tile.title.ar : tile.title.en}</span>
                  <ArrowRight
                    className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {isRTL ? tile.description.ar : tile.description.en}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export default OperationsLogsLanding;