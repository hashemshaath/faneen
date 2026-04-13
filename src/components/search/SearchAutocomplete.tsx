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

/* ── Industry-specific default suggestions ── */
const industryDefaults = [
  { label_ar: 'مصانع ألمنيوم في الرياض', label_en: 'Aluminum factories in Riyadh', category_ar: 'ألمنيوم', category_en: 'Aluminum', icon: '🪟' },
  { label_ar: 'تركيب نوافذ ألمنيوم', label_en: 'Aluminum window installation', category_ar: 'ألمنيوم', category_en: 'Aluminum', icon: '🪟' },
  { label_ar: 'بوابات حديدية', label_en: 'Iron gates', category_ar: 'حديد وستيل', category_en: 'Iron & Steel', icon: '⚙️' },
  { label_ar: 'مطابخ خشبية', label_en: 'Wooden kitchens', category_ar: 'خشب', category_en: 'Wood', icon: '🪵' },
  { label_ar: 'واجهات زجاجية', label_en: 'Glass facades', category_ar: 'زجاج', category_en: 'Glass', icon: '🔷' },
  { label_ar: 'مظلات ألمنيوم', label_en: 'Aluminum canopies', category_ar: 'ألمنيوم', category_en: 'Aluminum', icon: '🌂' },
  { label_ar: 'درابزين حديد', label_en: 'Iron railings', category_ar: 'حديد وستيل', category_en: 'Iron & Steel', icon: '⚙️' },
  { label_ar: 'أبواب خشبية داخلية', label_en: 'Interior wooden doors', category_ar: 'خشب', category_en: 'Wood', icon: '🚪' },
];

interface SearchAutocompleteProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch?: (q: string) => void;
  businesses?: any[];
  categories?: { id: string; name_ar: string; name_en: string }[];
}

export const SearchAutocomplete = ({ query, onQueryChange, onSearch, businesses, categories }: SearchAutocompleteProps) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputFocused) setHistory(getSearchHistory());
  }, [inputFocused]);

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
    const results: { type: 'business' | 'category' | 'history' | 'industry'; label: string; id: string; icon?: string; category?: string }[] = [];

    // History matches
    history.forEach(h => {
      if (h.toLowerCase().includes(q) && h !== query) {
        results.push({ type: 'history', label: h, id: `h-${h}` });
      }
    });

    // Industry suggestions matching query
    industryDefaults.forEach((ind, idx) => {
      const label = isAr ? ind.label_ar : ind.label_en;
      if (label.toLowerCase().includes(q)) {
        results.push({ type: 'industry', label, id: `ind-${idx}`, icon: ind.icon, category: isAr ? ind.category_ar : ind.category_en });
      }
    });

    categories?.forEach(c => {
      const name = isAr ? c.name_ar : c.name_en;
      if (name.toLowerCase().includes(q)) {
        results.push({ type: 'category', label: name, id: c.id });
      }
    });

    businesses?.slice(0, 100).forEach(b => {
      const name = isAr ? b.name_ar : (b.name_en || b.name_ar);
      if (name.toLowerCase().includes(q)) {
        results.push({ type: 'business', label: name, id: b.username });
      }
    });

    return results.slice(0, 10);
  }, [query, businesses, categories, isAr, history]);

  // Build flat items list for keyboard nav + empty state
  const allItems = useMemo(() => {
    if (suggestions.length > 0) return suggestions;
    if (!query) {
      const items: { type: string; label: string; id: string; icon?: string; category?: string }[] = [];
      // Recent history
      history.slice(0, 5).forEach(h => items.push({ type: 'history', label: h, id: `h-${h}` }));
      // Industry trending grouped by category
      industryDefaults.forEach((ind, idx) => {
        items.push({
          type: 'trending',
          label: isAr ? ind.label_ar : ind.label_en,
          id: `t-${idx}`,
          icon: ind.icon,
          category: isAr ? ind.category_ar : ind.category_en,
        });
      });
      return items;
    }
    return [];
  }, [suggestions, query, history, isAr]);

  const showDropdown = inputFocused && allItems.length > 0;

  useEffect(() => { setActiveIndex(-1); }, [allItems.length]);

  const handleSelect = useCallback((item: { type: string; label: string; id: string }) => {
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
    if (type === 'category') return isAr ? 'قسم' : 'Category';
    if (type === 'business') return isAr ? 'مزود' : 'Provider';
    return '';
  };

  // Group trending items by category for empty-state display
  const trendingGroups = useMemo(() => {
    if (query || suggestions.length > 0) return null;
    const trending = allItems.filter(i => i.type === 'trending');
    const groups: Record<string, typeof trending> = {};
    trending.forEach(t => {
      const cat = t.category || (isAr ? 'أخرى' : 'Other');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, [allItems, query, suggestions.length, isAr]);

  // Flat index counter for keyboard nav across grouped items
  let flatIndex = !query ? history.filter(() => true).slice(0, 5).length : 0;

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
          className="absolute top-full mt-2 inset-x-0 bg-card rounded-2xl border border-border shadow-xl overflow-hidden z-50 animate-fade-in max-h-[420px] overflow-y-auto"
          role="listbox"
          ref={listRef}
        >
          {/* ─── When query is empty: show history + grouped industry trending ─── */}
          {!query && (
            <>
              {/* History section */}
              {history.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <p className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {isAr ? 'عمليات بحث سابقة' : 'Recent searches'}
                    </p>
                    <button
                      onMouseDown={handleClearHistory}
                      className="text-[10px] text-destructive hover:underline font-body"
                    >
                      {isAr ? 'مسح الكل' : 'Clear all'}
                    </button>
                  </div>
                  {history.slice(0, 5).map((h, i) => (
                    <ItemButton
                      key={`h-${h}`}
                      item={{ type: 'history', label: h, id: `h-${h}` }}
                      index={i}
                      isActive={activeIndex === i}
                      onSelect={handleSelect}
                      typeLabel=""
                      icon={<Clock className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />}
                      endAction={
                        <button
                          onMouseDown={(e) => handleRemoveHistory(e, h)}
                          className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                          aria-label="Remove from history"
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      }
                    />
                  ))}
                </>
              )}

              {/* Trending grouped by category */}
              {trendingGroups && (
                <>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {isAr ? 'الأكثر بحثاً' : 'Most searched'}
                    </p>
                  </div>
                  {Object.entries(trendingGroups).map(([category, items]) => (
                    <div key={category}>
                      <div className="px-4 py-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider border-b border-border/40 pb-1">
                          {category}
                        </p>
                      </div>
                      {items.map((item) => {
                        const idx = allItems.indexOf(item);
                        return (
                          <ItemButton
                            key={item.id}
                            item={item}
                            index={idx}
                            isActive={activeIndex === idx}
                            onSelect={handleSelect}
                            typeLabel=""
                            icon={<span className="text-sm flex-shrink-0">{item.icon}</span>}
                          />
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {/* ─── When query has results ─── */}
          {query && suggestions.length > 0 && (() => {
            // Group industry suggestions by category, render others inline
            const industryItems = suggestions.filter(s => s.type === 'industry');
            const otherItems = suggestions.filter(s => s.type !== 'industry');
            const industryGroups: Record<string, typeof industryItems> = {};
            industryItems.forEach(item => {
              const cat = item.category || (isAr ? 'أخرى' : 'Other');
              if (!industryGroups[cat]) industryGroups[cat] = [];
              industryGroups[cat].push(item);
            });

            return (
              <>
                {/* Non-industry items first */}
                {otherItems.map((item, i) => {
                  const idx = suggestions.indexOf(item);
                  return (
                    <ItemButton
                      key={`${item.type}-${item.id}`}
                      item={item}
                      index={idx}
                      isActive={activeIndex === idx}
                      onSelect={handleSelect}
                      typeLabel={typeLabel(item.type)}
                      icon={
                        item.type === 'history'
                          ? <Clock className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                          : <SearchIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      }
                      endAction={item.type === 'history' ? (
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

                {/* Industry items grouped */}
                {Object.entries(industryGroups).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-4 py-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider border-b border-border/40 pb-1">
                        {category}
                      </p>
                    </div>
                    {items.map(item => {
                      const idx = suggestions.indexOf(item);
                      return (
                        <ItemButton
                          key={item.id}
                          item={item}
                          index={idx}
                          isActive={activeIndex === idx}
                          onSelect={handleSelect}
                          typeLabel=""
                          icon={<span className="text-sm flex-shrink-0">{item.icon}</span>}
                        />
                      );
                    })}
                  </div>
                ))}
              </>
            );
          })()}
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
  onSelect: (item: { type: string; label: string; id: string }) => void;
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
