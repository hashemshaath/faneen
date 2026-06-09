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
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-6 mb-4 sm:mb-5">
          <div className="min-w-0 lg:max-w-md">
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
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap lg:justify-end snap-x snap-mandatory">
            {row.items.map((item) => (
              <Link
                key={`${row.id}-${item.ar}`}
                to={chipHref(item)}
                className="shrink-0 snap-start inline-flex items-center px-3 py-1.5 rounded-full border border-border/70 bg-card text-xs sm:text-[13px] font-medium text-foreground hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {bi(item.ar, item.en)}
              </Link>
            ))}
            <Link
              to={row.allHref}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-primary hover:underline whitespace-nowrap"
            >
              {bi('عرض الكل', 'View all')}
              <Arrow className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
          {providersLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`${row.id}-provider-skeleton-${index}`}
                  className="shrink-0 snap-start w-[76%] sm:w-[280px] rounded-2xl border border-border/60 bg-card h-[230px] animate-pulse"
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
                  const href = `/${business.username ?? business.id}`;
                  const image = pickCardImageSource(business);
                  return (
                    <Link
                      key={`${row.id}-${business.id}`}
                      to={href}
                      className="group shrink-0 snap-start w-[76%] sm:w-[280px] rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--elev-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={name || bi('مزوّد', 'Provider')}
                    >
                      <div className="relative w-full overflow-hidden bg-gradient-to-br from-muted to-muted/40" style={{ aspectRatio: '16 / 10' }}>
                        {image.kind === 'cover' ? (
                          <ResponsiveImage
                            originalUrl={image.url ?? undefined}
                            variants={image.variants}
                            alt={name || bi('مزوّد', 'Provider')}
                            sizes="(max-width: 640px) 76vw, 280px"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : image.kind === 'logo' ? (
                          <div className="absolute inset-0 flex items-center justify-center p-6 transition-transform duration-500 group-hover:scale-[1.04]">
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
                            <span className="font-heading font-bold text-4xl text-muted-foreground/50 select-none tracking-wide" aria-hidden="true">
                              {initialsOf(name)}
                            </span>
                          </div>
                        )}
                        {business.is_verified ? (
                          <div className="absolute top-2 end-2 z-10">
                            <VerifiedBadge size="xs" className="backdrop-blur-sm bg-success/15" />
                          </div>
                        ) : null}
                      </div>
                      <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 border-t border-border/40">
                        <h3 className="font-heading font-semibold text-sm sm:text-[15px] text-foreground truncate leading-snug group-hover:text-primary transition-colors">
                          {name || bi('مزوّد', 'Provider')}
                        </h3>
                        {city ? (
                          <p className="text-xs text-muted-foreground truncate mt-1">{city}</p>
                        ) : null}
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
      </div>
    </section>
  );
};

export default HomeCategoryRow;