import { FolderTree, Award, Image as ImageIcon, Layers, HelpCircle, Search, Package, MapPin } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/**
 * ADMIN UX RECONSOLIDATION PHASE 2 — Content & Directory Center shell.
 *
 * Thin wrapper exposing existing content/directory admin pages as tabs.
 * NO logic, queries, or mutations are moved.
 */
const AdminContentCenter = () => (
  <TabbedShell
    icon={FolderTree}
    title={{ ar: 'مركز المحتوى والدليل', en: 'Content & Directory Center' }}
    description={{
      ar: 'التصنيفات، العلامات، القطاعات، الواجهة، الـSEO، والأصول.',
      en: 'Taxonomy, brands, sectors, home content, SEO, and assets.',
    }}
    noIndex
    tabs={[
      { key: 'taxonomy',       label: { ar: 'الشجرة التصنيفية', en: 'Taxonomy' },        icon: FolderTree,  loader: () => import('./AdminTaxonomyCenter') },
      { key: 'brands',         label: { ar: 'العلامات',          en: 'Brands' },          icon: Award,       loader: () => import('./AdminBrands') },
      { key: 'brand-requests', label: { ar: 'طلبات العلامات',    en: 'Brand Requests' },  icon: Award,       loader: () => import('./AdminBrandRequests') },
      { key: 'showcase',       label: { ar: 'المعرض',            en: 'Showcase' },        icon: ImageIcon,   loader: () => import('./AdminPartnerShowcase') },
      { key: 'home',           label: { ar: 'محتوى الواجهة',     en: 'Home Content' },    icon: Layers,      loader: () => import('./AdminHomeSectors') },
      { key: 'faq',            label: { ar: 'الأسئلة الشائعة',   en: 'FAQ' },             icon: HelpCircle,  loader: () => import('./AdminHomeFaq') },
      { key: 'private-sectors',label: { ar: 'القطاعات الخاصة',   en: 'Private Sectors' }, icon: Layers,      loader: () => import('./AdminPrivateSectors') },
      { key: 'seo',            label: { ar: 'SEO والخريطة',      en: 'SEO & Sitemap' },   icon: Search,      loader: () => import('./AdminSeoHub') },
      { key: 'assets',         label: { ar: 'الأصول',            en: 'Assets' },          icon: Package,     loader: () => import('./AdminAssets') },
      { key: 'locations',      label: { ar: 'المواقع',           en: 'Locations' },       icon: MapPin,      loader: () => import('./locations/AdminLocationsHub') },
    ]}
  />
);

export default AdminContentCenter;
