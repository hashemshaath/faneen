/**
 * HomeSectorGrid — image-cover tile grid for the top 8 industrial sectors.
 * Responsive: 2 cols (mobile) → 3 (sm) → 4 (lg) ⇒ 2 rows on desktop.
 * Remaining canonical primaries stay reachable via "View all sectors"
 * and via HomeCategoryRows further down.
 */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, ArrowRight,
  Square, Layers, Hammer, Sparkles, TreePine, ChefHat,
  Building2, MoveVertical,
} from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Section, SectionHead, SecondaryCTA, ROUTES } from './_shared';
import {
  HOME_ALLOWED_SLUGS, HOME_SECTOR_GRID_SLUGS, homeCategoryHref,
} from '@/components/home/v2/data/homeTaxonomy';
import { useHomeSectorTiles, type DefaultTile } from '@/modules/home';
import sectorAluminum from '@/assets/home/sector-aluminum.webp';
import sectorIron from '@/assets/home/sector-iron.webp';
import sectorWood from '@/assets/home/sector-wood.webp';
import sectorGlass from '@/assets/home/sector-glass.webp';
import sectorStainless from '@/assets/home/sector-stainless.webp';
import sectorFabrication from '@/assets/home/sector-fabrication.webp';
import sectorAluminum480 from '@/assets/home/sector-aluminum-480.webp';
import sectorAluminum768 from '@/assets/home/sector-aluminum-768.webp';
import sectorAluminum1024 from '@/assets/home/sector-aluminum-1024.webp';
import sectorIron480 from '@/assets/home/sector-iron-480.webp';
import sectorIron768 from '@/assets/home/sector-iron-768.webp';
import sectorWood480 from '@/assets/home/sector-wood-480.webp';
import sectorWood768 from '@/assets/home/sector-wood-768.webp';
import sectorWood1024 from '@/assets/home/sector-wood-1024.webp';
import sectorGlass480 from '@/assets/home/sector-glass-480.webp';
import sectorGlass768 from '@/assets/home/sector-glass-768.webp';
import sectorGlass1024 from '@/assets/home/sector-glass-1024.webp';
import sectorStainless480 from '@/assets/home/sector-stainless-480.webp';
import sectorStainless768 from '@/assets/home/sector-stainless-768.webp';
import sectorStainless1024 from '@/assets/home/sector-stainless-1024.webp';
import sectorFabrication480 from '@/assets/home/sector-fabrication-480.webp';
import sectorFabrication768 from '@/assets/home/sector-fabrication-768.webp';

type ImageSet = { image: string; srcSet: string };
const IMG: Record<string, ImageSet> = {
  'aluminum-works':        { image: sectorAluminum1024, srcSet: `${sectorAluminum480} 480w, ${sectorAluminum768} 768w, ${sectorAluminum1024} 1024w, ${sectorAluminum} 1200w` },
  'glass-securit-works':   { image: sectorGlass1024,    srcSet: `${sectorGlass480} 480w, ${sectorGlass768} 768w, ${sectorGlass1024} 1024w, ${sectorGlass} 1200w` },
  'steel-metal-works':     { image: sectorIron768,      srcSet: `${sectorIron480} 480w, ${sectorIron768} 768w, ${sectorIron} 1000w` },
  'stainless-steel-works': { image: sectorStainless1024, srcSet: `${sectorStainless480} 480w, ${sectorStainless768} 768w, ${sectorStainless1024} 1024w, ${sectorStainless} 1200w` },
  'wood-carpentry':        { image: sectorWood1024,     srcSet: `${sectorWood480} 480w, ${sectorWood768} 768w, ${sectorWood1024} 1024w, ${sectorWood} 1200w` },
  'kitchens-works':        { image: sectorStainless1024, srcSet: `${sectorStainless480} 480w, ${sectorStainless768} 768w, ${sectorStainless1024} 1024w, ${sectorStainless} 1200w` },
  'facades-cladding':      { image: sectorAluminum1024, srcSet: `${sectorAluminum480} 480w, ${sectorAluminum768} 768w, ${sectorAluminum1024} 1024w, ${sectorAluminum} 1200w` },
  'elevators-maintenance': { image: sectorFabrication768, srcSet: `${sectorFabrication480} 480w, ${sectorFabrication768} 768w, ${sectorFabrication} 1000w` },
};

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
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  return (
    <Section id="sectors" ariaLabelledBy="sectors-heading" className="bg-muted/20">
      <SectionHead
        headingId="sectors-heading"
        title={bi('القطاعات الرئيسية', 'Main sectors')}
        sub={bi('اختر القطاع وابدأ تصفّح المزودين.', 'Pick a sector and browse providers.')}
      />
      <div className="grid grid-cols-4 grid-rows-2 gap-[clamp(0.375rem,1vw,1rem)]">
        {tiles.map((s) => {
          const img = IMG[s.slug];
          const isLoaded = loaded[s.slug];
          return (
            <Link
              key={s.slug}
              to={homeCategoryHref(s.slug)}
              aria-label={bi(s.titleAr, s.titleEn)}
              className="group relative overflow-hidden rounded-[clamp(0.5rem,1vw,1rem)] border border-border/60 bg-card hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden bg-muted">
                {!isLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/70 to-muted" aria-hidden="true" />
                )}
                {img && (
                  <img
                    src={img.image}
                    srcSet={img.srcSet}
                    sizes="25vw"
                    alt={bi(s.titleAr, s.titleEn)}
                    width={1024}
                    height={640}
                    loading="lazy"
                    decoding="async"
                    {...{ fetchpriority: 'low' }}
                    onLoad={() => setLoaded((p) => ({ ...p, [s.slug]: true }))}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.06] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                  />
                )}
                {/* Base gradient + title (always visible) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none transition-opacity duration-300 group-hover:opacity-0" />
                <h3 className="absolute bottom-[clamp(0.375rem,1vw,0.75rem)] start-[clamp(0.375rem,1.2vw,1rem)] end-[clamp(0.375rem,1.2vw,1rem)] font-heading font-bold text-[clamp(0.7rem,1.4vw,1.125rem)] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] leading-tight line-clamp-2 transition-opacity duration-300 group-hover:opacity-0">
                  {bi(s.titleAr, s.titleEn)}
                </h3>
                {/* Hover preview overlay — contained within image, no layout shift */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/80 to-primary/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-[clamp(0.5rem,1.4vw,1rem)]">
                  <h4 className="font-heading font-bold text-[clamp(0.75rem,1.5vw,1.125rem)] text-primary-foreground leading-tight line-clamp-1">
                    {bi(s.titleAr, s.titleEn)}
                  </h4>
                  <p className="mt-1 text-[clamp(0.625rem,1.1vw,0.8rem)] text-primary-foreground/90 leading-snug line-clamp-2">
                    {bi(s.bodyAr, s.bodyEn)}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[clamp(0.625rem,1vw,0.75rem)] font-medium text-primary-foreground">
                    <span>{bi('استعراض', 'Explore')}</span>
                    <Arrow className="w-3 h-3 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
                  </div>
                </div>
              </div>
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