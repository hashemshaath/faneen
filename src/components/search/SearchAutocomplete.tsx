import { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, X, TrendingUp, Clock } from 'lucide-react';

interface SearchAutocompleteProps {
  query: string;
  onQueryChange: (q: string) => void;
  businesses?: any[];
  categories?: { id: string; name_ar: string; name_en: string }[];
}

export const SearchAutocomplete = ({ query, onQueryChange, businesses, categories }: SearchAutocompleteProps) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    const results: { type: 'business' | 'category'; label: string; id: string }[] = [];

    categories?.forEach(c => {
      const name = language === 'ar' ? c.name_ar : c.name_en;
      if (name.toLowerCase().includes(q)) {
        results.push({ type: 'category', label: name, id: c.id });
      }
    });

    businesses?.slice(0, 100).forEach(b => {
      const name = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
      if (name.toLowerCase().includes(q)) {
        results.push({ type: 'business', label: name, id: b.username });
      }
    });

    return results.slice(0, 6);
  }, [query, businesses, categories, language]);

  const trendingSearches = language === 'ar'
    ? ['نوافذ ألمنيوم', 'أبواب حديد', 'زجاج سيكوريت', 'مطابخ']
    : ['Aluminum windows', 'Iron doors', 'Securit glass', 'Kitchens'];

  const showDropdown = inputFocused && (suggestions.length > 0 || (!query && trendingSearches.length > 0));

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto relative group">
      <SearchIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-accent z-10" />
      <Input
        value={query}
        onChange={e => { onQueryChange(e.target.value); setIsOpen(true); }}
        onFocus={() => { setInputFocused(true); setIsOpen(true); }}
        onBlur={() => setTimeout(() => setInputFocused(false), 200)}
        placeholder={t('search.placeholder')}
        className="ps-12 pe-12 h-14 rounded-2xl bg-card text-foreground border-0 text-base shadow-lg shadow-primary/20 focus-visible:ring-accent/50 placeholder:text-muted-foreground/60"
      />
      {query && (
        <button
          onClick={() => onQueryChange('')}
          className="absolute end-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors z-10"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && isOpen && (
        <div className="absolute top-full mt-2 inset-x-0 bg-card rounded-2xl border border-border shadow-xl overflow-hidden z-50 animate-fade-in">
          {suggestions.length > 0 ? (
            <div className="py-2">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.type}-${s.id}-${i}`}
                  onMouseDown={() => {
                    if (s.type === 'business') {
                      window.location.href = `/${s.id}`;
                    } else {
                      onQueryChange(s.label);
                    }
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-start"
                >
                  <SearchIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground font-body">{s.label}</span>
                  <span className="text-[10px] text-muted-foreground ms-auto bg-muted px-2 py-0.5 rounded-full">
                    {s.type === 'category' ? (language === 'ar' ? 'قسم' : 'Category') : (language === 'ar' ? 'مزود' : 'Provider')}
                  </span>
                </button>
              ))}
            </div>
          ) : !query ? (
            <div className="py-3 px-4">
              <p className="text-xs text-muted-foreground font-body mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {language === 'ar' ? 'عمليات بحث رائجة' : 'Trending searches'}
              </p>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map(term => (
                  <button
                    key={term}
                    onMouseDown={() => { onQueryChange(term); setIsOpen(false); }}
                    className="text-xs bg-muted hover:bg-accent/10 text-foreground px-3 py-1.5 rounded-full transition-colors font-body"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
