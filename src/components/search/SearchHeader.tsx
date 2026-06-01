import { useLanguage } from '@/i18n/LanguageContext';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { SearchAutocomplete } from './SearchAutocomplete';
import { TrendingUp, BadgeCheck, Star, Heart, LayoutGrid, ChevronDown, ChevronUp, FileText, Boxes } from 'lucide-react';
import { useBusinessFavorites } from '@/hooks/useBusinessFavorites';

interface SearchHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch?: (q: string) => void;
  totalResults: number;
  categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
  onCategoryClick?: (id: string) => void;
  businesses?: any[];
  verifiedOnly?: boolean;
  onToggleVerified?: () => void;
  minRating?: number;
  onSetMinRating?: (r: number) => void;
  favoritesOnly?: boolean;
  onToggleFavoritesOnly?: () => void;
}

export const SearchHeader = ({
  query, onQueryChange, onSearch, totalResults, categories, onCategoryClick, businesses,
  verifiedOnly, onToggleVerified, minRating = 0, onSetMinRating,
  favoritesOnly, onToggleFavoritesOnly,
}: SearchHeaderProps) => {
  const { t, language, isRTL } = useLanguage();
  const { count: favCount } = useBusinessFavorites();
  const [catsOpen, setCatsOpen] = useState(false);
  const [catsExpanded, setCatsExpanded] = useState(false);

  const quickChips: { key: string; label: string; active: boolean; icon: React.ElementType; onClick: () => void }[] = [
    ...(onToggleVerified ? [{
      key: 'verified',
      label: isRTL ? 'موثقة فقط' : 'Verified only',
      active: !!verifiedOnly,
      icon: BadgeCheck,
      onClick: onToggleVerified,
    }] : []),
    ...(onSetMinRating ? ([5, 4, 3] as const).map((r) => ({
      key: `r${r}`,
      label: `${r}${r === 5 ? '' : '+'}★`,
      active: minRating === r,
      icon: Star,
      onClick: () => onSetMinRating(minRating === r ? 0 : r),
    })) : []),
    ...(onToggleFavoritesOnly && favCount > 0 ? [{
      key: 'fav',
      label: isRTL ? `المفضلة (${favCount})` : `Favorites (${favCount})`,
      active: !!favoritesOnly,
      icon: Heart,
      onClick: onToggleFavoritesOnly,
    }] : []),
  ];

  return (
    <>
      <Navbar />
      <div className="bg-surface-nav pt-20 sm:pt-24 pb-10 sm:pb-14 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, hsl(var(--accent)) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(var(--accent)) 0%, transparent 40%)" }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        
        <div className="container relative z-10 text-center px-3 sm:px-4">
          {/* Title with sparkle */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-surface-nav-foreground animate-fade-in">
              {t('search.page_title')}
            </h1>
          </div>
          <p className="text-surface-nav-foreground/60 font-body mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base">
            {t('search.page_subtitle')}
          </p>

          <SearchAutocomplete
            query={query}
            onQueryChange={onQueryChange}
            onSearch={onSearch}
            businesses={businesses}
            categories={categories}
          />

          {/* Primary decision-flow CTAs — quote request + sectors browse.
              Public-safe routes only; keeps SEO / no-private-link rules. */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="sm" className="rounded-xl h-9 px-4 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/contact">
                <FileText className="w-3.5 h-3.5 me-1.5" />
                {isRTL ? 'اطلب عرض سعر' : 'Request a quote'}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl h-9 px-4 bg-surface-nav-foreground/[0.04] border-surface-nav-foreground/20 text-surface-nav-foreground hover:bg-surface-nav-foreground/[0.08]">
              <Link to="/sectors">
                <Boxes className="w-3.5 h-3.5 me-1.5" />
                {isRTL ? 'استكشف القطاعات' : 'Explore sectors'}
              </Link>
            </Button>
          </div>
          <p className="mt-2 text-[11px] sm:text-xs text-surface-nav-foreground/55 font-body max-w-md mx-auto">
            {isRTL
              ? 'استخدم الفلاتر لتقريب النتائج، ثم قارن قبل التواصل.'
              : 'Use the filters to narrow results, then compare before reaching out.'}
          </p>

          {/* Quick filter chips */}
          {quickChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {quickChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onClick}
                  aria-pressed={chip.active}
                  className={`chip font-heading ${chip.active ? 'chip-selected' : 'bg-surface-nav-foreground/[0.04] text-surface-nav-foreground/85 border border-surface-nav-foreground/15 hover:bg-accent/15 hover:border-accent/40 hover:text-accent'}`}
                >
                  <chip.icon className={`w-3.5 h-3.5 ${chip.key === 'fav' && chip.active ? 'fill-accent-foreground' : ''}`} />
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Categories — collapsible: single horizontal scroll line by default */}
          {categories && categories.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <button
                type="button"
                onClick={() => setCatsOpen(v => !v)}
                aria-expanded={catsOpen}
                className="mx-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-nav-foreground/[0.06] border border-surface-nav-foreground/15 text-surface-nav-foreground/85 hover:bg-accent/15 hover:border-accent/40 hover:text-accent transition-all text-[11px] sm:text-xs font-body"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {isRTL ? 'التخصصات' : 'Specialties'}
                <span className="text-[10px] opacity-70 tech-content">({categories.length})</span>
                {catsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {catsOpen && (
                <div className="mt-3 animate-fade-in">
                  <div
                    className={
                      catsExpanded
                        ? 'flex flex-wrap items-center justify-center gap-1.5 sm:gap-2'
                        : 'flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 snap-x snap-mandatory scroll-px-4'
                    }
                  >
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => onCategoryClick?.(c.id)}
                        className="shrink-0 snap-start px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-body text-surface-nav-foreground/80 border border-surface-nav-foreground/15 hover:bg-accent/15 hover:border-accent/40 hover:text-accent active:scale-95 transition-all duration-200 backdrop-blur-sm whitespace-nowrap"
                      >
                        {language === 'ar' ? c.name_ar : c.name_en}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setCatsExpanded(v => !v)}
                      className="text-[10px] sm:text-[11px] font-body text-surface-nav-foreground/65 hover:text-accent inline-flex items-center gap-1"
                    >
                      {catsExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          {isRTL ? 'سطر واحد' : 'Single line'}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          {isRTL ? 'عرض الكل' : 'Show all'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results badge with pulse effect */}
          {totalResults > 0 && (
            <div className="mt-4 sm:mt-5">
              <Badge variant="secondary" className="bg-accent/20 text-surface-nav-foreground border-accent/30 font-body text-xs sm:text-sm px-3 sm:px-4 py-1 gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {totalResults.toLocaleString()} {t('search.results')}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
