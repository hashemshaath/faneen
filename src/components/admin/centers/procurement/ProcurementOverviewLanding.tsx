import { Link } from 'react-router-dom';
import {
  Inbox, GitBranch, Users, Wrench, Clock, BarChart3, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN UX RECONSOLIDATION PHASE 7 — Procurement overview tile.
 *
 * Presentational links only. No queries, no mutations, no service
 * calls. Each tile points to an existing tab inside the Procurement
 * Center or to a legacy route that already owns its own logic.
 */

type Tile = {
  key: string;
  to: string;
  icon: typeof Inbox;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
};

const TILES: ReadonlyArray<Tile> = [
  {
    key: 'requests',
    to: '/admin/procurement?tab=requests',
    icon: Inbox,
    title: { ar: 'طلبات العروض', en: 'Quote Requests' },
    description: {
      ar: 'جميع طلبات عروض الأسعار الواردة وحالاتها.',
      en: 'All incoming quote requests and their statuses.',
    },
  },
  {
    key: 'matching',
    to: '/admin/procurement?tab=matching',
    icon: GitBranch,
    title: { ar: 'المطابقة', en: 'Matching' },
    description: {
      ar: 'مطابقة الطلبات مع المزودين المؤهلين.',
      en: 'Match incoming requests to qualified providers.',
    },
  },
  {
    key: 'leads',
    to: '/admin/procurement?tab=leads',
    icon: Users,
    title: { ar: 'الفرص', en: 'Leads' },
    description: {
      ar: 'الفرص المكشوفة للمزودين وأحداث التواصل.',
      en: 'Provider leads, reveal events, and contact activity.',
    },
  },
  {
    key: 'operations',
    to: '/admin/procurement?tab=operations',
    icon: Wrench,
    title: { ar: 'العمليات', en: 'Operations' },
    description: {
      ar: 'تشغيل ومتابعة طلبات العروض.',
      en: 'Day-to-day quote operations and progress.',
    },
  },
  {
    key: 'follow-up',
    to: '/admin/procurement?tab=follow-up',
    icon: Clock,
    title: { ar: 'المتابعة و SLA', en: 'Follow-up & SLA' },
    description: {
      ar: 'حالة المتابعة ومستوى الخدمة على الطلبات.',
      en: 'Follow-up status and SLA tracking on requests.',
    },
  },
  {
    key: 'reports',
    to: '/admin/procurement?tab=reports',
    icon: BarChart3,
    title: { ar: 'التقارير', en: 'Reports' },
    description: {
      ar: 'تقارير وتصدير CSV لعمليات المشتريات.',
      en: 'Reports and CSV exports for procurement operations.',
    },
  },
];

const ProcurementOverviewLanding = () => {
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
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

export default ProcurementOverviewLanding;