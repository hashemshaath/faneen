import { ImageIcon, Users } from 'lucide-react';
import { ContentSubTabs } from './ContentSubTabs';

/**
 * Combined Showcase tab — bundles AdminShowcase and AdminPartnerShowcase
 * as inner tabs. Each page owns its own logic; nothing is moved.
 */
const ShowcaseCombined = () => (
  <ContentSubTabs
    tabs={[
      {
        key: 'home',
        label: { ar: 'معرض الواجهة', en: 'Home Showcase' },
        icon: ImageIcon,
        loader: () => import('@/pages/admin/AdminShowcase'),
      },
      {
        key: 'partner',
        label: { ar: 'معرض الشركاء', en: 'Partner Showcase' },
        icon: Users,
        loader: () => import('@/pages/admin/AdminPartnerShowcase'),
      },
    ]}
  />
);

export default ShowcaseCombined;