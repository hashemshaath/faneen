import { Link } from 'react-router-dom';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { SECTOR_KEYWORDS } from '@/lib/sector-keywords';
import { SA_CITIES } from '@/lib/sa-cities';

// Top sector × city combos that already render through the indexable
// `/sectors/:sector/:city` landing pages (covered by the dynamic sitemap).
// Surfacing them as real <a> links inside the filters sidebar gives both
// users and crawlers a direct path into popular filter combinations.
const SECTOR_SLUGS = ['aluminum', 'cabinets', 'glass', 'iron', 'wood'] as const;
const CITY_SLUGS = ['riyadh', 'jeddah', 'dammam', 'makkah'] as const;

export const SearchSeoLinksV3 = () => {
  const bi = useBi();
  const { language } = useLanguage();

  const combos = SECTOR_SLUGS.flatMap((sectorSlug) => {
    const sector = SECTOR_KEYWORDS[sectorSlug];
    return CITY_SLUGS.map((citySlug) => {
      const city = SA_CITIES.find((c) => c.slug === citySlug);
      if (!city) return null;
      const sectorName = language === 'ar' ? sector.name_ar : sector.name_en;
      const cityName = language === 'ar' ? city.nameAr : city.nameEn;
      const label = bi(`${sectorName} في ${cityName}`, `${sectorName} in ${cityName}`);
      return {
        href: `/sectors/${sectorSlug}/${citySlug}`,
        label,
        title: label,
      };
    }).filter(Boolean) as { href: string; label: string; title: string }[];
  });

  return (
    <nav
      aria-label={bi('روابط سريعة مفهرسة', 'Indexable quick links')}
      className="pt-4 mt-4 border-t border-border/40"
    >
      <h2 className="text-[11px] font-heading font-bold text-foreground uppercase tracking-wide mb-2">
        {bi('روابط شائعة', 'Popular searches')}
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {combos.map((c) => (
          <li key={c.href}>
            <Link
              to={c.href}
              title={c.title}
              className="inline-flex items-center text-[11px] font-body px-2 py-1 rounded-full bg-muted/40 text-muted-foreground hover:text-accent hover:bg-accent/10 border border-border/40 hover:border-accent/40 transition-colors"
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SearchSeoLinksV3;