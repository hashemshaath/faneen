import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Footer } from '@/components/layout/Footer';
import { SearchHeader } from '@/components/search/SearchHeader';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults, type ViewMode } from '@/components/search/SearchResults';
import { ActiveFilterChips } from '@/components/search/ActiveFilterChips';
import { RecentlyViewedStrip } from '@/components/search/RecentlyViewedStrip';
import { SavedSearchesBar } from '@/components/search/SavedSearchesBar';
import { SearchInsightsBar } from '@/components/search/SearchInsightsBar';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  useDebouncedValue,
  useCategories,
  useCities,
  useBusinesses,
  useEntityTags,
  filterAndSort,
  getDidYouMean,
  addToSearchHistory,
  defaultFilters,
  type SearchFilterValues,
} from '@/services/search';
import { detectSectorFromQuery, getSectorMeta, ALL_SECTORS } from '@/lib/sector-keywords';
import { findCityKeywords, getCityKeywordsString, mergeKeywords } from '@/lib/city-keywords';
import { track } from '@/lib/analytics-events';

const ITEMS_PER_PAGE = 12;

const SearchPage = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const isRTL = language === 'ar';

  // Detect a sector from the query (e.g. "ألمنيوم" → aluminum) and lift its
  // meta into the page so search results inherit sector-specific keywords,
  // OG titles and descriptions.
  const detectedSector = detectSectorFromQuery(searchQuery);
  const sectorMeta = detectedSector ? getSectorMeta(detectedSector, isRTL) : null;

  // Default keyword bag = all sectors (the search hub touches every vertical).
  const allSectorKeywords = ALL_SECTORS.flatMap((s) =>
    isRTL ? s.keywords_ar : s.keywords_en,
  ).slice(0, 24).join(', ');

  const isMobile = useIsMobile();

  const { data: categories } = useCategories();
  const { data: cities } = useCities();
  const { data: businesses, isLoading } = useBusinesses();
  const { data: entityTags } = useEntityTags();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  React.useEffect(() => {
    const urlQ = searchParams.get('q') || '';
    if (urlQ !== query) setQuery(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('q')]);
  const debouncedQuery = useDebouncedValue(query, 300);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  // Collapsed by default on mobile to avoid covering results; desktop CSS keeps the sidebar visible.
  const [showFilters, setShowFilters] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(searchParams.get('fav') === '1');

  const [filters, setFilters] = useState<SearchFilterValues>({
    categoryId: searchParams.get('category') || 'all',
    cityId: searchParams.get('city') || 'all',
    minRating: Number(searchParams.get('rating')) || 0,
    verifiedOnly: searchParams.get('verified') === 'true',
    sortBy: (searchParams.get('sort') as SearchFilterValues['sortBy']) || 'rating',
    priceMin: Number(searchParams.get('price_min')) || 0,
    priceMax: Number(searchParams.get('price_max')) || 0,
    serviceCategoryId: searchParams.get('serviceCategory') || 'all',
  });

  // Resolve the selected city (from filter or URL) into a localized name and
  // a dedicated keyword bag so meta keywords reflect the user's geo choice.
  const selectedCity = useMemo(() => {
    if (!filters.cityId || filters.cityId === 'all' || !cities) return null;
    return cities.find((c) => c.id === filters.cityId) || null;
  }, [filters.cityId, cities]);

  const cityMeta = useMemo(() => {
    if (!selectedCity) return null;
    const entry =
      findCityKeywords(isRTL ? selectedCity.name_ar : selectedCity.name_en) ||
      findCityKeywords(selectedCity.name_en) ||
      findCityKeywords(selectedCity.name_ar);
    if (!entry) return null;
    return {
      name: isRTL ? entry.name_ar : entry.name_en,
      region: isRTL ? entry.region_ar : entry.region_en,
      keywords: getCityKeywordsString(entry),
    };
  }, [selectedCity, isRTL]);

  // Title segment that surfaces the city in the page title (e.g. "— الرياض").
  const cityTitleSuffix = cityMeta ? (isRTL ? ` — ${cityMeta.name}` : ` — ${cityMeta.name}`) : '';

  usePageMeta({
    title: sectorMeta
      ? (isRTL
          ? `${sectorMeta.name}${cityTitleSuffix} — نتائج "${searchQuery}" | قِطاعات`
          : `${sectorMeta.name}${cityTitleSuffix} — results for "${searchQuery}" | Qitaat`)
      : searchQuery
        ? (isRTL ? `نتائج البحث عن "${searchQuery}"${cityTitleSuffix} | قِطاعات` : `Search results for "${searchQuery}"${cityTitleSuffix} | Qitaat`)
        : cityMeta
          ? (isRTL ? `مزودو الخدمات في ${cityMeta.name} | قِطاعات` : `Service providers in ${cityMeta.name} | Qitaat`)
          : (isRTL ? 'البحث عن مزودي خدمات الألمنيوم والحديد والزجاج والخشب والخزائن | قِطاعات' : 'Search Aluminum, Iron, Glass, Wood & Cabinet Providers | Qitaat'),
    description: sectorMeta
      ? (cityMeta
          ? (isRTL
              ? `${sectorMeta.description} — متوفر في ${cityMeta.name} (${cityMeta.region}).`
              : `${sectorMeta.description} — available in ${cityMeta.name} (${cityMeta.region}).`)
          : sectorMeta.description)
      : searchQuery
        ? (isRTL ? `نتائج البحث عن ${searchQuery}${cityMeta ? ` في ${cityMeta.name}` : ''} في دليل قِطاعات` : `Search results for ${searchQuery}${cityMeta ? ` in ${cityMeta.name}` : ''} in Qitaat directory`)
        : cityMeta
          ? (isRTL
              ? `استعرض أفضل مصانع وورش الألمنيوم والحديد والزجاج والخشب والخزائن في ${cityMeta.name} و${cityMeta.region}.`
              : `Browse the best aluminum, iron, glass, wood and cabinet providers in ${cityMeta.name} and the ${cityMeta.region}.`)
          : (isRTL ? 'ابحث عن أفضل مصانع ومحلات الألمنيوم والحديد والزجاج والخشب والخزائن. قارن الأسعار والتقييمات واختر المزود المناسب.' : 'Find the best aluminum, iron, glass, wood and cabinet factories and shops.'),
    keywords: mergeKeywords(
      sectorMeta ? sectorMeta.keywords : allSectorKeywords,
      cityMeta?.keywords,
    ),
    noindex: !!searchQuery,
    // When there's a search query the page is noindex → canonical = bare /search.
    // When there's no query but there are geo/category filters the page IS indexed
    // → canonical must include those filters so Google sees each combination as
    // a distinct indexable page (e.g. /search?city=X&category=Y).
    canonical: (() => {
      if (searchQuery) return 'https://qitaat.com/search'; // noindex anyway
      const cp = new URLSearchParams();
      if (filters.categoryId && filters.categoryId !== 'all') cp.set('category', filters.categoryId);
      if (filters.cityId && filters.cityId !== 'all') cp.set('city', filters.cityId);
      const qs = cp.toString();
      return qs ? `https://qitaat.com/search?${qs}` : 'https://qitaat.com/search';
    })(),
  });

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (q) params.set('q', q); else params.delete('q');
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSearch = useCallback((q: string) => {
    if (q.trim()) addToSearchHistory(q.trim());
  }, []);

  const handleFilterChange = useCallback(<K extends keyof SearchFilterValues>(key: K, value: SearchFilterValues[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    // Privacy-safe: only the filter key name + the count of active filters.
    track.filter({
      // `key` is constrained by SearchFilterValues so it is non-PII.
      category_slug: key === 'categoryId' && value !== 'all' ? String(value) : undefined,
      city: key === 'cityId' && value !== 'all' ? String(value) : undefined,
    });
    const params = new URLSearchParams(searchParams);
    const paramMap: Record<string, string> = {
      categoryId: 'category', cityId: 'city', minRating: 'rating',
      verifiedOnly: 'verified', sortBy: 'sort', priceMin: 'price_min', priceMax: 'price_max',
      serviceCategoryId: 'serviceCategory',
    };
    const paramKey = paramMap[key];
    const defaultVals: Record<string, any> = {
      categoryId: 'all', cityId: 'all', minRating: 0,
      verifiedOnly: false, sortBy: 'rating', priceMin: 0, priceMax: 0,
      serviceCategoryId: 'all',
    };
    if (value === defaultVals[key]) params.delete(paramKey); else params.set(paramKey, String(value));
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCategoryClick = useCallback((id: string) => {
    handleFilterChange('categoryId', filters.categoryId === id ? 'all' : id);
  }, [filters.categoryId, handleFilterChange]);

  const hasActiveFilters = filters.categoryId !== 'all' || filters.cityId !== 'all' || filters.minRating > 0 || filters.verifiedOnly || filters.priceMin > 0 || filters.priceMax > 0 || filters.serviceCategoryId !== 'all';

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultFilters });
    setQuery('');
    setCurrentPage(1);
    setSelectedTags([]);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const filtered = useMemo(() => {
    if (!businesses) return [];
    let res = filterAndSort(businesses, debouncedQuery, filters, selectedTags, entityTags, language, categories);
    if (favoritesOnly) {
      try {
        const raw = localStorage.getItem('qitaat_fav_businesses_v1');
        const ids: string[] = raw ? JSON.parse(raw) : [];
        const set = new Set(ids);
        res = res.filter((b: { id: string }) => set.has(b.id));
      } catch {
        /* ignore */
      }
    }
    return res;
  }, [businesses, debouncedQuery, filters, language, selectedTags, entityTags, favoritesOnly, categories]);

  // Defer the heavy filtered list so typing/filter clicks stay responsive.
  const deferredFiltered = useDeferredValue(filtered);
  const isPending = deferredFiltered !== filtered;

  // search_performed — fires when the (debounced) query settles. The actual
  // query text is intentionally NOT sent (could contain PII / private intent).
  React.useEffect(() => {
    if (!debouncedQuery.trim()) return;
    const activeFilters = [
      filters.categoryId !== 'all',
      filters.cityId !== 'all',
      filters.minRating > 0,
      filters.verifiedOnly,
      filters.priceMin > 0,
      filters.priceMax > 0,
    ].filter(Boolean).length + selectedTags.length;
    track.search({
      results_count: filtered.length,
      filters_count: activeFilters,
      sector: detectedSector || undefined,
      city: cityMeta?.name,
    });
    // Only re-fire when the debounced query or result count meaningfully changes.
  }, [debouncedQuery, filtered.length, detectedSector, cityMeta?.name, filters, selectedTags.length]);

  // Consolidated JSON-LD: BreadcrumbList + WebSite/SearchAction + ItemList of
  // the top providers (when results exist). All keywords carry sector context
  // so Google can map the page to the right vertical.
  useMultiJsonLd(useMemo(() => {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'قِطاعات', item: 'https://qitaat.com' },
        { '@type': 'ListItem', position: 2, name: isRTL ? 'البحث' : 'Search', item: 'https://qitaat.com/search' },
        ...(sectorMeta
          ? [{ '@type': 'ListItem', position: 3, name: sectorMeta.name, item: `https://qitaat.com/search?q=${encodeURIComponent(sectorMeta.name)}` }]
          : []),
      ],
    };
    const website = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: 'https://qitaat.com',
      name: 'قِطاعات Qitaat',
      inLanguage: isRTL ? 'ar' : 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://qitaat.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
      keywords: sectorMeta ? sectorMeta.keywords : allSectorKeywords,
    };
    const blocks: Record<string, unknown>[] = [breadcrumb, website];
    if (filtered && filtered.length > 0) {
      const top = filtered.slice(0, 10);
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: sectorMeta
          ? (isRTL ? `أفضل مزودي ${sectorMeta.name}` : `Top ${sectorMeta.name} providers`)
          : (isRTL ? 'أفضل مزودي الخدمات' : 'Top service providers'),
        numberOfItems: top.length,
        keywords: sectorMeta ? sectorMeta.keywords : allSectorKeywords,
        itemListElement: top.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://qitaat.com/${b.username}`,
          name: language === 'ar' ? b.name_ar : (b.name_en || b.name_ar),
        })),
      });
    }
    return blocks;
  }, [isRTL, language, sectorMeta, allSectorKeywords, filtered]));

  const didYouMean = useMemo(() => {
    if (!debouncedQuery.trim() || filtered.length > 0 || !businesses) return null;
    const allNames = businesses.map(b => language === 'ar' ? b.name_ar : (b.name_en || b.name_ar));
    return getDidYouMean(debouncedQuery, allNames);
  }, [debouncedQuery, filtered.length, businesses, language]);

  const totalPages = Math.ceil(deferredFiltered.length / ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    if (viewMode === 'map' || viewMode === 'split') return deferredFiltered;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return deferredFiltered.slice(start, start + ITEMS_PER_PAGE);
  }, [deferredFiltered, currentPage, viewMode]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  }, []);

  const showChips = hasActiveFilters || query.trim() || selectedTags.length > 0;

  // Build a clean querystring representation of the current search (sorted keys for stable equality)
  const currentQs = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (filters.categoryId !== 'all') params.set('category', filters.categoryId);
    if (filters.cityId !== 'all') params.set('city', filters.cityId);
    if (filters.minRating > 0) params.set('rating', String(filters.minRating));
    if (filters.verifiedOnly) params.set('verified', 'true');
    if (filters.sortBy && filters.sortBy !== 'rating') params.set('sort', filters.sortBy);
    if (filters.priceMin > 0) params.set('price_min', String(filters.priceMin));
    if (filters.priceMax > 0) params.set('price_max', String(filters.priceMax));
    if (filters.serviceCategoryId && filters.serviceCategoryId !== 'all') params.set('serviceCategory', filters.serviceCategoryId);
    if (favoritesOnly) params.set('fav', '1');
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    // Stable order
    const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    return new URLSearchParams(sorted).toString();
  }, [query, filters, favoritesOnly, selectedTags]);

  // Friendly auto-name: "ألمنيوم — الرياض — 4★" / "ألومنيوم — Riyadh — Verified"
  const suggestedName = useMemo(() => {
    const parts: string[] = [];
    if (query.trim()) parts.push(`"${query.trim()}"`);
    if (filters.categoryId !== 'all' && categories) {
      const cat = categories.find((c) => c.id === filters.categoryId);
      if (cat) parts.push(isRTL ? cat.name_ar : (cat.name_en || cat.name_ar));
    }
    if (filters.cityId !== 'all' && cities) {
      const city = cities.find((c) => c.id === filters.cityId);
      if (city) parts.push(isRTL ? city.name_ar : (city.name_en || city.name_ar));
    }
    if (filters.minRating > 0) parts.push(`${filters.minRating}★`);
    if (filters.verifiedOnly) parts.push(isRTL ? 'موثّق' : 'Verified');
    if (favoritesOnly) parts.push(isRTL ? 'المفضّلة' : 'Favorites');
    return parts.join(' — ') || (isRTL ? 'بحث محفوظ' : 'Saved search');
  }, [query, filters, categories, cities, favoritesOnly, isRTL]);

  const handleApplySavedSearch = useCallback((qs: string) => {
    const sp = new URLSearchParams(qs);
    const next: SearchFilterValues = {
      categoryId: sp.get('category') || 'all',
      cityId: sp.get('city') || 'all',
      minRating: Number(sp.get('rating')) || 0,
      verifiedOnly: sp.get('verified') === 'true',
      sortBy: (sp.get('sort') as SearchFilterValues['sortBy']) || 'rating',
      priceMin: Number(sp.get('price_min')) || 0,
      priceMax: Number(sp.get('price_max')) || 0,
      serviceCategoryId: sp.get('serviceCategory') || 'all',
    };
    setFilters(next);
    setQuery(sp.get('q') || '');
    setFavoritesOnly(sp.get('fav') === '1');
    const tags = sp.get('tags');
    setSelectedTags(tags ? tags.split(',').filter(Boolean) : []);
    setCurrentPage(1);
    setSearchParams(sp, { replace: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  // Keyboard hotkeys: "/" focuses the header search input; "Escape" clears all
  // filters when something is active. Ignored while typing in inputs.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (t?.isContentEditable ?? false);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const input = document.querySelector<HTMLInputElement>('header input[type="search"], header input[type="text"]');
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
      } else if (e.key === 'Escape' && !typing && (hasActiveFilters || query.trim() || selectedTags.length > 0)) {
        clearFilters();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasActiveFilters, query, selectedTags.length, clearFilters]);

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader
        query={query}
        onQueryChange={handleQueryChange}
        onSearch={handleSearch}
        totalResults={deferredFiltered.length}
        categories={categories}
        onCategoryClick={handleCategoryClick}
        businesses={businesses}
        verifiedOnly={filters.verifiedOnly}
        onToggleVerified={() => handleFilterChange('verifiedOnly', !filters.verifiedOnly)}
        minRating={filters.minRating}
        onSetMinRating={(r) => handleFilterChange('minRating', r)}
        favoritesOnly={favoritesOnly}
        onToggleFavoritesOnly={() => {
          const next = !favoritesOnly;
          setFavoritesOnly(next);
          setCurrentPage(1);
          const params = new URLSearchParams(searchParams);
          if (next) params.set('fav', '1'); else params.delete('fav');
          setSearchParams(params, { replace: true });
        }}
      />

      <div className="container-app page-shell">
        {/* Active filter chips */}
        {showChips && (
          <ActiveFilterChips
            filters={filters}
            query={query}
            selectedTags={selectedTags}
            categories={categories}
            cities={cities}
            onFilterChange={handleFilterChange}
            onQueryChange={handleQueryChange}
            onClearTag={(tagId) => {
              setSelectedTags(prev => prev.filter(t => t !== tagId));
              setCurrentPage(1);
            }}
            onClearAll={clearFilters}
          />
        )}

        <SavedSearchesBar
          currentQs={currentQs}
          suggestedName={suggestedName}
          hasContext={!!showChips}
          totalResults={deferredFiltered.length}
          onApply={handleApplySavedSearch}
        />

        <SearchInsightsBar
          businesses={deferredFiltered}
          totalDirectory={businesses?.length ?? 0}
        />

        <RecentlyViewedStrip businesses={businesses} />

        <div className="flex flex-col lg:flex-row gap-5 sm:gap-6">
          <SearchFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            categories={categories}
            cities={cities}
            hasActiveFilters={hasActiveFilters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            selectedTags={selectedTags}
            onToggleTag={(tagId) => {
              setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
              setCurrentPage(1);
            }}
            onClearTags={() => { setSelectedTags([]); setCurrentPage(1); }}
          />
          <SearchResults
            businesses={paginatedResults}
            isLoading={isLoading || (isPending && deferredFiltered.length === 0)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalCount={deferredFiltered.length}
            onClearFilters={clearFilters}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
            didYouMean={didYouMean}
            onDidYouMeanClick={(term) => handleQueryChange(term)}
            sortBy={filters.sortBy}
            onSortChange={(s) => handleFilterChange('sortBy', s)}
            directoryIsEmpty={!isLoading && (businesses?.length ?? 0) === 0}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SearchPage;
