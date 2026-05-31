import { Search, Gauge, Layers } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 16 — SEO center. */
const AdminSeoHub = () => (
  <TabbedShell
    icon={Search}
    title={{ ar: 'مركز SEO', en: 'SEO Center' }}
    description={{
      ar: 'حالة خريطة الموقع، تدقيق الأداء، وSEO القطاعات.',
      en: 'Sitemap status, performance audit, and sector SEO.',
    }}
    noIndex
    tabs={[
      { key: 'sitemap', label: { ar: 'حالة خريطة الموقع', en: 'Sitemap' }, icon: Search, loader: () => import('./AdminSitemapStatus') },
      { key: 'audit', label: { ar: 'تدقيق الموقع', en: 'Site Audit' }, icon: Gauge, loader: () => import('./AdminSiteAudit') },
      { key: 'sector-seo', label: { ar: 'SEO القطاعات', en: 'Sector SEO' }, icon: Layers, loader: () => import('./AdminSectorSeo') },
    ]}
  />
);

export default AdminSeoHub;