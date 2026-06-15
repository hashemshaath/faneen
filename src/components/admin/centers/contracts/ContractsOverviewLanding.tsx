import { Link } from 'react-router-dom';
import { FileText, Files, ShieldCheck, FileBarChart, ClipboardList, BarChart3, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN UX RECONSOLIDATION PHASE 8 — Contracts overview tile.
 * Presentational links only. No queries, no mutations, no service calls.
 */

type Tile = {
  key: string;
  to: string;
  icon: typeof FileText;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
};

const TILES: ReadonlyArray<Tile> = [
  {
    key: 'contracts',
    to: '/admin/contracts?tab=contracts',
    icon: FileText,
    title: { ar: 'العقود', en: 'Contracts' },
    description: { ar: 'قائمة العقود وحالاتها.', en: 'Contracts list and statuses.' },
  },
  {
    key: 'templates',
    to: '/admin/contracts?tab=templates',
    icon: Files,
    title: { ar: 'القوالب', en: 'Templates' },
    description: { ar: 'إدارة قوالب العقود.', en: 'Manage contract templates.' },
  },
  {
    key: 'approvals',
    to: '/admin/contracts?tab=approvals',
    icon: ShieldCheck,
    title: { ar: 'الموافقات', en: 'Approvals' },
    description: { ar: 'الموافقات المرتبطة بسير العقد.', en: 'Approvals tied to contract workflow.' },
  },
  {
    key: 'exports',
    to: '/admin/contracts?tab=exports',
    icon: FileBarChart,
    title: { ar: 'تصدير PDF', en: 'PDF Exports' },
    description: { ar: 'سجل تصدير PDF للعقود.', en: 'Contract PDF export audit.' },
  },
  {
    key: 'audit',
    to: '/admin/contracts?tab=audit',
    icon: ClipboardList,
    title: { ar: 'التدقيق', en: 'Audit' },
    description: { ar: 'سجل تدقيق العقود.', en: 'Contract audit trail.' },
  },
  {
    key: 'analytics',
    to: '/admin/contracts?tab=analytics',
    icon: BarChart3,
    title: { ar: 'التحليلات', en: 'Analytics' },
    description: { ar: 'مؤشرات العقود والأداء.', en: 'Contract KPIs and performance.' },
  },
];

const ContractsOverviewLanding = () => {
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

export default ContractsOverviewLanding;