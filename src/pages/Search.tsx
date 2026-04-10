import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Footer } from '@/components/layout/Footer';
import { SearchHeader } from '@/components/search/SearchHeader';
import { SearchFilters, type SearchFilterValues } from '@/components/search/SearchFilters';
import { SearchResults, type ViewMode } from '@/components/search/SearchResults';

const ITEMS_PER_PAGE = 12;

const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
  });

const useCities = () =>
  useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('*').eq('is_active', true).order('name_ar');
      return data ?? [];
    },
  });

const useBusinesses = () =>
  useQuery({
    queryKey: ['businesses-all-with-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('*, categories(*), cities(*), business_services(price_from, price_to, is_active)')
        .eq('is_active', true)
        .order('rating_avg', { ascending: false });
      return data ?? [];
    },
  });

const useEntityTags = () =>
  useQuery({
    queryKey: ['entity-tags-businesses'],
    queryFn: async () => {
      const { data } = await supabase.from('entity_tags').select('entity_id, tag_id').eq('entity_type', 'business');
      return data ?? [];
    },
  });

const SearchPage = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: categories } = useCategories();
  const { data: cities } = useCities();
  const { data: businesses, isLoading } = useBusinesses();
  const { data: entityTags } = useEntityTags();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
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
    setFilters({ categoryId: 'all', cityId: 'all', minRating: 0, verifiedOnly: false, sortBy: 'rating', priceMin: 0, priceMax: 0 });
    setQuery('');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const filtered = useMemo(() => {
    if (!businesses) return [];
    let results = [...businesses];

    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(b =>
        b.name_ar?.toLowerCase().includes(q) || b.name_en?.toLowerCase().includes(q) ||
        b.description_ar?.toLowerCase().includes(q) || b.description_en?.toLowerCase().includes(q)
      );
    }
    if (filters.categoryId !== 'all') results = results.filter(b => b.category_id === filters.categoryId);
    if (filters.cityId !== 'all') results = results.filter(b => b.city_id === filters.cityId);
    if (filters.minRating > 0) results = results.filter(b => Number(b.rating_avg) >= filters.minRating);
    if (filters.verifiedOnly) results = results.filter(b => b.is_verified);

    if (filters.priceMin > 0 || filters.priceMax > 0) {
      results = results.filter(b => {
        const services = (b as any).business_services;
        if (!services || !Array.isArray(services) || services.length === 0) return false;
        return services.some((s: any) => {
          if (!s.is_active) return false;
          const from = Number(s.price_from) || 0;
          const to = Number(s.price_to) || from;
          const serviceMax = Math.max(from, to);
          const serviceMin = Math.min(from, to) || 0;
          if (filters.priceMin > 0 && serviceMax < filters.priceMin) return false;
          if (filters.priceMax > 0 && serviceMin > filters.priceMax) return false;
          return true;
        });
      });
    }

    results.sort((a, b) => {
      if (filters.sortBy === 'rating') return Number(b.rating_avg) - Number(a.rating_avg);
      if (filters.sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      const nameA = language === 'ar' ? a.name_ar : (a.name_en || a.name_ar);
      const nameB = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
      return nameA.localeCompare(nameB, language);
    });

    return results;
  }, [businesses, query, filters, language]);

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

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader
        query={query}
        onQueryChange={handleQueryChange}
        totalResults={filtered.length}
        categories={categories}
        onCategoryClick={handleCategoryClick}
        businesses={businesses}
      />

      <div className="container py-5 sm:py-8 px-3 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          <SearchFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            categories={categories}
            cities={cities}
            hasActiveFilters={hasActiveFilters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
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
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SearchPage;
