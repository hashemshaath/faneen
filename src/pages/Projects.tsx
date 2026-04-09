import React, { useState, useMemo } from 'react';
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
import { FolderOpen, Calendar, DollarSign, Clock, Building2, X, ImageIcon, Search, MapPin, Tag, ArrowUpDown } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

const Projects = () => {
  const { isRTL, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [minCost, setMinCost] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [sortBy, setSortBy] = useState('newest');

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
    // 'newest' is default from API order
    return result;
  }, [allProjects, searchQuery, selectedCategory, selectedCity, minCost, maxCost, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const projects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedCity !== 'all' || minCost || maxCost || sortBy !== 'newest';
  const clearFilters = () => { setSearchQuery(''); setSelectedCategory('all'); setSelectedCity('all'); setMinCost(''); setMaxCost(''); setSortBy('newest'); setCurrentPage(1); };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <FolderOpen className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-heading font-bold text-3xl text-primary-foreground mb-2">
            {isRTL ? 'المشاريع المنجزة' : 'Completed Projects'}
          </h1>
          <p className="text-primary-foreground/60 font-body">
            {isRTL ? 'استعرض أفضل المشاريع من مزودي الخدمة' : 'Browse the best projects from service providers'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search & Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث عن مشروع...' : 'Search projects...'}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="ps-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={handleFilterChange(setSelectedCategory)}>
              <SelectTrigger className="w-full sm:w-48">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
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
              <SelectTrigger className="w-full sm:w-48">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
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
              <SelectTrigger className="w-full sm:w-48">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
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
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                placeholder={isRTL ? 'أقل تكلفة (ر.س)' : 'Min cost (SAR)'}
                value={minCost}
                onChange={e => { setMinCost(e.target.value); setCurrentPage(1); }}
                className="ps-10"
              />
            </div>
            <div className="relative flex-1">
              <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                placeholder={isRTL ? 'أعلى تكلفة (ر.س)' : 'Max cost (SAR)'}
                value={maxCost}
                onChange={e => { setMaxCost(e.target.value); setCurrentPage(1); }}
                className="ps-10"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isRTL ? `${filtered.length} نتيجة` : `${filtered.length} results`}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                <X className="w-3 h-3 me-1" />
                {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>{isRTL ? 'لا توجد مشاريع حالياً' : 'No projects available'}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((p: any) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="block">
                  <Card className="overflow-hidden border-border/50 hover:border-accent/30 transition-all hover:shadow-lg group cursor-pointer h-full">
                    <div className="aspect-video bg-muted relative">
                      {p.cover_image_url ? (
                        <img src={p.cover_image_url} alt={p.title_ar} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderOpen className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      {p.is_featured && (
                        <Badge className="absolute top-2 start-2 bg-accent text-accent-foreground text-[10px]">
                          {isRTL ? 'مميز' : 'Featured'}
                        </Badge>
                      )}
                      <div className="absolute bottom-2 end-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {isRTL ? 'عرض التفاصيل' : 'View Details'}
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-heading font-bold text-lg">
                        {language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}
                      </h3>
                      {(p.description_ar || p.description_en) && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {p.project_cost && (
                          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                            <DollarSign className="w-3 h-3" />{Number(p.project_cost).toLocaleString()} SAR
                          </span>
                        )}
                        {p.duration_days && (
                          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3" />{p.duration_days} {isRTL ? 'يوم' : 'days'}
                          </span>
                        )}
                        {p.completion_date && (
                          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                            <Calendar className="w-3 h-3" />{p.completion_date}
                          </span>
                        )}
                      </div>
                      {p.businesses && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                          {p.businesses.logo_url ? (
                            <img src={p.businesses.logo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                              <Building2 className="w-3.5 h-3.5 text-accent" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-accent">
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
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
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
                        <span key={`dots-${i}`} className="px-1 text-muted-foreground">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === currentPage ? 'default' : 'outline'}
                          size="sm"
                          className="w-9 h-9"
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
