/**
 * HomeCategoryRow — reusable horizontal row for a category cluster.
 * Marketplace pattern: H2 + subtitle + "View all" + filter chips.
 * Chips scroll horizontally on mobile, wrap on desktop.
 * No DB call — pure data from `categoryRows.ts`. Each chip links
 * to `/search?category=<slug>` or `/search?q=<term>`.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import type { CategoryRow } from '../data/categoryRows';

const chipHref = (item: CategoryRow['items'][number]): string => {
  if (item.slug) return `/search?category=${encodeURIComponent(item.slug)}`;
  if (item.query) return `/search?q=${encodeURIComponent(item.query)}`;
  return '/search';
};

interface Props {
  row: CategoryRow;
}

const HomeCategoryRow = ({ row }: Props) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  return (
    <section
      aria-labelledby={`row-${row.id}`}
      className="py-8 sm:py-10 border-t border-border/40"
    >
      <div className="container-app">
        <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
          <div className="min-w-0">
            <h2
              id={`row-${row.id}`}
              className="font-heading font-bold text-lg sm:text-xl md:text-2xl text-foreground leading-tight"
            >
              {bi(row.titleAr, row.titleEn)}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">
              {bi(row.subAr, row.subEn)}
            </p>
          </div>
          <Link
            to={row.allHref}
            className="shrink-0 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:underline whitespace-nowrap"
          >
            {bi('عرض الكل', 'View all')}
            <Arrow className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap snap-x snap-mandatory">
          {row.items.map((item) => (
            <Link
              key={`${row.id}-${item.ar}`}
              to={chipHref(item)}
              className="shrink-0 snap-start inline-flex items-center px-3.5 py-2 rounded-full border border-border/70 bg-card text-sm font-medium text-foreground hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {bi(item.ar, item.en)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCategoryRow;