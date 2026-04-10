import { useLanguage } from '@/i18n/LanguageContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { Search as SearchIcon, X } from 'lucide-react';

interface SearchHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  totalResults: number;
  categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
  onCategoryClick?: (id: string) => void;
}

export const SearchHeader = ({ query, onQueryChange, totalResults, categories, onCategoryClick }: SearchHeaderProps) => {
  const { t, language } = useLanguage();

  return (
    <>
      <Navbar />
      <div className="bg-gradient-to-b from-primary to-primary/90 pt-24 pb-14 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, hsl(42 85% 55%) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(42 85% 55%) 0%, transparent 40%)" }} />
        <div className="container relative z-10 text-center">
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-primary-foreground mb-2 animate-fade-in">
            {t('search.page_title')}
          </h1>
          <p className="text-primary-foreground/60 font-body mb-8 max-w-xl mx-auto">
            {t('search.page_subtitle')}
          </p>

          {/* Search Input */}
          <div className="max-w-2xl mx-auto relative group">
            <SearchIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
            <Input
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder={t('search.placeholder')}
              className="ps-12 pe-12 h-14 rounded-2xl bg-card text-foreground border-0 text-base shadow-lg shadow-primary/20 focus-visible:ring-accent/50 placeholder:text-muted-foreground/60"
            />
            {query && (
              <button
                onClick={() => onQueryChange('')}
                className="absolute end-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Quick category chips */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => onCategoryClick?.(c.id)}
                  className="px-4 py-1.5 rounded-full text-xs font-body text-primary-foreground/80 border border-primary-foreground/20 hover:bg-primary-foreground/10 hover:border-accent/50 hover:text-accent transition-all duration-200"
                >
                  {language === 'ar' ? c.name_ar : c.name_en}
                </button>
              ))}
            </div>
          )}

          {/* Result count badge */}
          {totalResults > 0 && (
            <div className="mt-5">
              <Badge variant="secondary" className="bg-accent/20 text-primary-foreground border-accent/30 font-body text-sm px-4 py-1">
                {totalResults} {t('search.results')}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
