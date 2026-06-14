import {
  FolderTree, Award, Image as ImageIcon, Layers, Search,
  Package, Building2, LayoutGrid, MapPin, HelpCircle,
} from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/**
 * ADMIN UX RECONSOLIDATION PHASE 6 — Content & Directory Center.
 *
 * Canonical 10-tab consolidation of every content/directory admin
 * surface. Each tab either embeds an existing page or renders a
 * presentational landing/sub-tab wrapper. NO queries, NO mutations,
 * and NO service calls are moved here.
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
      { key: 'overview',        label: { ar: 'نظرة عامة',         en: 'Overview' },         icon: LayoutGrid, loader: () => import('@/components/admin/centers/content/ContentOverviewLanding') },
      { key: 'directory',       label: { ar: 'الدليل العام',      en: 'Directory' },        icon: Building2,  loader: () => import('@/components/admin/centers/content/DirectoryLanding') },
      { key: 'brands',          label: { ar: 'العلامات',          en: 'Brands' },           icon: Award,      loader: () => import('./AdminBrands') },
      { key: 'brand-requests',  label: { ar: 'طلبات العلامات',    en: 'Brand Requests' },   icon: HelpCircle, loader: () => import('./AdminBrandRequests') },
      { key: 'showcase',        label: { ar: 'المعرض',            en: 'Showcase' },         icon: ImageIcon,  loader: () => import('@/components/admin/centers/content/ShowcaseCombined') },
      { key: 'home',            label: { ar: 'محتوى الواجهة',     en: 'Home Content' },     icon: Layers,     loader: () => import('@/components/admin/centers/content/HomeContentCombined') },
      { key: 'private-sectors', label: { ar: 'القطاعات الخاصة',   en: 'Private Sectors' },  icon: MapPin,     loader: () => import('./AdminPrivateSectors') },
      { key: 'seo',             label: { ar: 'SEO والخريطة',      en: 'SEO & Sitemap' },    icon: Search,     loader: () => import('./AdminSeoHub') },
      { key: 'assets',          label: { ar: 'الأصول',            en: 'Assets' },           icon: Package,    loader: () => import('@/components/admin/centers/content/AssetsCombined') },
      { key: 'taxonomy',        label: { ar: 'الشجرة التصنيفية', en: 'Taxonomy' },         icon: FolderTree, loader: () => import('./AdminTaxonomyCenter') },
    ]}
  />
);

export default AdminContentCenter;
