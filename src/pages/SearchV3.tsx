import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildSeoTitle, buildSeoDescription } from '@/modules/seo/seoTitleBuilder';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import { Footer } from '@/components/layout/Footer';
import {
  useDebouncedValue,
  useCategories,
  useCities,
  useBusinesses,
  useDirectoryRealtimeInvalidation,
  useServiceCategoryBusinessIds,
  filterAndSort,
  getDidYouMean,
  addToSearchHistory,
  defaultFilters,
  type SearchFilterValues,
} from '@/services/search';
import { useSearchTaxonomyContext, useBusinessTaxonomyDisplayBatch } from '@/modules/taxonomy/search-integration';
import { detectSectorFromQuery, getSectorMeta, ALL_SECTORS } from '@/lib/sector-keywords';
import { findCityKeywords, getCityKeywordsString, mergeKeywords } from '@/lib/city-keywords';
import { findRegionForCity, SA_REGIONS } from '@/data/sa-regions';
import { track } from '@/lib/analytics-events';
import { SearchHeaderV3, type ViewModeV3 } from '@/components/search/v3/SearchHeaderV3';
import { SearchFiltersV3 } from '@/components/search/v3/SearchFiltersV3';
import { SearchResultsV3 } from '@/components/search/v3/SearchResultsV3';
import { ActiveFiltersBarV3 } from '@/components/search/v3/ActiveFiltersBarV3';
import { useStickyOverlapAudit } from '@/hooks/useStickyOverlapAudit';

const ITEMS_PER_PAGE = 12;

const SearchV3 = () => {
  const { language } = useLanguage();
  const bi = useBi();
  const isRTL = language === 'ar';
  const [searchParams, setSearchParams] = useSearchParams();

  // Dev-only: warn in console if the sticky header ever overlaps tagged content.
  useStickyOverlapAudit();

  // ── URL state ───────────────────────────────────────
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  React.useEffect(() => {
    const urlQ = searchParams.get('q') || '';
    if (urlQ !== query) setQuery(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('q')]);

  const debouncedQuery = useDebouncedValue(query, 300);

  const normalizeView = (v: string | null): ViewModeV3 => (v === 'list' ? 'list' : 'grid');
  const [viewMode, setViewMode] = useState<ViewModeV3>(normalizeView(searchParams.get('view')));
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState<SearchFilterValues>({
    categoryId: searchParams.get('category') || 'all',
    cityId: searchParams.get('city') || 'all',
    minRating: Number(searchParams.get('rating')) || 0,
    verifiedOnly: searchParams.get('verified') === 'true',
    sortBy: (searchParams.get('sort') as SearchFilterValues['sortBy']) || 'rating',
    priceMin: Number(searchParams.get('price_min')) || 0,
    priceMax: Number(searchParams.get('price_max')) || 0,
    serviceCategoryId: searchParams.get('serviceCategory') || 'all',
    regionId: searchParams.get('region') || 'all',
  });

  // ── Data ────────────────────────────────────────────
  const { data: categories } = useCategories();
  const { data: cities } = useCities();
  const { data: businesses, isLoading, isError, refetch } = useBusinesses();
  useDirectoryRealtimeInvalidation();

  const { data: taxonomyCtx } = useSearchTaxonomyContext({
    q: debouncedQuery,
    sector: searchParams.get('sector'),
    category: filters.categoryId !== 'all' ? filters.categoryId : null,
    service: filters.serviceCategoryId !== 'all' ? filters.serviceCategoryId : null,
  });
  const taxonomyBusinessIds = taxonomyCtx?.taxonomyBusinessIds;

  const { data: serviceCategoryBusinessIds } = useServiceCategoryBusinessIds(
    filters.serviceCategoryId,
    categories,
  );

  // ── SEO (kept intact) ───────────────────────────────
  const detectedSector = detectSectorFromQuery(query);
  const sectorMeta = detectedSector ? getSectorMeta(detectedSector, isRTL) : null;
  const allSectorKeywords = ALL_SECTORS.flatMap((s) => bi(s.keywords_ar, s.keywords_en)).slice(0, 24).join(', ');

  const selectedCity = useMemo(() => {
    if (!filters.cityId || filters.cityId === 'all' || !cities) return null;
    return cities.find((c) => c.id === filters.cityId) || null;
  }, [filters.cityId, cities]);

  const cityMeta = useMemo(() => {
    if (!selectedCity) return null;
    const entry = findCityKeywords(bi(selectedCity.name_ar, selectedCity.name_en))
      || findCityKeywords(selectedCity.name_en)
      || findCityKeywords(selectedCity.name_ar);
    if (!entry) return null;
    return {
      name: bi(entry.name_ar, entry.name_en),
      region: bi(entry.region_ar, entry.region_en),
      keywords: getCityKeywordsString(entry),
    };
  }, [selectedCity, bi]);

  const lang = isRTL ? 'ar' as const : 'en' as const;
  // Prefer query > selected category > detected sector for the SEO subject,
  // so that filter-only browsing still produces meaningful titles/descriptions.
  const seoSubject = query
    || (categories?.find((c) => c.id === filters.categoryId)
      ? (isRTL
          ? categories.find((c) => c.id === filters.categoryId)!.name_ar
          : categories.find((c) => c.id === filters.categoryId)!.name_en
            || categories.find((c) => c.id === filters.categoryId)!.name_ar)
      : undefined)
    || sectorMeta?.name
    || undefined;
  const seoCity = cityMeta?.name
    || (filters.regionId !== 'all'
      ? (() => {
          const r = SA_REGIONS.find((x) => x.id === filters.regionId);
          return r ? (isRTL ? r.name_ar : r.name_en) : undefined;
        })()
      : undefined);
  usePageMeta({
    title: buildSeoTitle({ kind: 'search', lang, service: seoSubject, city: seoCity }),
    description: buildSeoDescription({ kind: 'search', lang, service: seoSubject, city: seoCity }),
    keywords: mergeKeywords(sectorMeta ? sectorMeta.keywords : allSectorKeywords, cityMeta?.keywords),
    noindex: !!query,
    canonical: (() => {
      if (query) return 'https://qitaat.com/search';
      const cp = new URLSearchParams();
      if (filters.categoryId !== 'all') cp.set('category', filters.categoryId);
      if (filters.cityId !== 'all') cp.set('city', filters.cityId);
      const qs = cp.toString();
      return qs ? `https://qitaat.com/search?${qs}` : 'https://qitaat.com/search';
    })(),
  });

  // ── Handlers ────────────────────────────────────────
  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    setCurrentPage(1);
    const p = new URLSearchParams(searchParams);
    if (q) p.set('q', q); else p.delete('q');
    setSearchParams(p, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSearch = useCallback((q: string) => {
    if (q.trim()) addToSearchHistory(q.trim());
  }, []);

  const handleFilterChange = useCallback(
    <K extends keyof SearchFilterValues>(key: K, value: SearchFilterValues[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
      track.filter({
        category_slug: key === 'categoryId' && value !== 'all' ? String(value) : undefined,
        city: key === 'cityId' && value !== 'all' ? String(value) : undefined,
      });
      const p = new URLSearchParams(searchParams);
      const map: Record<string, string> = {
        categoryId: 'category', cityId: 'city', minRating: 'rating', verifiedOnly: 'verified',
        sortBy: 'sort', priceMin: 'price_min', priceMax: 'price_max',
        serviceCategoryId: 'serviceCategory', regionId: 'region',
      };
      const defaults: Record<string, unknown> = {
        categoryId: 'all', cityId: 'all', minRating: 0, verifiedOnly: false,
        sortBy: 'rating', priceMin: 0, priceMax: 0, serviceCategoryId: 'all', regionId: 'all',
      };
      const k = map[key];
      if (value === defaults[key]) p.delete(k); else p.set(k, String(value));
      setSearchParams(p, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleViewChange = useCallback((m: ViewModeV3) => {
    setViewMode(m);
    const p = new URLSearchParams(searchParams);
    if (m === 'grid') p.delete('view'); else p.set('view', m);
    setSearchParams(p, { replace: true });
  }, [searchParams, setSearchParams]);

  const hasActiveFilters = filters.categoryId !== 'all'
    || filters.cityId !== 'all'
    || filters.minRating > 0
    || filters.verifiedOnly
    || filters.serviceCategoryId !== 'all'
    || filters.regionId !== 'all';

  const activeFilterCount = [
    filters.categoryId !== 'all',
    filters.cityId !== 'all',
    filters.minRating > 0,
    filters.verifiedOnly,
    filters.serviceCategoryId !== 'all',
    filters.regionId !== 'all',
  ].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultFilters });
    setQuery('');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // ── Filtering ───────────────────────────────────────
  const filtered = useMemo(() => {
    if (!businesses) return [];
    let res = filterAndSort(
      businesses,
      debouncedQuery,
      filters,
      language,
      categories,
      taxonomyBusinessIds,
      serviceCategoryBusinessIds,
    );
    if (filters.regionId !== 'all' && cities) {
      const cityById = new Map(cities.map((c) => [c.id, c]));
      res = res.filter((b: { city_id?: string | null }) => {
        const city = b.city_id ? cityById.get(b.city_id) : null;
        if (!city) return false;
        return findRegionForCity(city.name_ar, city.name_en) === filters.regionId;
      });
    }
    return res;
  }, [businesses, debouncedQuery, filters, language, categories, cities, taxonomyBusinessIds, serviceCategoryBusinessIds]);

  const deferred = useDeferredValue(filtered);

  React.useEffect(() => {
    if (!debouncedQuery.trim()) return;
    track.search({
      results_count: filtered.length,
      filters_count: activeFilterCount,
      sector: detectedSector || undefined,
      city: cityMeta?.name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filtered.length]);

  // ── JSON-LD ─────────────────────────────────────────
  useMultiJsonLd(useMemo(() => {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'قِطاعات', item: 'https://qitaat.com' },
        { '@type': 'ListItem', position: 2, name: bi('البحث', 'Search'), item: 'https://qitaat.com/search' },
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
      inLanguage: bi('ar', 'en'),
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://qitaat.com/search?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
      keywords: sectorMeta ? sectorMeta.keywords : allSectorKeywords,
    };
    const blocks: Record<string, unknown>[] = [breadcrumb, website];
    if (filtered.length > 0) {
      const top = filtered.slice(0, 10);
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: sectorMeta
          ? bi(`أفضل مزودي ${sectorMeta.name}`, `Top ${sectorMeta.name} providers`)
          : bi('أفضل مزودي الخدمات', 'Top service providers'),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, sectorMeta, allSectorKeywords, filtered]));

  // ── Pagination + did-you-mean + visible taxonomy ────
  const totalPages = Math.max(1, Math.ceil(deferred.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return deferred.slice(start, start + ITEMS_PER_PAGE);
  }, [deferred, currentPage]);

  const didYouMean = useMemo(() => {
    if (!debouncedQuery.trim() || filtered.length > 0 || !businesses) return null;
    const names = businesses.map((b) => language === 'ar' ? b.name_ar : (b.name_en || b.name_ar));
    return getDidYouMean(debouncedQuery, names);
  }, [debouncedQuery, filtered.length, businesses, language]);

  const visibleIds = useMemo(
    () => paginated.map((b: { id: string }) => b.id),
    [paginated],
  );
  const { data: taxonomyDisplayMap } = useBusinessTaxonomyDisplayBatch(visibleIds, lang);

  const handlePageChange = useCallback((p: number) => {
    setCurrentPage(p);
    const target = document.getElementById('search-main');
    if (target) {
      const y = target.getBoundingClientRect().top + window.scrollY - 180;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 280, behavior: 'smooth' });
    }
  }, []);

  const showChips = hasActiveFilters || query.trim();

  // ── Indexable SEO summary (always rendered, even while skeleton ───
  // is showing) so crawlers see real prose instead of placeholders. ──
  const selectedCategoryName = useMemo(() => {
    if (!categories || filters.categoryId === 'all') return null;
    const c = categories.find((x) => x.id === filters.categoryId);
    return c ? (isRTL ? c.name_ar : (c.name_en || c.name_ar)) : null;
  }, [categories, filters.categoryId, isRTL]);

  const selectedRegionName = useMemo(() => {
    if (filters.regionId === 'all') return null;
    const r = SA_REGIONS.find((x) => x.id === filters.regionId);
    return r ? (isRTL ? r.name_ar : r.name_en) : null;
  }, [filters.regionId, isRTL]);

  const seoHeading = useMemo(() => {
    const subject = query.trim() || selectedCategoryName || (sectorMeta?.name)
      || bi('مزودي خدمات التصنيع والتشطيب', 'fabrication & finishing providers');
    const place = cityMeta?.name || selectedRegionName || bi('المملكة العربية السعودية', 'Saudi Arabia');
    return bi(`ابحث عن ${subject} في ${place}`, `Find ${subject} in ${place}`);
  }, [query, selectedCategoryName, sectorMeta, cityMeta, selectedRegionName, bi]);

  const seoSummary = useMemo(() => {
    const count = deferred.length;
    if (isLoading) {
      return bi(
        `يتم تحميل قائمة ${selectedCategoryName || sectorMeta?.name || 'المزودين'} ${cityMeta?.name ? `في ${cityMeta.name}` : 'في المملكة'}.`,
        `Loading ${selectedCategoryName || sectorMeta?.name || 'providers'}${cityMeta?.name ? ` in ${cityMeta.name}` : ' in Saudi Arabia'}.`,
      );
    }
    return bi(
      `${count.toLocaleString('ar-EG')} مزوّد ${selectedCategoryName ? `لـ ${selectedCategoryName}` : ''} ${cityMeta?.name ? `في ${cityMeta.name}` : ''} على منصة قِطاعات للقطاعات الصناعية.`,
      `${count.toLocaleString('en-US')} verified ${selectedCategoryName || 'industrial'} providers${cityMeta?.name ? ` in ${cityMeta.name}` : ' across Saudi Arabia'} on the Qitaat industrial directory.`,
    );
  }, [isLoading, deferred.length, selectedCategoryName, sectorMeta, cityMeta, bi]);

  // ── Render ──────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background">
      <SearchHeaderV3
        query={query}
        onQueryChange={handleQueryChange}
        onSearch={handleSearch}
        businesses={businesses}
        categories={categories}
        cities={cities}
        sortBy={filters.sortBy}
        onSortChange={(s) => handleFilterChange('sortBy', s)}
        viewMode={viewMode}
        onViewModeChange={handleViewChange}
        totalResults={deferred.length}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
      >
        {showChips ? (
          <ActiveFiltersBarV3
            filters={filters}
            query={query}
            categories={categories}
            cities={cities}
            onFilterChange={handleFilterChange}
            onQueryChange={handleQueryChange}
            onClearAll={clearFilters}
          />
        ) : null}
      </SearchHeaderV3>

      <main id="search-main" className="container-app page-shell scroll-mt-44">
        <h1 className="sr-only">{seoHeading}</h1>
        <p className="sr-only">{seoSummary}</p>
        <div className="flex flex-col lg:flex-row gap-6">
          <aside
            className="hidden lg:block w-64 shrink-0 scroll-mt-44"
            data-overlap-audit="filters"
          >
            <div className="sticky top-44 rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--elev-1)]">
              <SearchFiltersV3
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                categories={categories}
                cities={cities}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </aside>

          <section
            className="flex-1 min-w-0 scroll-mt-44"
            data-overlap-audit="results"
          >
            <SearchResultsV3
              businesses={paginated}
              isLoading={isLoading}
              isError={!!isError}
              onRetry={() => refetch()}
              viewMode={viewMode}
              totalCount={deferred.length}
              hasFilters={!!hasActiveFilters || !!query.trim()}
              onClearFilters={clearFilters}
              didYouMean={didYouMean}
              onDidYouMeanClick={handleQueryChange}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              taxonomyDisplayMap={taxonomyDisplayMap}
            />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SearchV3;