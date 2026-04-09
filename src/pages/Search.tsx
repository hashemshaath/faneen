import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search as SearchIcon, Star, MapPin, BadgeCheck,
  SlidersHorizontal, X, Phone, Building2,
} from 'lucide-react';

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
    queryKey: ['businesses-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('*, categories(*), cities(*)')
        .eq('is_active', true)
        .order('rating_avg', { ascending: false });
      return data ?? [];
    },
  });

const SearchPage = () => {
  const { t, language, isRTL } = useLanguage();
  const { data: categories } = useCategories();
  const { data: cities } = useCities();
  const { data: businesses, isLoading } = useBusinesses();

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [cityId, setCityId] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'newest' | 'name'>('rating');
  const [showFilters, setShowFilters] = useState(true);

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
    if (categoryId !== 'all') results = results.filter(b => b.category_id === categoryId);
    if (cityId !== 'all') results = results.filter(b => b.city_id === cityId);
    if (minRating > 0) results = results.filter(b => Number(b.rating_avg) >= minRating);
    if (verifiedOnly) results = results.filter(b => b.is_verified);
    results.sort((a, b) => {
      if (sortBy === 'rating') return Number(b.rating_avg) - Number(a.rating_avg);
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      const nameA = language === 'ar' ? a.name_ar : (a.name_en || a.name_ar);
      const nameB = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
      return nameA.localeCompare(nameB, language);
    });
    return results;
  }, [businesses, query, categoryId, cityId, minRating, verifiedOnly, sortBy, language]);

  const hasActiveFilters = categoryId !== 'all' || cityId !== 'all' || minRating > 0 || verifiedOnly;
  const clearFilters = () => { setCategoryId('all'); setCityId('all'); setMinRating(0); setVerifiedOnly(false); setQuery(''); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover */}
      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <h1 className="font-heading font-bold text-3xl text-primary-foreground mb-2">{t('search.page_title')}</h1>
          <p className="text-primary-foreground/60 font-body">{t('search.page_subtitle')}</p>
          <div className="max-w-2xl mx-auto mt-6 relative">
            <SearchIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('search.placeholder')} className="ps-12 h-12 rounded-xl bg-card text-foreground border-border text-base" />
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 font-heading font-bold text-foreground">
                <SlidersHorizontal className="w-5 h-5 text-accent" />{t('search.filters')}
              </button>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-accent font-body hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" />{t('search.clear_filters')}
                </button>
              )}
            </div>
            {showFilters && (
              <div className="space-y-6 p-5 rounded-xl bg-card border border-border">
                <div>
                  <label className="text-sm font-heading font-semibold text-foreground mb-2 block">{t('search.category')}</label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={t('search.all_categories')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.all_categories')}</SelectItem>
                      {categories?.map(c => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-heading font-semibold text-foreground mb-2 block">{t('search.city')}</label>
                  <Select value={cityId} onValueChange={setCityId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={t('search.all_cities')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.all_cities')}</SelectItem>
                      {cities?.map(c => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-heading font-semibold text-foreground mb-2 block">
                    {t('search.min_rating')}: {minRating > 0 ? `${minRating}+` : t('profile.all')}
                  </label>
                  <div className="flex items-center gap-3 px-1">
                    <Slider value={[minRating]} onValueChange={([v]) => setMinRating(v)} max={5} step={1} className="flex-1" />
                    <div className="flex items-center gap-0.5">
                      <Star className="w-4 h-4 text-accent fill-accent" />
                      <span className="text-sm font-body text-foreground">{minRating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="verified" checked={verifiedOnly} onCheckedChange={(c) => setVerifiedOnly(c === true)} />
                  <label htmlFor="verified" className="text-sm font-body text-foreground cursor-pointer flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-accent" />{t('search.verified_only')}
                  </label>
                </div>
                <div>
                  <label className="text-sm font-heading font-semibold text-foreground mb-2 block">{t('search.sort_by')}</label>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">{t('search.sort_rating')}</SelectItem>
                      <SelectItem value="newest">{t('search.sort_newest')}</SelectItem>
                      <SelectItem value="name">{t('search.sort_name')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground font-body">
                <span className="font-semibold text-foreground">{filtered.length}</span> {t('search.results')}
              </p>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="font-heading font-bold text-xl text-foreground mb-2">{t('search.no_results')}</h3>
                <p className="text-muted-foreground font-body">{t('search.no_results_desc')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(b => {
                  const name = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
                  const desc = language === 'ar' ? b.description_ar : (b.description_en || b.description_ar);
                  const cityName = b.cities ? (language === 'ar' ? (b.cities as any).name_ar : (b.cities as any).name_en) : '';
                  const catName = b.categories ? (language === 'ar' ? (b.categories as any).name_ar : (b.categories as any).name_en) : '';
                  return (
                    <Link key={b.id} to={`/${b.username}`} className="group p-5 rounded-xl bg-card border border-border hover:border-accent/40 hover:shadow-lg transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {b.logo_url ? <img src={b.logo_url} alt={name} className="w-full h-full object-cover" /> : <Building2 className="w-7 h-7 text-accent" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-heading font-bold text-foreground group-hover:text-accent transition-colors truncate">{name}</h3>
                            {b.is_verified && <BadgeCheck className="w-4 h-4 text-accent flex-shrink-0" />}
                          </div>
                          {catName && <span className="text-xs text-accent font-body">{catName}</span>}
                          {desc && <p className="text-sm text-muted-foreground font-body mt-1.5 line-clamp-2">{desc}</p>}
                          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground font-body">
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                              <span className="font-semibold text-foreground">{Number(b.rating_avg).toFixed(1)}</span>
                              <span>({b.rating_count})</span>
                            </div>
                            {cityName && <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /><span>{cityName}</span></div>}
                            {b.phone && <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{b.phone}</span></div>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SearchPage;
