/**
 * HomeSectorGrid — clean icon-based tile grid for the top 10 industrial
 * sectors. 5 columns on desktop (2 rows = 10 tiles), 3 on tablet, 2 on
 * mobile. The remaining canonical primaries (contracting-finishing,
 * security-control-systems, equipment-rental) stay reachable via the
 * "Explore all sectors" link and via HomeCategoryRows further down.
 *
 * Visual = subtle tinted card + single sector icon + Arabic title + one-line
 * descriptor + directional arrow on hover. No images = zero LCP impact,
 * zero CLS, and consistent visual rhythm even when a sector lacks a hero
 * photo.
 */
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight,
  Square, Layers, Hammer, Sparkles, TreePine, ChefHat,
  Building2, MoveVertical, SunMedium, Wifi,
} from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Section, SectionHead, SecondaryCTA, ROUTES } from './_shared';
import {
  HOME_ALLOWED_SLUGS, HOME_SECTOR_GRID_SLUGS, homeCategoryHref,
} from '@/components/home/v2/data/homeTaxonomy';
import { useHomeSectorTiles, type DefaultTile } from '@/modules/home';

// DEFAULT tile metadata. These remain the hardcoded baseline rendered when
// the DB has no `metadata.home_grid` overrides — which keeps the homepage
// identical to its current production look until an admin opts in via
// /admin/home-sectors. `iconName` MUST match a key in SECTOR_ICONS so the
// admin UI can show the current selection.
const SECTORS: DefaultTile[] = [
  { slug: 'aluminum-works',        Icon: Square,        iconName: 'Square',         titleAr: 'الألمنيوم',           titleEn: 'Aluminum',
    bodyAr: 'نوافذ وأبواب ومطابخ ومظلات.',                bodyEn: 'Windows, doors, kitchens and canopies.' },
  { slug: 'glass-securit-works',   Icon: Layers,        iconName: 'Layers',         titleAr: 'الزجاج والسيكوريت',  titleEn: 'Glass & Tempered',
    bodyAr: 'واجهات وقواطع وأبواب زجاجية.',               bodyEn: 'Facades, partitions and glass doors.' },
  { slug: 'steel-metal-works',     Icon: Hammer,        iconName: 'Hammer',         titleAr: 'الحديد والمعادن',     titleEn: 'Steel & Metals',
    bodyAr: 'أبواب وسلالم وهياكل ودرابزين.',              bodyEn: 'Doors, stairs, frames and railings.' },
  { slug: 'stainless-steel-works', Icon: Sparkles,      iconName: 'Sparkles',       titleAr: 'الستانلس ستيل',       titleEn: 'Stainless Steel',
    bodyAr: 'مطابخ ومطاعم وتجهيزات صناعية.',              bodyEn: 'Kitchens, F&B and industrial fittings.' },
  { slug: 'wood-carpentry',        Icon: TreePine,      iconName: 'TreePine',       titleAr: 'الخشب والنجارة',      titleEn: 'Wood & Carpentry',
    bodyAr: 'أبواب وأثاث وتفصيل داخلي.',                  bodyEn: 'Doors, furniture and custom interiors.' },
  { slug: 'kitchens-works',        Icon: ChefHat,       iconName: 'ChefHat',        titleAr: 'المطابخ',              titleEn: 'Kitchens',
    bodyAr: 'تصميم وتنفيذ وتركيب المطابخ.',               bodyEn: 'Kitchen design, build and install.' },
  { slug: 'facades-cladding',      Icon: Building2,     iconName: 'Building2',      titleAr: 'الواجهات والكلادينج', titleEn: 'Facades & Cladding',
    bodyAr: 'واجهات تجارية وكلادينج ومداخل.',             bodyEn: 'Storefronts, cladding and entrances.' },
  { slug: 'elevators-maintenance', Icon: MoveVertical,  iconName: 'MoveVertical',   titleAr: 'المصاعد والصيانة',    titleEn: 'Elevators & Maintenance',
    bodyAr: 'مصاعد وسلالم كهربائية وصيانة دورية.',         bodyEn: 'Elevators, escalators and maintenance.' },
  { slug: 'energy-sustainability', Icon: SunMedium,     iconName: 'SunMedium',      titleAr: 'الطاقة والاستدامة',   titleEn: 'Energy & Sustainability',
    bodyAr: 'طاقة شمسية وعزل حراري واستدامة.',            bodyEn: 'Solar, insulation and sustainability.' },
  { slug: 'technology-networks',   Icon: Wifi,          iconName: 'Wifi',           titleAr: 'التقنية والشبكات',    titleEn: 'Technology & Networks',
    bodyAr: 'شبكات وأنظمة ذكية وبنية اتصالات.',            bodyEn: 'Networks, smart systems and comms.' },
];

// Exposed so the admin page can show the same baseline copy + icons as
// initial values when no override has been saved yet.
export const HOME_SECTOR_GRID_DEFAULTS: ReadonlyArray<DefaultTile> = SECTORS;

// Module-load assertion: order + membership match HOME_SECTOR_GRID_SLUGS.
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  for (const s of SECTORS) {
    if (!HOME_ALLOWED_SLUGS.has(s.slug)) {
      // eslint-disable-next-line no-console
      console.error(`[HomeSectorGrid] slug "${s.slug}" not in HOME_ALLOWED_SLUGS`);
    }
  }
  const expected = [...HOME_SECTOR_GRID_SLUGS];
  const actual = SECTORS.map((s) => s.slug);
  if (expected.join(',') !== actual.join(',')) {
    // eslint-disable-next-line no-console
    console.error('[HomeSectorGrid] SECTORS order must match HOME_SECTOR_GRID_SLUGS', { expected, actual });
  }
}

const HomeSectorGrid = () => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  // CMS-aware tiles. Falls back to SECTORS verbatim if DB has no overrides
  // — so the rendered output is byte-identical to the current homepage
  // until an admin actively edits a tile.
  const { tiles } = useHomeSectorTiles(SECTORS);
  return (
    <Section id="sectors" ariaLabelledBy="sectors-heading" className="bg-muted/20">
      <SectionHead
        headingId="sectors-heading"
        title={bi('القطاعات الرئيسية', 'Main sectors')}
        sub={bi('اختر القطاع وابدأ تصفّح المزودين.', 'Pick a sector and browse providers.')}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {tiles.map((s) => {
          const Icon = s.Icon;
          return (
            <Link
              key={s.slug}
              to={homeCategoryHref(s.slug)}
              className="group relative flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 min-h-[148px] sm:min-h-[160px] transition-all duration-200 hover:border-primary/40 hover:shadow-[var(--elev-1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={bi(s.titleAr, s.titleEn)}
            >
              <span
                className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/8 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary/12"
                aria-hidden="true"
              >
                <Icon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading font-semibold text-sm sm:text-[15px] text-foreground leading-snug">
                  {bi(s.titleAr, s.titleEn)}
                </h3>
                <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-snug line-clamp-2">
                  {bi(s.bodyAr, s.bodyEn)}
                </p>
              </div>
              <Arrow className="absolute bottom-3 end-3 w-3.5 h-3.5 text-primary/60 transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
      <div className="text-center mt-8 sm:mt-10">
        <SecondaryCTA to={ROUTES.categories} label={bi('عرض جميع القطاعات', 'View all sectors')} />
      </div>
    </Section>
  );
};

export default HomeSectorGrid;