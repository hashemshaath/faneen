import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, ArrowUpRight, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { Button } from '@/components/ui/button';
import { getBusinessProfileHref } from '@/lib/business/profileHref';
import { fmtNum } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BusinessTaxonomyDisplay } from '@/modules/taxonomy/search-integration';

/**
 * Filters out the literal "غير مصنّف" / "Uncategorized" placeholder so it
 * never reaches the UI. Taxonomy display rules forbid surfacing it.
 */
const UNCATEGORIZED = new Set([
  'غير مصنّف', 'غير مصنف', 'بدون تصنيف',
  'Uncategorized', 'uncategorized', 'Other', 'other',
]);
const cleanLabel = (label: string | null | undefined): string | null => {
  if (!label) return null;
  const trimmed = label.trim();
  if (!trimmed) return null;
  if (UNCATEGORIZED.has(trimmed)) return null;
  return trimmed;
};

export interface SearchResultCardV3Business {
  id: string;
  username?: string | null;
  name_ar: string;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  logo_url?: string | null;
  rating_avg?: number | string | null;
  rating_count?: number | string | null;
  is_verified?: boolean | null;
  cities?: { name_ar: string; name_en: string } | null;
}

interface Props {
  business: SearchResultCardV3Business;
  taxonomy?: BusinessTaxonomyDisplay;
  view?: 'grid' | 'list';
}

const InitialsFallback = ({ name }: { name: string }) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary flex items-center justify-center font-heading font-bold text-xl shrink-0">
      {initial}
    </div>
  );
};

export const SearchResultCardV3 = memo(({ business, taxonomy, view = 'grid' }: Props) => {
  const { language, isRTL } = useLanguage();
  const bi = useBi();

  const href = getBusinessProfileHref(business);
  const name = language === 'ar' ? business.name_ar : (business.name_en || business.name_ar);
  const description = language === 'ar'
    ? (business.description_ar || business.description_en)
    : (business.description_en || business.description_ar);
  const city = business.cities
    ? (language === 'ar' ? business.cities.name_ar : business.cities.name_en)
    : null;

  const primaryLabel = cleanLabel(taxonomy?.primaryLabel);
  const secondaryLabels = (taxonomy?.secondaryLabels ?? [])
    .map(cleanLabel)
    .filter((s): s is string => !!s)
    .slice(0, 3);

  const rating = Number(business.rating_avg) || 0;
  const ratingCount = Number(business.rating_count) || 0;

  const isList = view === 'list';

  return (
    <article
      className={cn(
        'group relative rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--elev-1)] transition-all hover:shadow-[var(--elev-2)] hover:border-accent/40',
        isList ? 'flex flex-row items-stretch gap-4' : 'flex flex-col',
      )}
    >
      <div className={cn('flex items-start gap-3', isList ? 'flex-1 min-w-0' : '')}>
        {business.logo_url ? (
          <img
            src={business.logo_url}
            alt=""
            loading="lazy"
            className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0"
          />
        ) : (
          <InitialsFallback name={name} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            {href ? (
              <Link
                to={href}
                className="text-base font-heading font-bold text-foreground hover:text-accent transition-colors truncate max-w-full"
                dir="auto"
              >
                {name}
              </Link>
            ) : (
              <span className="text-base font-heading font-bold text-foreground truncate max-w-full" dir="auto">
                {name}
              </span>
            )}
            {business.is_verified ? <VerifiedBadge size="xs" /> : null}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            {rating > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                <span className="tech-content font-semibold text-foreground">{fmtNum(rating, { maximumFractionDigits: 1 })}</span>
                {ratingCount > 0 ? (
                  <span className="text-muted-foreground">
                    (<span className="tech-content">{fmtNum(ratingCount)}</span>)
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="text-muted-foreground">{bi('جديد', 'New')}</span>
            )}
            {city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                <span dir="auto">{city}</span>
              </span>
            ) : null}
          </div>

          {(primaryLabel || secondaryLabels.length > 0) ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {primaryLabel ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-body font-semibold border border-primary/20" dir="auto">
                  {primaryLabel}
                </span>
              ) : null}
              {secondaryLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-body border border-border/40"
                  dir="auto"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {description ? (
        <p
          className={cn(
            'text-sm text-muted-foreground line-clamp-2 leading-relaxed',
            isList ? 'flex-1 self-center hidden md:block' : 'mt-3',
          )}
          dir="auto"
        >
          {description}
        </p>
      ) : null}

      <div className={cn('flex items-center gap-2 mt-4', isList ? 'self-center shrink-0 mt-0 flex-col' : '')}>
        {href ? (
          <Button asChild variant="default" size="app" className="flex-1 gap-1.5">
            <Link to={href} aria-label={bi(`عرض ملف ${name}`, `View ${name} profile`)}>
              <span>{bi('عرض الملف', 'View profile')}</span>
              <ArrowUpRight className={cn('w-4 h-4', isRTL ? 'rtl-flip' : '')} aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        {href ? (
          <Button asChild variant="outline" size="app" className="flex-1 gap-1.5">
            <Link to={`${href}#contact`} aria-label={bi('تواصل', 'Contact')}>
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>{bi('تواصل', 'Contact')}</span>
            </Link>
          </Button>
        ) : null}
      </div>
    </article>
  );
});

SearchResultCardV3.displayName = 'SearchResultCardV3';

export default SearchResultCardV3;