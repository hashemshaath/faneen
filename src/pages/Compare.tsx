import React, { useState, useMemo } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MapPin, BadgeCheck, Plus, X, ArrowRight, ArrowLeft, Scale, Search, Download } from 'lucide-react';
import { exportComparePDF } from '@/lib/compare-pdf-export';

const Compare = () => {
  const { isRTL } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const selectedIds = useMemo(() => {
    const ids = searchParams.get('ids');
    return ids ? ids.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState('');

  const { data: allBusinesses = [] } = useQuery({
    queryKey: ['businesses-for-compare'],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id, name_ar, name_en, username, logo_url, rating_avg, rating_count, categories(name_ar, name_en), cities(name_ar, name_en)').eq('is_active', true).order('rating_avg', { ascending: false });
      return data ?? [];
    },
  });

  const { data: selectedBusinesses = [], isLoading: isLoadingSelected } = useQuery({
    queryKey: ['compare-businesses', selectedIds],
    queryFn: async () => {
      if (!selectedIds.length) return [];
      const { data } = await supabase.from('businesses').select('*, categories(name_ar, name_en), cities(name_ar, name_en), business_services(*), provider_installment_settings(*)').in('id', selectedIds);
      return data ?? [];
    },
    enabled: selectedIds.length > 0,
  });

  const { data: reviewsMap = {} } = useQuery({
    queryKey: ['compare-reviews', selectedIds],
    queryFn: async () => {
      if (!selectedIds.length) return {};
      const { data } = await supabase.from('reviews').select('business_id, rating').in('business_id', selectedIds);
      const map: Record<string, number[]> = {};
      (data ?? []).forEach(r => { (map[r.business_id] ??= []).push(r.rating); });
      return map;
    },
    enabled: selectedIds.length > 0,
  });

  const addBusiness = (id: string) => {
    if (selectedIds.includes(id) || selectedIds.length >= 4) return;
    setSearchParams({ ids: [...selectedIds, id].join(',') });
  };

  const removeBusiness = (id: string) => {
    setSearchParams({ ids: selectedIds.filter(x => x !== id).join(',') });
  };

  const filteredSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allBusinesses.filter(b => !selectedIds.includes(b.id)).filter(b => b.name_ar.toLowerCase().includes(q) || (b.name_en?.toLowerCase().includes(q))).slice(0, 6);
  }, [searchQuery, allBusinesses, selectedIds]);

  const allServices = useMemo(() => {
    const serviceNames = new Set<string>();
    selectedBusinesses.forEach((b: any) => {
      (b.business_services ?? []).forEach((s: any) => {
        serviceNames.add(isRTL ? s.name_ar : (s.name_en || s.name_ar));
      });
    });
    return Array.from(serviceNames);
  }, [selectedBusinesses, isRTL]);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Cover */}
      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <Scale className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-heading font-bold text-3xl text-primary-foreground mb-2">
            {isRTL ? 'مقارنة مزودي الخدمة' : 'Compare Providers'}
          </h1>
          <p className="text-primary-foreground/60 font-body">
            {isRTL ? 'قارن حتى 4 مزودين جنباً إلى جنب' : 'Compare up to 4 providers side by side'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Search to add */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث عن مزود خدمة للمقارنة...' : 'Search for a provider to compare...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            {filteredSearch.length > 0 && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {filteredSearch.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { addBusiness(b.id); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-start"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {b.logo_url ? <img src={b.logo_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold">{b.name_ar[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</p>
                      <p className="text-xs text-muted-foreground">{(b as any).categories?.name_ar}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs"><Star className="w-3 h-3 fill-gold text-gold" />{Number(b.rating_avg).toFixed(1)}</div>
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedIds.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
              <Scale className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-xl font-medium">{isRTL ? 'ابدأ المقارنة' : 'Start Comparing'}</p>
              <p className="text-sm">{isRTL ? 'ابحث وأضف مزودي خدمة للمقارنة بينهم' : 'Search and add providers to compare them'}</p>
            </CardContent>
          </Card>
        ) : isLoadingSelected ? (
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex gap-4 sm:gap-6 justify-center">
                {selectedIds.map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 min-w-[180px]">
                    <Skeleton className="w-14 h-14 rounded-xl" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-4 border-t border-border/30">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24 shrink-0" />
                    {selectedIds.map((_, j) => (
                      <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
          <div className="flex justify-end mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const businesses = selectedBusinesses.map((b: any) => ({
                  name: isRTL ? b.name_ar : (b.name_en || b.name_ar),
                  rating: Number(b.rating_avg).toFixed(1),
                  ratingCount: b.rating_count,
                  category: b.categories ? (isRTL ? b.categories.name_ar : b.categories.name_en) : '-',
                  location: b.cities ? (isRTL ? b.cities.name_ar : b.cities.name_en) : '-',
                  tier: b.membership_tier,
                  installments: b.provider_installment_settings?.[0]?.is_enabled
                    ? (isRTL ? `حتى ${b.provider_installment_settings[0].max_installments} أقساط` : `Up to ${b.provider_installment_settings[0].max_installments}`)
                    : '-',
                  services: (b.business_services ?? []).map((s: any) => {
                    const name = isRTL ? s.name_ar : (s.name_en || s.name_ar);
                    let price = '';
                    if (s.price_from) price += Number(s.price_from).toLocaleString();
                    if (s.price_to) price += ` - ${Number(s.price_to).toLocaleString()}`;
                    if (s.price_from || s.price_to) price += ` ${s.currency_code}`;
                    else price = isRTL ? 'متوفر' : 'Available';
                    return { name, price };
                  }),
                }));
                exportComparePDF({ businesses, allServices, isRTL });
              }}
            >
              <Download className="w-4 h-4 me-1" />
              {isRTL ? 'تصدير PDF' : 'Export PDF'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky start-0 bg-background z-10 p-3 text-start min-w-[140px] border-b border-border" />
                  {selectedBusinesses.map((b: any) => (
                    <th key={b.id} className="p-3 min-w-[220px] border-b border-border">
                      <div className="flex flex-col items-center gap-2 relative">
                        <button onClick={() => removeBusiness(b.id)} className="absolute -top-1 -end-1 p-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20">
                          <X className="w-3 h-3" />
                        </button>
                        <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden">
                          {b.logo_url ? <img src={b.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xl">{b.name_ar[0]}</div>}
                        </div>
                        <Link to={`/${b.username}`} className="font-medium text-sm hover:text-gold transition-colors text-center">
                          {isRTL ? b.name_ar : (b.name_en || b.name_ar)}
                        </Link>
                        {b.is_verified && <Badge variant="secondary" className="text-[10px]"><BadgeCheck className="w-3 h-3 me-1" />{isRTL ? 'موثق' : 'Verified'}</Badge>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Rating */}
                <tr className="bg-muted/30">
                  <td className="sticky start-0 bg-muted/30 p-3 font-medium text-sm">{isRTL ? 'التقييم' : 'Rating'}</td>
                  {selectedBusinesses.map((b: any) => (
                    <td key={b.id} className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-gold text-gold" />
                        <span className="font-bold">{Number(b.rating_avg).toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({b.rating_count})</span>
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Category */}
                <tr>
                  <td className="sticky start-0 bg-background p-3 font-medium text-sm">{isRTL ? 'التخصص' : 'Category'}</td>
                  {selectedBusinesses.map((b: any) => (
                    <td key={b.id} className="p-3 text-center text-sm">
                      {b.categories ? (isRTL ? b.categories.name_ar : b.categories.name_en) : '-'}
                    </td>
                  ))}
                </tr>
                {/* Location */}
                <tr className="bg-muted/30">
                  <td className="sticky start-0 bg-muted/30 p-3 font-medium text-sm">{isRTL ? 'الموقع' : 'Location'}</td>
                  {selectedBusinesses.map((b: any) => (
                    <td key={b.id} className="p-3 text-center text-sm">
                      <span className="flex items-center justify-center gap-1"><MapPin className="w-3 h-3" />{b.cities ? (isRTL ? b.cities.name_ar : b.cities.name_en) : '-'}</span>
                    </td>
                  ))}
                </tr>
                {/* Membership */}
                <tr>
                  <td className="sticky start-0 bg-background p-3 font-medium text-sm">{isRTL ? 'العضوية' : 'Tier'}</td>
                  {selectedBusinesses.map((b: any) => (
                    <td key={b.id} className="p-3 text-center">
                      <Badge variant={b.membership_tier === 'premium' || b.membership_tier === 'enterprise' ? 'default' : 'secondary'}>{b.membership_tier}</Badge>
                    </td>
                  ))}
                </tr>
                {/* Installments */}
                <tr className="bg-muted/30">
                  <td className="sticky start-0 bg-muted/30 p-3 font-medium text-sm">{isRTL ? 'التقسيط' : 'Installments'}</td>
                  {selectedBusinesses.map((b: any) => {
                    const s = b.provider_installment_settings?.[0];
                    return (
                      <td key={b.id} className="p-3 text-center text-sm">
                        {s?.is_enabled ? (
                          <span className="text-green-600 font-medium">{isRTL ? `حتى ${s.max_installments} أقساط` : `Up to ${s.max_installments}`}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {/* Services */}
                <tr><td colSpan={selectedBusinesses.length + 1} className="p-3 font-bold text-sm border-t border-border">{isRTL ? 'الخدمات والأسعار' : 'Services & Pricing'}</td></tr>
                {allServices.map((serviceName, i) => (
                  <tr key={serviceName} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                    <td className={`sticky start-0 ${i % 2 === 0 ? 'bg-muted/30' : 'bg-background'} p-3 text-sm`}>{serviceName}</td>
                    {selectedBusinesses.map((b: any) => {
                      const svc = (b.business_services ?? []).find((s: any) => (isRTL ? s.name_ar : (s.name_en || s.name_ar)) === serviceName);
                      return (
                        <td key={b.id} className="p-3 text-center text-sm">
                          {svc ? (
                            <span className="font-mono">
                              {svc.price_from ? `${Number(svc.price_from).toLocaleString()}` : ''}
                              {svc.price_to ? ` - ${Number(svc.price_to).toLocaleString()}` : ''}
                              {(svc.price_from || svc.price_to) ? ` ${svc.currency_code}` : (isRTL ? 'متوفر' : 'Available')}
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Visit profile */}
                <tr>
                  <td className="sticky start-0 bg-background p-3" />
                  {selectedBusinesses.map((b: any) => (
                    <td key={b.id} className="p-3 text-center">
                      <Link to={`/${b.username}`}>
                        <Button size="sm" variant="outline"><ArrowIcon className="w-3 h-3 me-1" />{isRTL ? 'زيارة الملف' : 'View Profile'}</Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Compare;
