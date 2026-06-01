/**
 * BRANDS-GOVERNANCE-3 — Public Brand Registry catalog.
 *
 * Lists only approved brands (RLS-enforced via `brands_public` view).
 * Pending / rejected / archived / merged brands are never exposed.
 *
 * Every Supabase access routes through `@/modules/brands` — no direct
 * client calls. Verified by `scripts/brands-isolation-audit.mjs`.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Globe2, ShieldCheck, Tag, FileText, Layers } from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList } from '@/lib/seo/structured-data';
import { listApprovedBrands, listSectorsLite } from '@/modules/brands';

const ALL = '__all__';
const SITE = 'https://qitaat.com';

const BrandsCatalog: React.FC = () => {
  const { isRTL } = useLanguage();
  const [q, setQ] = useState('');
  const [sectorId, setSectorId] = useState<string>(ALL);
  const [country, setCountry] = useState<string>(ALL);
  const [verifiedOnly, setVerifiedOnly] = useState<string>(ALL);

  usePageMeta({
    title: isRTL ? 'سجل العلامات التجارية الصناعية' : 'Industrial Brands Registry',
    description: isRTL
      ? 'استكشف العلامات التجارية الصناعية المعتمدة في قِطاعات: ألمنيوم، زجاج، حديد، أخشاب وأكثر.'
      : 'Browse approved industrial brands on Qitaat — aluminium, glass, steel, wood, and more.',
    canonical: `${SITE}/brands`,
    ogType: 'website',
  });

  const { data: sectors = [] } = useQuery({
    queryKey: ['brands-sectors-lite'],
    queryFn: listSectorsLite,
    staleTime: 5 * 60_000,
  });

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['public-brands', sectorId, country, q],
    queryFn: () =>
      listApprovedBrands({
        sectorId: sectorId === ALL ? undefined : sectorId,
        countryCode: country === ALL ? undefined : country,
        q: q.trim() || undefined,
        limit: 200,
      }),
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    if (verifiedOnly !== 'verified') return brands;
    return brands.filter((b) => b.is_verified);
  }, [brands, verifiedOnly]);

  const countries = useMemo(() => {
    const set = new Map<string, { code: string; name: string }>();
    for (const b of brands) {
      if (b.country_of_origin_code) {
        set.set(b.country_of_origin_code, {
          code: b.country_of_origin_code,
          name: (isRTL ? b.country_of_origin_name_ar : b.country_of_origin_name_en) || b.country_of_origin_code,
        });
      }
    }
    return Array.from(set.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [brands, isRTL]);

  useMultiJsonLd([
    buildBreadcrumbList(
      [{ name: isRTL ? 'العلامات التجارية' : 'Brands', url: '/brands' }],
      { homeName: isRTL ? 'الرئيسية' : 'Home', id: `${SITE}/brands#breadcrumb` },
    )!,
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: isRTL ? 'سجل العلامات التجارية الصناعية' : 'Industrial Brands Registry',
      url: `${SITE}/brands`,
      isPartOf: { '@type': 'WebSite', name: 'Qitaat', url: SITE },
    },
    // SEO-3 — ItemList of visibly-rendered approved brands (brands_public).
    // `filtered` is sourced from listApprovedBrands → brands_public view, so
    // pending / rejected / archived / merged brands are never enumerated.
    ...(filtered.length > 0
      ? [{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          '@id': `${SITE}/brands#brands`,
          name: isRTL ? 'سجل العلامات التجارية الصناعية' : 'Industrial Brands Registry',
          numberOfItems: filtered.filter((b) => b.slug).length,
          itemListElement: filtered
            .filter((b) => !!b.slug)
            .map((b, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE}/brands/${b.slug}`,
              name: (isRTL ? b.name_ar : (b.name_en || b.name_ar)) || b.name_ar,
            })),
        }]
      : []),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {isRTL ? 'سجل العلامات التجارية الصناعية' : 'Industrial Brands Registry'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {isRTL
              ? 'علامات تجارية معتمدة من إدارة قِطاعات. كل علامة هنا تمت مراجعتها قبل النشر.'
              : 'Brands curated and approved by the Qitaat team. Every brand listed here has been reviewed before publication.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" className="rounded-xl h-10">
              <Link to="/quote">
                <FileText className="h-4 w-4 me-1.5" />
                {isRTL ? 'اطلب عرض سعر' : 'Request a quote'}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl h-10">
              <Link to="/sectors">
                <Layers className="h-4 w-4 me-1.5" />
                {isRTL ? 'استكشف القطاعات' : 'Explore sectors'}
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? 'استخدم العلامة التجارية عندما تكون لديك مواصفات محددة. العلامات تظهر بعد الاعتماد فقط.'
              : 'Use the brand entry when you have specific specs. Brands appear only after approval.'}
          </p>
        </header>

        <Card>
          <CardContent className="p-4 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
              <Input dir="auto" className="ps-10 h-11" placeholder={isRTL ? 'ابحث بالاسم…' : 'Search by name…'}
                     value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={sectorId} onValueChange={setSectorId}>
              <SelectTrigger className="h-11"><SelectValue placeholder={isRTL ? 'القطاع' : 'Sector'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{isRTL ? 'كل القطاعات' : 'All sectors'}</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-11"><SelectValue placeholder={isRTL ? 'بلد المنشأ' : 'Origin'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{isRTL ? 'كل البلدان' : 'All countries'}</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={verifiedOnly} onValueChange={setVerifiedOnly}>
                <SelectTrigger className="h-11"><SelectValue placeholder={isRTL ? 'التحقق' : 'Verification'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{isRTL ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="verified">{isRTL ? 'موثقة فقط' : 'Verified only'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center space-y-4">
            <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-heading font-bold text-foreground mb-1">
                {isRTL ? 'لا توجد علامات مطابقة' : 'No brands match'}
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {isRTL ? 'جرّب توسيع الفلاتر، أو استعرض القطاعات والخدمات للوصول للمزودين مباشرة.' : 'Try widening the filters, or browse sectors and services to reach providers directly.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild size="sm" className="rounded-xl">
                <Link to="/quote">{isRTL ? 'اطلب عرض سعر' : 'Request a quote'}</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link to="/sectors">{isRTL ? 'استكشف القطاعات' : 'Explore sectors'}</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link to="/services">{isRTL ? 'استعرض الخدمات' : 'Browse services'}</Link>
              </Button>
            </div>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => {
              const display = isRTL ? b.name_ar : (b.name_en || b.name_ar);
              return (
                <Link key={b.id} to={b.slug ? `/brands/${b.slug}` : '#'} className="group">
                  <Card className="hover-lift h-full">
                    <CardContent className="p-4 flex gap-3 items-start">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={display} loading="lazy" decoding="async"
                             width={56} height={56}
                             className="h-14 w-14 rounded-lg border bg-background object-cover" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-primary/10 grid place-items-center text-primary">
                          <Tag className="h-6 w-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold truncate">{display}</span>
                          {b.is_verified && (
                            <Badge variant="secondary" className="gap-1 text-[10px]">
                              <ShieldCheck className="h-3 w-3" />{isRTL ? 'موثقة' : 'Verified'}
                            </Badge>
                          )}
                        </div>
                        {b.brand_owner_company && (
                          <p className="text-xs text-muted-foreground truncate">{b.brand_owner_company}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {b.country_of_origin_code && (
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              <Globe2 className="h-3 w-3" />
                              {(isRTL ? b.country_of_origin_name_ar : b.country_of_origin_name_en) || b.country_of_origin_code}
                            </Badge>
                          )}
                          {b.is_local && (
                            <Badge variant="outline" className="text-[10px]">
                              {isRTL ? 'محلية' : 'Local'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <Card className="bg-muted/30">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">{isRTL ? 'تبحث عن قطاع خاص أو وكالة محلية؟' : 'Looking for a private sub-sector or local agency?'}</p>
              <p className="text-muted-foreground text-xs">
                {isRTL ? 'القطاعات الخاصة والوكالات الحصرية لها سجلها الخاص.' : 'Private sectors and exclusive agencies have their own directory.'}
              </p>
            </div>
            <Link to="/private-sectors" className="text-sm text-primary hover:underline">
              {isRTL ? 'تصفح القطاعات الخاصة ←' : 'Browse private sectors →'}
            </Link>
          </CardContent>
        </Card>

        {/* Cross-link to sectors/services hubs (internal linking — SEO-6) */}
        <nav aria-label={isRTL ? 'استكشف المزيد' : 'Explore more'} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-base font-bold mb-3">
            {isRTL ? 'قطاعات وخدمات مرتبطة' : 'Related sectors & services'}
          </h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            <li>
              <Link to="/sectors" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">
                {isRTL ? 'كل القطاعات' : 'All sectors'}
              </Link>
            </li>
            <li>
              <Link to="/services" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">
                {isRTL ? 'الخدمات' : 'Services'}
              </Link>
            </li>
            <li>
              <Link to="/showcase" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">
                {isRTL ? 'أعمال المزودين' : 'Provider showcase'}
              </Link>
            </li>
          </ul>
        </nav>
      </main>
      <Footer />
    </div>
  );
};

export default BrandsCatalog;