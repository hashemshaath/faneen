import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { SearchAutocomplete } from './SearchAutocomplete';
import { Sparkles, TrendingUp } from 'lucide-react';

interface SearchHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch?: (q: string) => void;
  totalResults: number;
  categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
  onCategoryClick?: (id: string) => void;
  businesses?: any[];
}

export const SearchHeader = ({ query, onQueryChange, onSearch, totalResults, categories, onCategoryClick, businesses }: SearchHeaderProps) => {
  const { t, language, isRTL } = useLanguage();

  return (
    <>
      <Navbar />
      <div className="bg-surface-nav pt-20 sm:pt-24 pb-10 sm:pb-14 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, hsl(42 85% 55%) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(42 85% 55%) 0%, transparent 40%)" }} />
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

          {/* Category pills with scroll indicator */}
          {categories && categories.length > 0 && (
            <div className="mt-5 sm:mt-7">
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onCategoryClick?.(c.id)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-body text-surface-nav-foreground/80 border border-surface-nav-foreground/15 hover:bg-accent/15 hover:border-accent/40 hover:text-accent active:scale-95 transition-all duration-200 backdrop-blur-sm"
                  >
                    {language === 'ar' ? c.name_ar : c.name_en}
                  </button>
                ))}
              </div>
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
