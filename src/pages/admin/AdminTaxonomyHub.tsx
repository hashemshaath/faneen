import { FolderTree, Tags } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 15 — Categories & Tags taxonomy. */
const AdminTaxonomyHub = () => (
  <TabbedShell
    icon={FolderTree}
    title={{ ar: 'التصنيفات والوسوم', en: 'Categories & Tags' }}
    description={{
      ar: 'إدارة شجرة التصنيفات والوسوم المرتبطة بالمحتوى.',
      en: 'Manage the category tree and content tags.',
    }}
    noIndex
    tabs={[
      { key: 'categories', label: { ar: 'التصنيفات', en: 'Categories' }, icon: FolderTree, loader: () => import('./AdminCategories') },
      { key: 'tags', label: { ar: 'الوسوم', en: 'Tags' }, icon: Tags, loader: () => import('./AdminTags') },
    ]}
  />
);

export default AdminTaxonomyHub;