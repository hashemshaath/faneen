import React, { useEffect, useMemo, useState } from 'react';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, ogImageFor } from '@/lib/seo/structured-data';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listCompareBusinesses, listBusinessesByIds } from '@/modules/businesses';

// Loose row shapes for the Compare picker + detail view. These mirror the
// fields previously inferred from the Supabase typed `from('businesses')`
// queries; we type them locally so the catalog service wrappers can stay
// generic. New fields used by the template must be added here.
type CompareJoinedName = { name_ar: string | null; name_en: string | null } | null;
type CompareBizRow = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  categories: CompareJoinedName;
  cities: CompareJoinedName;
};
type CompareService = {
  name_ar: string;
  name_en: string | null;
  price_from: number | string | null;
  price_to: number | string | null;
  currency_code: string | null;
};
type CompareInstallment = Record<string, unknown>;
type CompareBizDetailRow = CompareBizRow & {
  is_verified?: boolean | null;
  membership_tier?: string | null;
  business_services?: CompareService[] | null;
  provider_installment_settings?: CompareInstallment[] | null;
  [key: string]: unknown;
};
import { useLanguage } from '@/i18n/LanguageContext';
import { getMembershipTierLabel } from '@/modules/memberships';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MapPin, Plus, X, ArrowRight, ArrowLeft, Scale, Search, Download, Filter, GitCompare, CheckCircle2, Info, MoveHorizontal } from 'lucide-react';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { track } from '@/lib/analytics-events';

const Compare = () => {
  const { isRTL } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const selectedIds = useMemo(() => {
    const ids = searchParams.get('ids');
    return ids ? ids.split(',').filter(Boolean) : [];
  }, [searchParams]);

  // compare_start fires once per Compare page mount.
  useEffect(() => { track.compareStart({}); }, []);

  usePageMeta({
    title: isRTL ? 'مقارنة مزودي الخدمات | قِطاعات' : 'Compare Service Providers | Qitaat',
    description: isRTL ? 'قارن بين مزودي خدمات الألمنيوم والحديد من حيث الأسعار والتقييمات والخدمات.' : 'Compare aluminum and iron service providers by price, ratings and services.',
    canonical: selectedIds.length
      ? `https://qitaat.com/compare?ids=${[...selectedIds].sort().join(',')}`
      : 'https://qitaat.com/compare',
    noindex: selectedIds.length > 0,
    ogTitle: isRTL ? 'مقارنة مزودي الخدمات — قِطاعات' : 'Compare Service Providers — Qitaat',
    ogDescription: isRTL
      ? 'أداة مقارنة احترافية بين مزودي الألمنيوم والحديد والزجاج: أسعار، تقييمات، خدمات.'
      : 'Professional comparison of aluminum, iron and glass providers: pricing, reviews, services.',
    ogImage: ogImageFor('compare'),
    keywords: isRTL
      ? 'مقارنة, ألمنيوم, حديد, زجاج, مزودي خدمات, تقييمات, أسعار'
      : 'compare, aluminum, iron, glass, providers, ratings, pricing',
  });

  useMultiJsonLd(useMemo(() => {
    const crumbs = buildBreadcrumbList(
      [{ name: isRTL ? 'مقارنة المزودين' : 'Compare Providers', url: '/compare' }],
    );
    return crumbs ? [crumbs] : null;
  }, [isRTL]));

  const [searchQuery, setSearchQuery] = useState('');

  const { data: allBusinesses = [] } = useQuery<CompareBizRow[]>({
    queryKey: ['businesses-for-compare'],
    queryFn: async () => {
      const { data } = await listCompareBusinesses<CompareBizRow>();
      return data ?? [];
    },
  });

  const { data: selectedBusinesses = [], isLoading: isLoadingSelected } = useQuery<CompareBizDetailRow[]>({
    queryKey: ['compare-businesses', selectedIds],
    queryFn: async () => {
      if (!selectedIds.length) return [];
      const { data } = await listBusinessesByIds<CompareBizDetailRow>({
        ids: selectedIds,
        // PERF-1D.2 — explicit parent allow-list (9 columns) replaces `*`
        // on the `businesses` table. Every retained field is verified used
        // by the Compare table:
        //   id              — React keys + relation joins
        //   username        — `/${b.username}` profile link
        //   name_ar/en      — provider name (header, table, PDF export)
        //   logo_url        — provider logo (table header, picker)
        //   rating_avg/_count — rating row + PDF export
        //   is_verified     — VerifiedBadge in table header
        //   membership_tier — membership tier badge + PDF export
        // ~77 unused parent columns are dropped — including PII fields like
        // email, phone, national_id, vat_number, cr_document_*, and
        // account_manager_* that the public Compare page never needs to
        // surface. Embedded relations remain trimmed from PERF-1D. Triple-
        // gate filters below still apply at the DB level even though
        // is_active/provider_status/admin_status are not selected on the
        // embedded business_services rows.
        select:
          'id, username, name_ar, name_en, logo_url, ' +
          'rating_avg, rating_count, is_verified, membership_tier, ' +
          'categories(name_ar, name_en), cities(name_ar, name_en), ' +
          'business_services(name_ar, name_en, price_from, price_to, currency_code), ' +
          'provider_installment_settings(is_enabled, max_installments)',
        // SERVICE-ACTIVATION-GOVERNANCE-FINAL — only embed eligible
        // services (is_active + provider_status + admin_status all aligned).
        // Mirrors the triple-gate enforced by catalog reads / search.
        nestedEq: [
          ['business_services.is_active', true],
          ['business_services.provider_status', 'active'],
          ['business_services.admin_status', 'allowed'],
        ],
      });
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
    const biz = allBusinesses.find(b => b.id === id);
    track.compareProfileAdded({
      business_slug: biz?.username,
      results_count: selectedIds.length + 1,
    });
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
    selectedBusinesses.forEach((b) => {
      (b.business_services ?? []).forEach((s) => {
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
        <div className="container-app text-center">
          <Scale className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-heading font-bold text-3xl text-primary-foreground mb-2">
            {isRTL ? 'مقارنة مزودي الخدمة' : 'Compare Providers'}
          </h1>
          <p className="text-primary-foreground/60 font-body">
            {isRTL ? 'قارن حتى 4 مزودين جنباً إلى جنب' : 'Compare up to 4 providers side by side'}
          </p>
        </div>
      </div>

      <div className="container-app py-6 space-y-6">
        {/* Search to add */}
        <Card>
          <CardContent className="card-pad-md">
            <div className="relative">
              <Search className="absolute start-3 top-3 ic-sm text-muted-foreground" />
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
                      {b.logo_url ? <img src={b.logo_url} alt={isRTL ? b.name_ar : (b.name_en || b.name_ar)} className="w-full h-full object-cover" /> : <span className="text-xs font-bold">{b.name_ar[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</p>
                      <p className="text-xs text-muted-foreground">{(b as Record<string, unknown> & { categories?: { name_ar?: string } }).categories?.name_ar}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs"><Star className="ic-2xs fill-gold text-gold" />{Number(b.rating_avg).toFixed(1)}</div>
                    <Plus className="ic-sm text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedIds.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 sm:py-16 text-center">
              <Scale className="w-14 h-14 sm:w-16 sm:h-16 mb-4 opacity-30 text-muted-foreground" />
              <p className="text-lg sm:text-xl font-heading font-bold text-foreground mb-1">
                {isRTL ? 'ابدأ المقارنة' : 'Start comparing'}
              </p>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                {isRTL
                  ? 'أضف جهتين أو أكثر للمقارنة حتى تظهر الفروقات بوضوح: التقييم، التخصص، الموقع، الخدمات وخيارات التقسيط.'
                  : 'Add two or more providers to clearly see the differences: ratings, category, location, services and installment options.'}
              </p>
              {/* How it works — 3 simple steps so users understand the flow */}
              <ol className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full text-start">
                {[
                  { icon: Filter, t: isRTL ? '1. ابحث وصفِّ النتائج' : '1. Search & filter', d: isRTL ? 'استخدم الفلاتر لتقريب المزودين المناسبين لقطاعك ومدينتك.' : 'Use filters to narrow providers by sector and city.' },
                  { icon: GitCompare, t: isRTL ? '2. أضف للمقارنة' : '2. Add to compare', d: isRTL ? 'اختر حتى 4 جهات لمقارنة التقييم والخدمات والتقسيط جنباً إلى جنب.' : 'Pick up to 4 providers to compare ratings, services and installments.' },
                  { icon: CheckCircle2, t: isRTL ? '3. قرّر وتواصل' : '3. Decide & contact', d: isRTL ? 'استعرض الملف وأرسل طلب عرض سعر منظّم عبر قِطاعات.' : 'Open the profile and send an organized quote request via Qitaat.' },
                ].map(({ icon: Icon, t, d }) => (
                  <li key={t} className="rounded-xl border border-border/30 bg-card/50 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 text-accent">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <p className="text-xs font-heading font-bold text-foreground">{t}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{d}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="default" className="rounded-xl">
                  <Link to="/search">{isRTL ? 'ابحث عن مزودين' : 'Find providers'}</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/sectors">{isRTL ? 'تصفّح القطاعات' : 'Browse sectors'}</Link>
                </Button>
              </div>
              <p className="mt-5 text-[11px] text-muted-foreground/80 max-w-md leading-relaxed">
                {isRTL
                  ? 'المقارنة تساعدك في تنظيم خياراتك ولا تضمن نتائج التنفيذ. أرسل طلبك للجهة عبر قِطاعات قبل اتخاذ القرار.'
                  : 'Comparison helps you organize options but does not guarantee execution. Send your request through Qitaat before deciding.'}
              </p>
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
          {/* Hint: comparison is clearer with 2+ providers */}
          {selectedBusinesses.length === 1 && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 sm:p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-bold text-foreground">
                  {isRTL ? 'أضف جهة ثانية للمقارنة' : 'Add a second provider'}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  {isRTL
                    ? 'المقارنة أوضح وأفيد عند اختيار جهتين أو أكثر. استخدم البحث في الأعلى أو ارجع لصفحة البحث لإضافة جهات.'
                    : 'Comparison is clearer with two or more providers. Use the search above or return to the search page to add more.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="rounded-lg h-8">
                    <Link to="/search">{isRTL ? 'العودة للبحث' : 'Back to search'}</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const businesses = selectedBusinesses.map((b) => ({
                  name: isRTL ? b.name_ar : (b.name_en || b.name_ar),
                  rating: Number(b.rating_avg).toFixed(1),
                  ratingCount: b.rating_count,
                  category: b.categories ? (isRTL ? b.categories.name_ar : b.categories.name_en) : '-',
                  location: b.cities ? (isRTL ? b.cities.name_ar : b.cities.name_en) : '-',
                  tier: b.membership_tier,
                  installments: b.provider_installment_settings?.[0]?.is_enabled
                    ? (isRTL ? `حتى ${b.provider_installment_settings[0].max_installments} أقساط` : `Up to ${b.provider_installment_settings[0].max_installments}`)
                    : '-',
                  services: (b.business_services ?? []).map((s) => {
                    const name = isRTL ? s.name_ar : (s.name_en || s.name_ar);
                    let price = '';
                    if (s.price_from) price += Number(s.price_from).toLocaleString();
                    if (s.price_to) price += ` - ${Number(s.price_to).toLocaleString()}`;
                    if (s.price_from || s.price_to) price += ` ${s.currency_code}`;
                    else price = isRTL ? 'متوفر' : 'Available';
                    return { name, price };
                  }),
                }));
                import('@/lib/compare-pdf-export').then(({ exportComparePDF }) =>
                  exportComparePDF({ businesses, allServices, isRTL })
                );
              }}
            >
              <Download className="ic-sm me-1" />
              {isRTL ? 'تصدير PDF' : 'Export PDF'}
            </Button>
          </div>
          {/* Mobile scroll affordance for the comparison table */}
          <div className="md:hidden flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <MoveHorizontal className="w-3.5 h-3.5" />
            {isRTL ? 'اسحب أفقياً لعرض كل الأعمدة' : 'Swipe horizontally to see all columns'}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky start-0 bg-background z-10 p-3 text-start min-w-[140px] border-b border-border" />
                  {selectedBusinesses.map((b) => (
                    <th key={b.id} className="p-3 min-w-[220px] border-b border-border">
                      <div className="flex flex-col items-center gap-2 relative">
                        <button onClick={() => removeBusiness(b.id)} className="absolute -top-1 -end-1 p-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20">
                          <X className="w-3 h-3" />
                        </button>
                        <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden">
                          {b.logo_url ? <img src={b.logo_url} alt={isRTL ? b.name_ar : (b.name_en || b.name_ar)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xl">{b.name_ar[0]}</div>}
                        </div>
                        <Link to={`/${b.username}`} className="font-medium text-sm hover:text-gold transition-colors text-center">
                          {isRTL ? b.name_ar : (b.name_en || b.name_ar)}
                        </Link>
                        {b.is_verified && <VerifiedBadge size="sm" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Rating */}
                <tr className="bg-muted/30">
                  <td className="sticky start-0 bg-muted/30 p-3 font-medium text-sm">{isRTL ? 'التقييم' : 'Rating'}</td>
                  {selectedBusinesses.map((b) => (
                    <td key={b.id} className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="ic-sm fill-gold text-gold" />
                        <span className="font-bold">{Number(b.rating_avg).toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({b.rating_count})</span>
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Category */}
                <tr>
                  <td className="sticky start-0 bg-background p-3 font-medium text-sm">{isRTL ? 'التخصص' : 'Category'}</td>
                  {selectedBusinesses.map((b) => (
                    <td key={b.id} className="p-3 text-center text-sm">
                      {b.categories ? (isRTL ? b.categories.name_ar : b.categories.name_en) : '-'}
                    </td>
                  ))}
                </tr>
                {/* Location */}
                <tr className="bg-muted/30">
                  <td className="sticky start-0 bg-muted/30 p-3 font-medium text-sm">{isRTL ? 'الموقع' : 'Location'}</td>
                  {selectedBusinesses.map((b) => (
                    <td key={b.id} className="p-3 text-center text-sm">
                      <span className="flex items-center justify-center gap-1"><MapPin className="ic-2xs" />{b.cities ? (isRTL ? b.cities.name_ar : b.cities.name_en) : '-'}</span>
                    </td>
                  ))}
                </tr>
                {/* Membership */}
                <tr>
                  <td className="sticky start-0 bg-background p-3 font-medium text-sm">{isRTL ? 'العضوية' : 'Tier'}</td>
                  {selectedBusinesses.map((b) => (
                    <td key={b.id} className="p-3 text-center">
                      <Badge variant={b.membership_tier === 'premium' || b.membership_tier === 'enterprise' ? 'default' : 'secondary'}>{getMembershipTierLabel(b.membership_tier, isRTL ? 'ar' : 'en')}</Badge>
                    </td>
                  ))}
                </tr>
                {/* Installments */}
                <tr className="bg-muted/30">
                  <td className="sticky start-0 bg-muted/30 p-3 font-medium text-sm">{isRTL ? 'التقسيط' : 'Installments'}</td>
                  {selectedBusinesses.map((b) => {
                    const s = b.provider_installment_settings?.[0];
                    return (
                      <td key={b.id} className="p-3 text-center text-sm">
                        {s?.is_enabled ? (
                          <span className="text-success font-medium">{isRTL ? `حتى ${s.max_installments} أقساط` : `Up to ${s.max_installments}`}</span>
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
                    {selectedBusinesses.map((b) => {
                      const svc = (b.business_services ?? []).find((s) => (isRTL ? s.name_ar : (s.name_en || s.name_ar)) === serviceName);
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
                  {selectedBusinesses.map((b) => (
                    <td key={b.id} className="p-3 text-center">
                      <Link to={`/${b.username}`}>
                        <Button size="sm" variant="outline"><ArrowIcon className="ic-2xs me-1" />{isRTL ? 'زيارة الملف' : 'View Profile'}</Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 sm:p-5 dark:border-border/20 dark:bg-card/40">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isRTL
                ? 'الحقول الفارغة (—) تعني أن المزود لم يُدرج هذه القيمة في ملفه بعد. المقارنة تساعدك في تنظيم خياراتك ولا تضمن نتائج التنفيذ.'
                : 'Empty fields (—) mean the provider has not listed that value on their profile yet. Comparison helps you organize options but does not guarantee execution.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button asChild variant="default" size="sm" className="rounded-xl">
                <Link to="/search">{isRTL ? 'العودة للبحث' : 'Back to search'}</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to="/sectors">{isRTL ? 'استكشف القطاعات' : 'Explore sectors'}</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to="/contact">{isRTL ? 'اطلب عرض سعر' : 'Request a quote'}</Link>
              </Button>
            </div>
          </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Compare;
