import React, { useState, useMemo, useCallback } from 'react';
import { usePageMeta, useJsonLd } from '@/hooks/usePageMeta';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Footer } from '@/components/layout/Footer';
import { SearchHeader } from '@/components/search/SearchHeader';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults, type ViewMode } from '@/components/search/SearchResults';
import { ActiveFilterChips } from '@/components/search/ActiveFilterChips';
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

const ITEMS_PER_PAGE = 12;

const SearchPage = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';

  usePageMeta({
    title: searchQuery
      ? (language === 'ar' ? `نتائج البحث عن "${searchQuery}" | فنيين` : `Search results for "${searchQuery}" | Faneen`)
      : (language === 'ar' ? 'البحث عن مزودي خدمات الألمنيوم والحديد | فنيين' : 'Search Aluminum & Iron Service Providers | Faneen'),
    description: searchQuery
      ? (language === 'ar' ? `نتائج البحث عن ${searchQuery} في دليل فنيين للصناعات الخفيفة` : `Search results for ${searchQuery} in Faneen directory`)
      : (language === 'ar' ? 'ابحث عن أفضل مصانع ومحلات الألمنيوم والحديد والزجاج والخشب. قارن الأسعار والتقييمات واختر المزود المناسب.' : 'Find the best aluminum, iron, glass and wood factories and shops.'),
    noindex: !!searchQuery,
  });

  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'فنيين', item: 'https://faneen.com' },
      { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'البحث' : 'Search', item: 'https://faneen.com/search' },
    ],
  }), [language]));

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
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [filters, setFilters] = useState<SearchFilterValues>({
    categoryId: searchParams.get('category') || 'all',
    cityId: searchParams.get('city') || 'all',
    minRating: Number(searchParams.get('rating')) || 0,
    verifiedOnly: searchParams.get('verified') === 'true',
    sortBy: (searchParams.get('sort') as SearchFilterValues['sortBy']) || 'rating',
    priceMin: Number(searchParams.get('price_min')) || 0,
    priceMax: Number(searchParams.get('price_max')) || 0,
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
    const params = new URLSearchParams(searchParams);
    const paramMap: Record<string, string> = {
      categoryId: 'category', cityId: 'city', minRating: 'rating',
      verifiedOnly: 'verified', sortBy: 'sort', priceMin: 'price_min', priceMax: 'price_max',
    };
    const paramKey = paramMap[key];
    const defaultVals: Record<string, any> = {
      categoryId: 'all', cityId: 'all', minRating: 0,
      verifiedOnly: false, sortBy: 'rating', priceMin: 0, priceMax: 0,
    };
    if (value === defaultVals[key]) params.delete(paramKey); else params.set(paramKey, String(value));
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCategoryClick = useCallback((id: string) => {
    handleFilterChange('categoryId', filters.categoryId === id ? 'all' : id);
  }, [filters.categoryId, handleFilterChange]);

  const hasActiveFilters = filters.categoryId !== 'all' || filters.cityId !== 'all' || filters.minRating > 0 || filters.verifiedOnly || filters.priceMin > 0 || filters.priceMax > 0;

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultFilters });
    setQuery('');
    setCurrentPage(1);
    setSelectedTags([]);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const filtered = useMemo(() => {
    if (!businesses) return [];
    return filterAndSort(businesses, debouncedQuery, filters, selectedTags, entityTags, language);
  }, [businesses, debouncedQuery, filters, language, selectedTags, entityTags]);

  const didYouMean = useMemo(() => {
    if (!debouncedQuery.trim() || filtered.length > 0 || !businesses) return null;
    const allNames = businesses.map(b => language === 'ar' ? b.name_ar : (b.name_en || b.name_ar));
    return getDidYouMean(debouncedQuery, allNames);
  }, [debouncedQuery, filtered.length, businesses, language]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    if (viewMode === 'map' || viewMode === 'split') return filtered;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage, viewMode]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  }, []);

  const showChips = hasActiveFilters || query.trim() || selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader
        query={query}
        onQueryChange={handleQueryChange}
        onSearch={handleSearch}
        totalResults={filtered.length}
        categories={categories}
        onCategoryClick={handleCategoryClick}
        businesses={businesses}
      />

      <div className="container py-6 sm:py-8 px-3 sm:px-6">
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
            isLoading={isLoading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalCount={filtered.length}
            onClearFilters={clearFilters}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
            didYouMean={didYouMean}
            onDidYouMeanClick={(term) => handleQueryChange(term)}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SearchPage;
