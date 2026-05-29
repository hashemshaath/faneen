import React, { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listPublicBusinessesForSector } from '@/modules/businesses';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { ArrowLeft, Building2, MapPin, Send, Star } from 'lucide-react';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { SECTORS_SEO, type SeoSectorSlug } from '@/lib/sectors-seo';
import { SA_CITIES } from '@/lib/sa-cities';
import { buildBreadcrumbList } from '@/lib/seo/structured-data';
import { SectorWorksGallery, SECTOR_TO_CATEGORY_SLUGS as GALLERY_SECTOR_MAP } from '@/components/sectors/SectorWorksGallery';

// Featured cities surfaced on the brief landing (top markets).
const FEATURED_CITY_SLUGS = ['riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'madinah'];

// Map SEO sector slug -> category slugs in the directory.
const SECTOR_TO_CATEGORY_SLUGS = GALLERY_SECTOR_MAP;

type ProviderRow = {
  id: string;
  username: string;
  name_ar: string;
  name_en: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean | null;
  city_id: string | null;
  membership_tier: string | null;
  cities: { id: string; name_ar: string; name_en: string | null; slug?: string | null } | null;
};

const SectorBrief: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const sector = slug && SECTORS_SEO[slug as SeoSectorSlug] ? SECTORS_SEO[slug as SeoSectorSlug] : null;

  const pageUrl = sector ? `https://qitaat.com/sector/${sector.slug}` : 'https://qitaat.com/sectors';
  const quoteHref = sector ? `/quote?sector=${sector.slug}` : '/quote';
  const searchHref = sector?.searchSector ? `/search?sector=${sector.searchSector}` : '/search';

  usePageMeta({
    title: sector ? `${sector.shortName} – مزودون حسب المدينة | قطاعات` : 'القطاعات | قطاعات',
    description: sector?.metaDescription ?? '',
    canonical: pageUrl,
    ogType: 'website',
    ogTitle: sector?.h1,
    ogDescription: sector?.hero,
  });

  useMultiJsonLd(
    useMemo(() => {
      if (!sector) return null;
      const blocks: Record<string, unknown>[] = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: sector.h1,
          url: pageUrl,
          inLanguage: 'ar-SA-u-nu-latn',
          description: sector.metaDescription,
        },
      ];
      const bc = buildBreadcrumbList([
        { name: 'القطاعات', url: '/sectors' },
        { name: sector.shortName, url: `/sector/${sector.slug}` },
      ]);
      if (bc) blocks.push(bc);
      return blocks;
    }, [sector, pageUrl]),
  );

  const featuredCities = useMemo(
    () => SA_CITIES.filter((c) => FEATURED_CITY_SLUGS.includes(c.slug)),
    [],
  );

  const categorySlugs = sector ? SECTOR_TO_CATEGORY_SLUGS[sector.slug] : [];

  const { data: categoryIds = [] } = useQuery({
    queryKey: ['sector-brief-cats', categorySlugs.join(',')],
    enabled: categorySlugs.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, slug')
        .in('slug', categorySlugs);
      return (data ?? []).map((c) => c.id as string);
    },
  });

  const cityNameEns = useMemo(() => featuredCities.map((c) => c.nameEn), [featuredCities]);

  const { data: cityRows = [] } = useQuery({
    queryKey: ['sector-brief-cities', cityNameEns.join(',')],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('cities')
        .select('id, name_ar, name_en')
        .in('name_en', cityNameEns);
      return data ?? [];
    },
  });

  const cityIdToSlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const cr of cityRows) {
      const match = featuredCities.find((c) => c.nameEn === (cr as { name_en: string }).name_en);
      if (match) map.set((cr as { id: string }).id, match.slug);
    }
    return map;
  }, [cityRows, featuredCities]);

  const cityIds = useMemo(() => cityRows.map((c) => (c as { id: string }).id), [cityRows]);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['sector-brief-providers', categoryIds, cityIds],
    enabled: categoryIds.length > 0 && cityIds.length > 0,
    queryFn: async () => {
      const { data } = await listPublicBusinessesForSector({
        select:
          'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, city_id, membership_tier, cities(id, name_ar, name_en)',
        filters: [
          { column: 'category_id', op: 'in', value: categoryIds },
          { column: 'city_id', op: 'in', value: cityIds },
          { column: 'is_active', op: 'eq', value: true },
        ],
        orderBy: { column: 'rating_avg', ascending: false },
        limit: 300,
      });
      return (data ?? []) as unknown as ProviderRow[];
    },
  });

  const groupedByCity = useMemo(() => {
    const map = new Map<string, ProviderRow[]>();
    for (const p of providers) {
      if (!p.city_id) continue;
      const arr = map.get(p.city_id) ?? [];
      arr.push(p);
      map.set(p.city_id, arr);
    }
    // Sort within each city by ranking score
    for (const [k, list] of map) {
      list.sort((a, b) => {
        const score = (x: ProviderRow) =>
          Number(x.rating_avg ?? 0) * Math.log10((x.rating_count ?? 0) + 2) +
          (x.is_verified ? 0.4 : 0) +
          (x.membership_tier === 'platinum' ? 0.3 : x.membership_tier === 'gold' ? 0.2 : 0);
        return score(b) - score(a);
      });
      map.set(k, list.slice(0, 4));
    }
    return map;
  }, [providers]);

  if (!slug || !sector) {
    return <Navigate to="/sectors" replace />;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      <header className="bg-primary pt-28 pb-10">
        <div className="container px-4">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-3" aria-label="breadcrumb">
            <Link to="/" className="hover:text-gold transition-colors">الرئيسية</Link>
            <span>/</span>
            <Link to="/sectors" className="hover:text-gold transition-colors">القطاعات</Link>
            <span>/</span>
            <span className="text-primary-foreground">{sector.shortName}</span>
          </nav>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground">
            {sector.h1}
          </h1>
          <p className="mt-3 text-primary-foreground/80 text-sm sm:text-base max-w-2xl leading-relaxed">
            {sector.hero}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={quoteHref}>
              <Button size="lg" className="rounded-xl bg-gold text-primary hover:bg-gold/90 font-bold h-12 px-6">
                <Send className="w-4 h-4 ms-2" />
                {sector.primaryCta}
              </Button>
            </Link>
            <Link to={searchHref}>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl h-12 px-6 bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                {sector.secondaryCta}
              </Button>
            </Link>
            <Link to={`/sectors/${sector.slug}`}>
              <Button
                size="lg"
                variant="ghost"
                className="rounded-xl h-12 px-5 text-primary-foreground hover:bg-primary-foreground/10"
              >
                التفاصيل الكاملة
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-4 py-12 space-y-12">
        {/* Brief services */}
        <section aria-labelledby="brief-services">
          <h2 id="brief-services" className="font-heading text-2xl font-bold mb-4">{sector.shortName} – خدمات شائعة</h2>
          <div className="flex flex-wrap gap-2">
            {sector.services.slice(0, 8).map((s) => (
              <span key={s} className="text-sm bg-muted text-foreground rounded-full px-3 py-1.5">
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Real works gallery */}
        <SectorWorksGallery sectorSlug={sector.slug} limit={16} />

        {/* Providers by city */}
        <section aria-labelledby="providers-by-city">
          <h2 id="providers-by-city" className="font-heading text-2xl font-bold mb-5">
            مزودو {sector.shortName} حسب المدينة
          </h2>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredCities.map((city) => {
                const cityRow = cityRows.find((c) => (c as { name_en: string }).name_en === city.nameEn) as
                  | { id: string }
                  | undefined;
                const list = cityRow ? groupedByCity.get(cityRow.id) ?? [] : [];
                const cityHref = `/sectors/${sector.slug}/${city.slug}`;

                return (
                  <Card key={city.slug} className="hover-lift">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-heading font-bold text-base flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          {city.nameAr}
                        </h3>
                        <Link to={cityHref} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                          عرض الكل
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {list.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3">
                          لا يوجد مزودون مدرجون حاليًا في {city.nameAr}.
                        </p>
                      ) : (
                        <ul className="space-y-2.5">
                          {list.map((p) => (
                            <li key={p.id}>
                              <Link
                                to={`/business/${p.username}`}
                                className="flex items-center gap-3 rounded-lg p-2 -m-2 hover:bg-muted/60 transition-colors"
                              >
                                <div className="w-9 h-9 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                                  {p.logo_url ? (
                                    <img src={p.logo_url} alt={p.name_ar} className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold truncate">{p.name_ar}</span>
                                    {p.is_verified ? <VerifiedBadge size="xs" /> : null}
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground tech-content">
                                    <Star className="w-3 h-3 fill-gold text-gold" />
                                    {Number(p.rating_avg ?? 0).toFixed(1)}
                                    <span className="opacity-70">({p.rating_count ?? 0})</span>
                                  </div>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-primary/5 border border-primary/10 p-6 sm:p-8 text-center">
          <h2 className="font-heading text-2xl font-bold">جاهز ترسل تفاصيل مشروعك؟</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            أرسل طلب عرض سعر منظم لـ{sector.shortName}. يتم توجيهه لمزودي الخدمة المناسبين حسب المدينة.
          </p>
          <Link to={quoteHref} className="inline-block mt-5">
            <Button size="lg" className="rounded-xl h-12 px-6">
              <Send className="w-4 h-4 ms-2" />
              {sector.primaryCta}
            </Button>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SectorBrief;