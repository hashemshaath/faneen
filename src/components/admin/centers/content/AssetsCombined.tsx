import { Package, Replace } from 'lucide-react';
import { ContentSubTabs } from './ContentSubTabs';

/**
 * Combined Assets tab — bundles AdminAssets and AdminAssetOverrides as
 * inner tabs. Each page owns its own logic; nothing is moved.
 */
const AssetsCombined = () => (
  <ContentSubTabs
    tabs={[
      {
        key: 'assets',
        label: { ar: 'الأصول', en: 'Assets' },
        icon: Package,
        loader: () => import('@/pages/admin/AdminAssets'),
      },
      {
        key: 'overrides',
        label: { ar: 'الاستبدالات', en: 'Overrides' },
        icon: Replace,
        loader: () => import('@/pages/admin/AdminAssetOverrides'),
      },
    ]}
  />
);

export default AssetsCombined;