import { Link } from 'react-router-dom';
import {
  Award, ImageIcon, Layers, Search, Package, FolderTree,
  Building2, HelpCircle, ArrowRight, MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN UX RECONSOLIDATION PHASE 6 — Content & Directory overview tile.
 *
 * Presentational links only. No queries, no mutations, no service calls.
 * Each tile points to an existing tab inside the Content Center or to a
 * legacy route that already owns its own logic.
 */

type Tile = {
  key: string;
  to: string;
  icon: typeof Award;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
};

const TILES: ReadonlyArray<Tile> = [
  {
    key: 'directory',
    to: '/admin/content?tab=directory',
    icon: Building2,
    title: { ar: 'الدليل العام', en: 'Public Directory' },
    description: {
      ar: 'حالة الظهور العام وروابط إدارة المنشآت في الدليل.',
      en: 'Public directory visibility status and business management entry points.',
    },
  },
  {
    key: 'brands',
    to: '/admin/content?tab=brands',
    icon: Award,
    title: { ar: 'العلامات', en: 'Brands' },
    description: {
      ar: 'اعتماد وأرشفة وتوثيق العلامات التجارية.',
      en: 'Approve, archive, and verify brand entries.',
    },
  },
  {
    key: 'brand-requests',
    to: '/admin/content?tab=brand-requests',
    icon: HelpCircle,
    title: { ar: 'طلبات العلامات', en: 'Brand Requests' },
    description: {
      ar: 'مراجعة طلبات إضافة علامات جديدة.',
      en: 'Review submitted brand creation requests.',
    },
  },
  {
    key: 'showcase',
    to: '/admin/content?tab=showcase',
    icon: ImageIcon,
    title: { ar: 'المعرض', en: 'Showcase' },
    description: {
      ar: 'إدارة معرض الواجهة ومعرض الشركاء.',
      en: 'Manage homepage showcase and partner showcase entries.',
    },
  },
  {
    key: 'home',
    to: '/admin/content?tab=home',
    icon: Layers,
    title: { ar: 'محتوى الواجهة', en: 'Home Content' },
    description: {
      ar: 'قطاعات الواجهة والأسئلة الشائعة.',
      en: 'Homepage sectors and FAQ entries.',
    },
  },
  {
    key: 'private-sectors',
    to: '/admin/content?tab=private-sectors',
    icon: MapPin,
    title: { ar: 'القطاعات الخاصة', en: 'Private Sectors' },
    description: {
      ar: 'مراجعة وتدقيق القطاعات الخاصة.',
      en: 'Review and audit private sector pages.',
    },
  },
  {
    key: 'seo',
    to: '/admin/content?tab=seo',
    icon: Search,
    title: { ar: 'SEO والخريطة', en: 'SEO & Sitemap' },
    description: {
      ar: 'حالة الخريطة وتدقيق الموقع وSEO القطاعات.',
      en: 'Sitemap status, site audit, and sector SEO.',
    },
  },
  {
    key: 'assets',
    to: '/admin/content?tab=assets',
    icon: Package,
    title: { ar: 'الأصول', en: 'Assets' },
    description: {
      ar: 'صور وأصول النظام والاستبدالات.',
      en: 'System assets, images, and overrides.',
    },
  },
  {
    key: 'taxonomy',
    to: '/admin/content?tab=taxonomy',
    icon: FolderTree,
    title: { ar: 'الشجرة التصنيفية', en: 'Taxonomy' },
    description: {
      ar: 'إدارة شجرة التصنيفات والـslugs.',
      en: 'Manage taxonomy tree and slugs.',
    },
  },
];

const ContentOverviewLanding = () => {
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
                  <ArrowRight
                    className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`}
                  />
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

export default ContentOverviewLanding;