import React, { useState, useMemo } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FolderOpen, Calendar, DollarSign, Clock, Building2, X, ImageIcon,
  Search, MapPin, Tag, ArrowUpDown, SlidersHorizontal, ChevronDown,
} from 'lucide-react';

const ITEMS_PER_PAGE = 12;

const ProjectSkeleton = () => (
  <Card className="overflow-hidden border-border/50 dark:border-border/30">
    <Skeleton className="aspect-video w-full" />
    <CardContent className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4 rounded-lg" />
      <Skeleton className="h-3 w-full rounded-lg" />
      <Skeleton className="h-3 w-2/3 rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

const Projects = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: language === 'ar' ? 'المشاريع - معرض أعمال الألمنيوم والحديد | فنيين' : 'Projects - Aluminum & Iron Portfolio | Faneen',
    description: language === 'ar' ? 'تصفح مشاريع وأعمال مصانع ومحلات الألمنيوم والحديد والزجاج والخشب.' : 'Browse aluminum, iron, glass and wood projects and portfolios.',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [minCost, setMinCost] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_ar, name_en').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name_ar, name_en').eq('is_active', true);
      return data || [];
    },
  });

  const { data: allProjects = [], isLoading } = useQuery({
    queryKey: ['public-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, businesses(username, name_ar, name_en, logo_url)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const result = allProjects.filter((p: any) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = p.title_ar?.toLowerCase().includes(q) ||
          p.title_en?.toLowerCase().includes(q) ||
          p.description_ar?.toLowerCase().includes(q) ||
          p.description_en?.toLowerCase().includes(q) ||
          p.client_name?.toLowerCase().includes(q) ||
          p.businesses?.name_ar?.toLowerCase().includes(q) ||
          p.businesses?.name_en?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
      if (selectedCity !== 'all' && p.city_id !== selectedCity) return false;
      if (minCost && p.project_cost != null && Number(p.project_cost) < Number(minCost)) return false;
      if (maxCost && p.project_cost != null && Number(p.project_cost) > Number(maxCost)) return false;
      if ((minCost || maxCost) && p.project_cost == null) return false;
      return true;
    });
    if (sortBy === 'cost_high') {
      result.sort((a: any, b: any) => (Number(b.project_cost) || 0) - (Number(a.project_cost) || 0));
    } else if (sortBy === 'cost_low') {
      result.sort((a: any, b: any) => (Number(a.project_cost) || 0) - (Number(b.project_cost) || 0));
    } else if (sortBy === 'oldest') {
      result.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return result;
  }, [allProjects, searchQuery, selectedCategory, selectedCity, minCost, maxCost, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const projects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleFilterChange = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedCity !== 'all' || minCost || maxCost || sortBy !== 'newest';
  const activeFilterCount = [searchQuery, selectedCategory !== 'all', selectedCity !== 'all', minCost, maxCost, sortBy !== 'newest'].filter(Boolean).length;
  const clearFilters = () => { setSearchQuery(''); setSelectedCategory('all'); setSelectedCity('all'); setMinCost(''); setMaxCost(''); setSortBy('newest'); setCurrentPage(1); };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      <div className="bg-primary pt-20 sm:pt-24 pb-6 sm:pb-10">
        <div className="container px-4 sm:px-6 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent/15 dark:bg-accent/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary-foreground mb-1 sm:mb-2">
            {isRTL ? 'المشاريع المنجزة' : 'Completed Projects'}
          </h1>
          <p className="text-primary-foreground/60 font-body text-sm sm:text-base">
            {isRTL ? 'استعرض أفضل المشاريع من مزودي الخدمة' : 'Browse the best projects from service providers'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-5 sm:py-8 max-w-6xl">
        {/* Search & Filters */}
        <div className="mb-5 sm:mb-6 space-y-3">
          {/* Search + filter toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث عن مشروع...' : 'Search projects...'}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="ps-10 h-10 sm:h-11 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute end-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`h-10 sm:h-11 w-10 sm:w-11 shrink-0 relative ${showFilters ? 'border-accent text-accent' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Expandable filters */}
          <div className={`transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 sm:max-h-[500px] sm:opacity-100'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <Select value={selectedCategory} onValueChange={handleFilterChange(setSelectedCategory)}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder={isRTL ? 'الفئة' : 'Category'} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الفئات' : 'All Categories'}</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {language === 'ar' ? c.name_ar : c.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCity} onValueChange={handleFilterChange(setSelectedCity)}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder={isRTL ? 'المدينة' : 'City'} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع المدن' : 'All Cities'}</SelectItem>
                  {cities.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {language === 'ar' ? c.name_ar : c.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={handleFilterChange(setSortBy)}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder={isRTL ? 'الترتيب' : 'Sort'} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{isRTL ? 'الأحدث أولاً' : 'Newest First'}</SelectItem>
                  <SelectItem value="oldest">{isRTL ? 'الأقدم أولاً' : 'Oldest First'}</SelectItem>
                  <SelectItem value="cost_high">{isRTL ? 'الأعلى تكلفة' : 'Highest Cost'}</SelectItem>
                  <SelectItem value="cost_low">{isRTL ? 'الأقل تكلفة' : 'Lowest Cost'}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 col-span-2 sm:col-span-1">
                <div className="relative flex-1">
                  <DollarSign className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number" min={0}
                    placeholder={isRTL ? 'أقل تكلفة' : 'Min cost'}
                    value={minCost}
                    onChange={e => { setMinCost(e.target.value); setCurrentPage(1); }}
                    className="ps-8 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div className="relative flex-1">
                  <DollarSign className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number" min={0}
                    placeholder={isRTL ? 'أعلى تكلفة' : 'Max cost'}
                    value={maxCost}
                    onChange={e => { setMaxCost(e.target.value); setCurrentPage(1); }}
                    className="ps-8 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs sm:text-sm text-muted-foreground">
                {isRTL ? `${filtered.length} نتيجة` : `${filtered.length} results`}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 text-accent hover:text-accent">
                <X className="w-3 h-3 me-1" />
                {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => <ProjectSkeleton key={i} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 sm:py-20 text-muted-foreground">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-muted/50 dark:bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 opacity-20" />
            </div>
            <p className="text-sm sm:text-base">{isRTL ? 'لا توجد مشاريع حالياً' : 'No projects available'}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {projects.map((p: any, index: number) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="block animate-card-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
                  <Card className="overflow-hidden border-border/50 dark:border-border/30 hover:border-accent/40 transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 dark:hover:shadow-accent/10 group cursor-pointer h-full hover:-translate-y-1.5 dark:bg-card/80">
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {p.cover_image_url ? (
                        <img
                          src={p.cover_image_url}
                          alt={p.title_ar}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 dark:from-muted/80 dark:to-accent/5">
                          <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/20 transition-transform duration-500 group-hover:scale-110 group-hover:text-accent/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {p.is_featured && (
                        <Badge className="absolute top-2 start-2 bg-accent text-accent-foreground text-[10px] shadow-lg animate-pulse">
                          {isRTL ? 'مميز' : 'Featured'}
                        </Badge>
                      )}
                      <div className="absolute bottom-3 end-3 bg-background/90 dark:bg-card/90 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 shadow-lg">
                        <ImageIcon className="w-3.5 h-3.5 text-accent" />
                        {isRTL ? 'عرض التفاصيل' : 'View Details'}
                      </div>
                    </div>
                    <CardContent className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
                      <h3 className="font-heading font-bold text-[15px] sm:text-lg transition-colors duration-300 group-hover:text-accent line-clamp-1">
                        {language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}
                      </h3>
                      {(p.description_ar || p.description_en) && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
                        {p.project_cost && (
                          <span className="flex items-center gap-1 bg-muted/70 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-full transition-colors duration-300 group-hover:bg-accent/10 group-hover:text-accent">
                            <DollarSign className="w-3 h-3" />{Number(p.project_cost).toLocaleString()} SAR
                          </span>
                        )}
                        {p.duration_days && (
                          <span className="flex items-center gap-1 bg-muted/70 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-full transition-colors duration-300 group-hover:bg-accent/10 group-hover:text-accent">
                            <Clock className="w-3 h-3" />{p.duration_days} {isRTL ? 'يوم' : 'days'}
                          </span>
                        )}
                        {p.completion_date && (
                          <span className="flex items-center gap-1 bg-muted/70 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-full transition-colors duration-300 group-hover:bg-accent/10 group-hover:text-accent">
                            <Calendar className="w-3 h-3" />{p.completion_date}
                          </span>
                        )}
                      </div>
                      {p.businesses && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/30 dark:border-border/20 transition-colors duration-300 group-hover:border-accent/20">
                          {p.businesses.logo_url ? (
                            <img src={p.businesses.logo_url} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-transparent transition-all duration-300 group-hover:ring-accent/30" />
                          ) : (
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-accent/10 dark:bg-accent/15 flex items-center justify-center transition-colors duration-300 group-hover:bg-accent/20">
                              <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent" />
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-medium text-accent truncate">
                            {language === 'ar' ? p.businesses.name_ar : (p.businesses.name_en || p.businesses.name_ar)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                  disabled={currentPage === 1}
                  onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {isRTL ? 'السابق' : 'Previous'}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | string)[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      typeof p === 'string' ? (
                        <span key={`dots-${i}`} className="px-1 text-muted-foreground text-xs">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === currentPage ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
                          onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        >
                          {p}
                        </Button>
                      )
                    )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                  disabled={currentPage === totalPages}
                  onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {isRTL ? 'التالي' : 'Next'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Projects;