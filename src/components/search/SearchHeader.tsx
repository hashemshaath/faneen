import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { SearchAutocomplete } from './SearchAutocomplete';

interface SearchHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  totalResults: number;
  categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
  onCategoryClick?: (id: string) => void;
  businesses?: any[];
}

export const SearchHeader = ({ query, onQueryChange, totalResults, categories, onCategoryClick, businesses }: SearchHeaderProps) => {
  const { t, language } = useLanguage();

  return (
    <>
      <Navbar />
      <div className="bg-surface-nav pt-24 pb-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, hsl(42 85% 55%) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(42 85% 55%) 0%, transparent 40%)" }} />
        <div className="container relative z-10 text-center">
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-surface-nav-foreground mb-2 animate-fade-in">
            {t('search.page_title')}
          </h1>
          <p className="text-surface-nav-foreground/60 font-body mb-8 max-w-xl mx-auto">
            {t('search.page_subtitle')}
          </p>

          <SearchAutocomplete
            query={query}
            onQueryChange={onQueryChange}
            businesses={businesses}
            categories={categories}
          />

          {categories && categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => onCategoryClick?.(c.id)}
                  className="px-4 py-1.5 rounded-full text-xs font-body text-surface-nav-foreground/80 border border-surface-nav-foreground/20 hover:bg-surface-nav-foreground/10 hover:border-accent/50 hover:text-accent transition-all duration-200"
                >
                  {language === 'ar' ? c.name_ar : c.name_en}
                </button>
              ))}
            </div>
          )}

          {totalResults > 0 && (
            <div className="mt-5">
              <Badge variant="secondary" className="bg-accent/20 text-surface-nav-foreground border-accent/30 font-body text-sm px-4 py-1">
                {totalResults} {t('search.results')}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
