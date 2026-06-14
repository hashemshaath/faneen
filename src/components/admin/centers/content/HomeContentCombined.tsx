import { Layers, HelpCircle } from 'lucide-react';
import { ContentSubTabs } from './ContentSubTabs';

/**
 * Combined Home Content tab — bundles AdminHomeSectors and AdminHomeFaq
 * as inner tabs. Each page owns its own logic; nothing is moved.
 */
const HomeContentCombined = () => (
  <ContentSubTabs
    tabs={[
      {
        key: 'sectors',
        label: { ar: 'قطاعات الواجهة', en: 'Home Sectors' },
        icon: Layers,
        loader: () => import('@/pages/admin/AdminHomeSectors'),
      },
      {
        key: 'faq',
        label: { ar: 'الأسئلة الشائعة', en: 'FAQ' },
        icon: HelpCircle,
        loader: () => import('@/pages/admin/AdminHomeFaq'),
      },
    ]}
  />
);

export default HomeContentCombined;