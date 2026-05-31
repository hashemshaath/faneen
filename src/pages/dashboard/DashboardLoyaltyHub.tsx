import { Star, ShoppingBag } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 7 — Loyalty overview + store. */
const DashboardLoyaltyHub = () => (
  <TabbedShell
    icon={Star}
    title={{ ar: 'الولاء', en: 'Loyalty' }}
    description={{
      ar: 'رصيد النقاط والمزايا ومتجر استبدال المكافآت.',
      en: 'Points balance, benefits, and the rewards store.',
    }}
    tabs={[
      { key: 'overview', label: { ar: 'الرصيد والمزايا', en: 'Overview' }, icon: Star, loader: () => import('./DashboardLoyalty') },
      { key: 'store', label: { ar: 'المتجر', en: 'Store' }, icon: ShoppingBag, loader: () => import('./DashboardLoyaltyStore') },
    ]}
  />
);

export default DashboardLoyaltyHub;