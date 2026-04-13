import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, X, TrendingUp, Clock, Trash2 } from 'lucide-react';
import {
  getSearchHistory,
  addToSearchHistory,
  removeFromSearchHistory,
  clearSearchHistory,
} from '@/services/search/useSearch';

interface SearchAutocompleteProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch?: (q: string) => void;
  businesses?: any[];
  categories?: { id: string; name_ar: string; name_en: string }[];
}

export const SearchAutocomplete = ({ query, onQueryChange, onSearch, businesses, categories }: SearchAutocompleteProps) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load history on focus
  useEffect(() => {
    if (inputFocused) setHistory(getSearchHistory());
  }, [inputFocused]);

  // Close on outside click
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
    const results: { type: 'business' | 'category' | 'history'; label: string; id: string }[] = [];

    // History matches first
    history.forEach(h => {
      if (h.toLowerCase().includes(q) && h !== query) {
        results.push({ type: 'history', label: h, id: `h-${h}` });
      }
    });

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

    return results.slice(0, 8);
  }, [query, businesses, categories, language, history]);

  // Build flat items list for keyboard nav
  const allItems = useMemo(() => {
    if (suggestions.length > 0) return suggestions;
    if (!query) {
      const trendingSearches = language === 'ar'
        ? ['نوافذ ألمنيوم', 'أبواب حديد', 'زجاج سيكوريت', 'مطابخ']
        : ['Aluminum windows', 'Iron doors', 'Securit glass', 'Kitchens'];
      const items: { type: 'history' | 'trending'; label: string; id: string }[] = [];
      history.slice(0, 5).forEach(h => items.push({ type: 'history', label: h, id: `h-${h}` }));
      trendingSearches.forEach(t => items.push({ type: 'trending', label: t, id: `t-${t}` }));
      return items;
    }
    return [];
  }, [suggestions, query, history, language]);

  const showDropdown = inputFocused && allItems.length > 0;

  // Reset active index when items change
  useEffect(() => { setActiveIndex(-1); }, [allItems.length]);

  const handleSelect = useCallback((item: typeof allItems[0]) => {
    if (item.type === 'business') {
      window.location.href = `/${item.id}`;
    } else {
      addToSearchHistory(item.label);
      onQueryChange(item.label);
      onSearch?.(item.label);
    }
    setIsOpen(false);
  }, [onQueryChange, onSearch]);

  const handleSubmit = useCallback(() => {
    if (activeIndex >= 0 && activeIndex < allItems.length) {
      handleSelect(allItems[activeIndex]);
    } else if (query.trim()) {
      addToSearchHistory(query.trim());
      onSearch?.(query.trim());
      setIsOpen(false);
    }
  }, [activeIndex, allItems, handleSelect, query, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'Enter') { handleSubmit(); return; }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % allItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev <= 0 ? allItems.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();
        handleSubmit();
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }, [showDropdown, allItems.length, handleSubmit]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleRemoveHistory = useCallback((e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    e.preventDefault();
    removeFromSearchHistory(term);
    setHistory(getSearchHistory());
  }, []);

  const handleClearHistory = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    clearSearchHistory();
    setHistory([]);
  }, []);

  const typeLabel = (type: string) => {
    if (type === 'category') return language === 'ar' ? 'قسم' : 'Category';
    if (type === 'business') return language === 'ar' ? 'مزود' : 'Provider';
    return '';
  };

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto relative group" role="combobox" aria-expanded={showDropdown} aria-haspopup="listbox">
      <SearchIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-accent z-10" />
      <Input
        value={query}
        onChange={e => { onQueryChange(e.target.value); setIsOpen(true); }}
        onFocus={() => { setInputFocused(true); setIsOpen(true); }}
        onBlur={() => setTimeout(() => setInputFocused(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        className="ps-12 pe-12 h-14 rounded-2xl bg-card text-foreground border-0 text-base shadow-lg shadow-primary/20 focus-visible:ring-accent/50 placeholder:text-muted-foreground/60"
        role="searchbox"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `search-item-${activeIndex}` : undefined}
      />
      {query && (
        <button
          onClick={() => onQueryChange('')}
          className="absolute end-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors z-10"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && isOpen && (
        <div
          className="absolute top-full mt-2 inset-x-0 bg-card rounded-2xl border border-border shadow-xl overflow-hidden z-50 animate-fade-in max-h-[360px] overflow-y-auto"
          role="listbox"
          ref={listRef}
        >
          {/* History header when no query */}
          {!query && history.length > 0 && (
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <p className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {language === 'ar' ? 'عمليات بحث سابقة' : 'Recent searches'}
              </p>
              <button
                onMouseDown={handleClearHistory}
                className="text-[10px] text-destructive hover:underline font-body"
              >
                {language === 'ar' ? 'مسح الكل' : 'Clear all'}
              </button>
            </div>
          )}

          {allItems.map((item, i) => {
            const isHistory = item.type === 'history';
            const isTrending = (item as Record<string, string>).type === 'trending';
            
            // Show trending header
            if (isTrending && i === history.filter(() => !query).length) {
              return (
                <div key={`header-trending`}>
                  <div className="px-4 pt-2 pb-1">
                    <p className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'عمليات بحث رائجة' : 'Trending searches'}
                    </p>
                  </div>
                  <ItemButton
                    item={item}
                    index={i}
                    isActive={activeIndex === i}
                    onSelect={handleSelect}
                    typeLabel=""
                    icon={<TrendingUp className="w-4 h-4 text-accent/60 flex-shrink-0" />}
                  />
                </div>
              );
            }

            return (
              <ItemButton
                key={`${item.type}-${item.id}-${i}`}
                item={item}
                index={i}
                isActive={activeIndex === i}
                onSelect={handleSelect}
                typeLabel={typeLabel(item.type)}
                icon={
                  isHistory
                    ? <Clock className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                    : isTrending
                    ? <TrendingUp className="w-4 h-4 text-accent/60 flex-shrink-0" />
                    : <SearchIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
                endAction={isHistory ? (
                  <button
                    onMouseDown={(e) => handleRemoveHistory(e, item.label)}
                    className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    aria-label="Remove from history"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                ) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Item Button ───────────────────────────────────────
const ItemButton = ({
  item, index, isActive, onSelect, typeLabel, icon, endAction,
}: {
  item: { type: string; label: string; id: string };
  index: number;
  isActive: boolean;
  onSelect: (item) => void;
  typeLabel: string;
  icon: React.ReactNode;
  endAction?: React.ReactNode;
}) => (
  <div
    id={`search-item-${index}`}
    role="option"
    aria-selected={isActive}
    onMouseDown={() => onSelect(item)}
    className={`group/item w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors text-start ${
      isActive ? 'bg-accent/10 text-accent' : 'hover:bg-muted/50 text-foreground'
    }`}
  >
    {icon}
    <span className="text-sm font-body truncate flex-1">{item.label}</span>
    {typeLabel && (
      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
        {typeLabel}
      </span>
    )}
    {endAction}
  </div>
);
