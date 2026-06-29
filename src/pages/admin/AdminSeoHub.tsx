import { Search, Gauge, Layers } from 'lucide-react';
import { TabbedShell, type TabbedShellTab } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 16 — SEO center. */
const TITLE = { ar: 'مركز SEO', en: 'SEO Center' } as const;
const DESCRIPTION = {
  ar: 'حالة خريطة الموقع، تدقيق الأداء، وSEO القطاعات.',
  en: 'Sitemap status, performance audit, and sector SEO.',
} as const;
const TABS: ReadonlyArray<TabbedShellTab> = [
  { key: 'sitemap', label: { ar: 'حالة خريطة الموقع', en: 'Sitemap' }, icon: Search, loader: () => import('./AdminSitemapStatus') },
  { key: 'audit', label: { ar: 'تدقيق الموقع', en: 'Site Audit' }, icon: Gauge, loader: () => import('./AdminSiteAudit') },
  { key: 'sector-seo', label: { ar: 'SEO القطاعات', en: 'Sector SEO' }, icon: Layers, loader: () => import('./AdminSectorSeo') },
];

const AdminSeoHub = () => (
  <TabbedShell icon={Search} title={TITLE} description={DESCRIPTION} noIndex tabs={TABS} />
);

export default AdminSeoHub;