/**
 * HomeCategoryRow — reusable horizontal row for a category cluster.
 * Marketplace pattern: H2 + subtitle + "View all" + provider cards + filter chips.
 * Chips scroll horizontally on mobile, wrap on desktop.
 * Data is injected from the parent row loader; each chip links to
 * `/search?category=<slug>` or `/search?q=<term>`.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Star } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { ResponsiveImage } from '@/modules/files/components/ResponsiveImage';
import { isVariantUrls } from '@/modules/files/services/image-pipeline';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const Arrow = bi(ArrowLeft, ArrowRight);
  const hasLogo = (b: PublicTaxonomyBusiness): boolean =>
    Boolean(b.logo_url) || isVariantUrls(b.logo_image_variants);
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
                  const showLogoBadge = image.kind === 'cover' && hasLogo(business);
                  return (
                    <Link
                      key={`${row.id}-${business.id}`}
                      to={href}
                      className="group shrink-0 snap-start w-[76%] sm:w-[280px] rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--elev-2)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                        {/* Bottom gradient for legibility */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 via-black/15 to-transparent" aria-hidden="true" />
                        {/* Rating chip (top-start) */}
                        {business.rating_avg ? (
                          <div className="absolute top-2 start-2 z-10 inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border/60 shadow-sm">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="tech-content">{Number(business.rating_avg).toFixed(1)}</span>
                            {business.rating_count ? (
                              <span className="text-muted-foreground tech-content">({business.rating_count})</span>
                            ) : null}
                          </div>
                        ) : null}
                        {/* City pill (bottom-start, over gradient) */}
                        {city ? (
                          <div className="absolute bottom-2 start-2 z-10 inline-flex items-center gap-1 max-w-[70%] rounded-full bg-background/85 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-foreground border border-border/60">
                            <MapPin className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{city}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="relative px-3.5 pt-3 pb-3 sm:px-4 sm:pt-3.5 sm:pb-3.5 border-t border-border/40">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {showLogoBadge ? (
                            <div
                              className="shrink-0 aspect-square w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-background ring-1 ring-border/60 shadow-sm overflow-hidden flex items-center justify-center p-1"
                              aria-hidden="true"
                            >
                              <ResponsiveImage
                                originalUrl={business.logo_url ?? undefined}
                                variants={business.logo_image_variants}
                                alt=""
                                sizes="44px"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          ) : null}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Tooltip delayDuration={250}>
                                <TooltipTrigger asChild>
                                  <h3
                                    className="min-w-0 flex-1 font-heading font-semibold text-sm sm:text-[15px] text-foreground truncate leading-snug group-hover:text-primary transition-colors"
                                    dir="auto"
                                  >
                                    {name || bi('مزوّد', 'Provider')}
                                  </h3>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start" className="max-w-[260px] break-words text-xs">
                                  {name || bi('مزوّد', 'Provider')}
                                </TooltipContent>
                              </Tooltip>
                              {business.is_verified ? (
                                <VerifiedBadge size="xs" iconOnly className="text-success shrink-0" />
                              ) : null}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-muted-foreground truncate">
                                {business.is_verified
                                  ? bi('شركة موثّقة', 'Verified company')
                                  : bi('عرض الملف', 'View profile')}
                              </span>
                              <Arrow className="w-3.5 h-3.5 text-primary transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 shrink-0" />
                            </div>
                          </div>
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
      </div>
    </section>
  );
};

export default HomeCategoryRow;