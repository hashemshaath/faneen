import { Link } from 'react-router-dom';
import { Crown, CreditCard, Wallet, Layers, Clock, BarChart3, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN UX RECONSOLIDATION PHASE 9 — Finance overview tile.
 * Presentational links only. No queries, no mutations, no service calls.
 */

type Tile = {
  key: string;
  to: string;
  icon: typeof Crown;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
};

const TILES: ReadonlyArray<Tile> = [
  { key: 'memberships', to: '/admin/finance?tab=memberships', icon: Crown, title: { ar: 'العضويات', en: 'Memberships' }, description: { ar: 'إدارة العضويات وحالاتها.', en: 'Memberships and their statuses.' } },
  { key: 'subscriptions', to: '/admin/finance?tab=subscriptions', icon: Wallet, title: { ar: 'اشتراكات المزودين', en: 'Provider Subscriptions' }, description: { ar: 'اشتراكات المزودين النشطة.', en: 'Active provider subscriptions.' } },
  { key: 'payments', to: '/admin/finance?tab=payments', icon: CreditCard, title: { ar: 'المدفوعات', en: 'Payments' }, description: { ar: 'مدفوعات العضويات والاشتراكات.', en: 'Membership and subscription payments.' } },
  { key: 'plans', to: '/admin/finance?tab=plans', icon: Layers, title: { ar: 'الخطط', en: 'Plans' }, description: { ar: 'خطط العضوية ومصفوفة الخدمات.', en: 'Membership plans and modules matrix.' } },
  { key: 'lifecycle', to: '/admin/finance?tab=lifecycle', icon: Clock, title: { ar: 'مهام دورة الحياة', en: 'Lifecycle Jobs' }, description: { ar: 'مهام تجديد وانتهاء العضويات.', en: 'Renewal and expiry jobs.' } },
  { key: 'reports', to: '/admin/finance?tab=events', icon: BarChart3, title: { ar: 'سجل الأحداث', en: 'Events & Reports' }, description: { ar: 'سجل أحداث العضويات والتدقيق.', en: 'Membership events and audit.' } },
];

const FinanceOverviewLanding = () => {
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
                  <ArrowRight className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`} />
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

export default FinanceOverviewLanding;