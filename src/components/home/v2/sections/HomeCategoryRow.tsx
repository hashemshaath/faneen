/**
 * HomeCategoryRow — reusable horizontal row for a category cluster.
 * Marketplace pattern: H2 + subtitle + "View all" + provider cards + filter chips.
 * Chips scroll horizontally on mobile, wrap on desktop.
 * Data is injected from the parent row loader; each chip links to
 * `/search?category=<slug>` or `/search?q=<term>`.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { ResponsiveImage } from '@/modules/files/components/ResponsiveImage';
import { isVariantUrls } from '@/modules/files/services/image-pipeline';
import type { PublicTaxonomyBusiness } from '@/modules/taxonomy/search-integration';
import type { CategoryRow } from '../data/categoryRows';

const chipHref = (item: CategoryRow['items'][number]): string => {
  if (item.slug) return `/search?category=${encodeURIComponent(item.slug)}`;
  if (item.query) return `/search?q=${encodeURIComponent(item.query)}`;
  return '/search';
};

type CardImageSource =
  | { kind: 'cover'; variants?: unknown; url?: string | null }
  | { kind: 'logo'; variants?: unknown; url?: string | null }
  | { kind: 'placeholder' };

/**
 * Fallback order for the card cover image:
 *   1. cover_image_variants
 *   2. cover_url
 *   3. logo_image_variants
 *   4. logo_url
 *   5. placeholder (initials)
 */
export function pickCardImageSource(b: Pick<PublicTaxonomyBusiness, 'cover_url' | 'cover_image_variants' | 'logo_url' | 'logo_image_variants'>): CardImageSource {
  if (isVariantUrls(b.cover_image_variants)) return { kind: 'cover', variants: b.cover_image_variants, url: b.cover_url };
  if (b.cover_url) return { kind: 'cover', url: b.cover_url };
  if (isVariantUrls(b.logo_image_variants)) return { kind: 'logo', variants: b.logo_image_variants, url: b.logo_url };
  if (b.logo_url) return { kind: 'logo', url: b.logo_url };
  return { kind: 'placeholder' };
}

function initialsOf(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return '•';
  const parts = cleaned.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).slice(0, 2);
}

interface Props {
  row: CategoryRow;
  providers?: PublicTaxonomyBusiness[];
  providersLoading?: boolean;
}

const HomeCategoryRow = ({ row, providers = [], providersLoading = false }: Props) => {
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
        <div className="mb-4 sm:mb-5 flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
          {providersLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`${row.id}-provider-skeleton-${index}`}
                  className="shrink-0 snap-start w-[76%] sm:w-[280px] rounded-xl border border-border/60 bg-card p-4 h-[112px] animate-pulse"
                />
              ))
            : providers.length > 0
              ? providers.map((business) => {
                  const name = bi(
                    business.name_ar ?? business.name_en ?? '',
                    business.name_en ?? business.name_ar ?? '',
                  );
                  const city = business.cities
                    ? bi(business.cities.name_ar ?? '', business.cities.name_en ?? '')
                    : '';
                  const href = business.username ? `/q/${business.username}` : `/q/${business.id}`;
                  const image = pickCardImageSource(business);
                  return (
                    <Link
                      key={`${row.id}-${business.id}`}
                      to={href}
                      className="group shrink-0 snap-start w-[76%] sm:w-[280px] rounded-xl border border-border/60 bg-card overflow-hidden hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <div className="relative w-full bg-gradient-to-br from-muted to-muted/40 border-b border-border/40" style={{ aspectRatio: '16 / 9' }}>
                        {image.kind === 'cover' ? (
                          <ResponsiveImage
                            originalUrl={image.url ?? undefined}
                            variants={image.variants}
                            alt={name || bi('مزوّد', 'Provider')}
                            sizes="(max-width: 640px) 76vw, 280px"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : image.kind === 'logo' ? (
                          <div className="absolute inset-0 flex items-center justify-center p-6">
                            <ResponsiveImage
                              originalUrl={image.url ?? undefined}
                              variants={image.variants}
                              alt={name || bi('مزوّد', 'Provider')}
                              sizes="(max-width: 640px) 50vw, 200px"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-heading font-bold text-3xl text-muted-foreground/60 select-none" aria-hidden="true">
                              {initialsOf(name)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-heading font-semibold text-sm text-foreground truncate">
                            {name || bi('مزوّد', 'Provider')}
                          </h3>
                          {business.is_verified ? <VerifiedBadge size="xs" /> : null}
                        </div>
                        {city ? <p className="text-xs text-muted-foreground truncate mt-0.5">{city}</p> : null}
                        <div className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                          {bi('عرض الملف', 'View profile')}
                          <Arrow className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              : (
                <div className="w-full rounded-xl border border-border/60 bg-muted/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {bi('لا توجد شركات مرتبطة بهذا القطاع حاليًا', 'No providers are linked to this sector yet')}
                  </p>
                  <Link to={row.allHref} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    {bi('استكشف القطاع', 'Explore sector')}
                    <Arrow className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
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