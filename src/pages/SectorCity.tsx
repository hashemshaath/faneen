import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import {
  buildBreadcrumbList, buildFaqPage, ogImageFor, SITE_URL,
} from '@/lib/seo/structured-data';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, MapPin, Search as SearchIcon, Star, ArrowLeft, ArrowRight,
  MessageSquare, CalendarCheck, Phone, Trophy, Crown, SlidersHorizontal,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { SECTOR_KEYWORDS, type SectorSlug, getSectorMeta } from '@/lib/sector-keywords';
import { getCityBySlug, SA_CITIES } from '@/lib/sa-cities';
import { SERVICES_CATALOG, UNIT_LABEL } from '@/lib/services-catalog';

const SECTOR_TO_CATEGORY_SLUGS: Record<SectorSlug, string[]> = {
  aluminum: ['aluminum'],
  iron: ['iron-steel'],
  glass: ['glass'],
  wood: ['wood-cabinets'],
  cabinets: ['wood-cabinets'],
};

type BizRow = {
  id: string;
  username: string;
  name_ar: string;
  name_en: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean | null;
  city_id: string | null;
  category_id: string;
  short_description_ar: string | null;
  short_description_en: string | null;
  membership_tier: string | null;
  mobile: string | null;
  phone: string | null;
  cities: { id: string; name_ar: string; name_en: string | null } | null;
};

type SortKey = 'top' | 'reviews';
type RatingFilter = 'all' | '4' | '4.5';

const SectorCity: React.FC = () => {
  const { sector: sectorParam, city: cityParam } = useParams<{ sector: string; city: string }>();
  const { isRTL, language } = useLanguage();

  const sectorSlug = sectorParam as SectorSlug;
  const sector = sectorSlug && SECTOR_KEYWORDS[sectorSlug] ? SECTOR_KEYWORDS[sectorSlug] : null;
  const city = getCityBySlug(cityParam);

  const [query, setQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<RatingFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('top');

  // Resolve city UUID from name_en (cheap one-shot query, cached forever).
  const { data: cityRow } = useQuery({
    queryKey: ['sector-city-resolve', city?.nameEn],
    enabled: !!city,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('cities')
        .select('id, name_ar, name_en')
        .eq('name_en', city!.nameEn)
        .maybeSingle();
      return data ?? null;
    },
  });

  const categorySlugs = sector ? SECTOR_TO_CATEGORY_SLUGS[sector.slug] : [];
  const { data: categories = [] } = useQuery({
    queryKey: ['sector-city-cats', categorySlugs.join(',')],
    enabled: categorySlugs.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, slug')
        .in('slug', categorySlugs);
      return data ?? [];
    },
  });
  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['sector-city-biz', sectorSlug, cityRow?.id, categoryIds],
    enabled: categoryIds.length > 0 && !!cityRow?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select(
          'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, city_id, category_id, short_description_ar, short_description_en, membership_tier, mobile, phone, cities(id, name_ar, name_en)',
        )
        .in('category_id', categoryIds)
        .eq('city_id', cityRow!.id)
        .eq('is_active', true)
        .order('rating_avg', { ascending: false })
        .limit(200);
      return (data ?? []) as unknown as BizRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minR = minRating === 'all' ? 0 : minRating === '4' ? 4 : 4.5;
    const list = businesses.filter((b) => {
      if (verifiedOnly && !b.is_verified) return false;
      if (Number(b.rating_avg ?? 0) < minR) return false;
      if (q) {
        const hay = `${b.name_ar} ${b.name_en ?? ''} ${b.username}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sortBy === 'reviews') {
      list.sort((a, b) => (b.rating_count ?? 0) - (a.rating_count ?? 0));
    } else {
      list.sort((a, b) => {
        const score = (x: BizRow) =>
          Number(x.rating_avg ?? 0) * Math.log10((x.rating_count ?? 0) + 2) +
          (x.is_verified ? 0.4 : 0) +
          (x.membership_tier === 'platinum' ? 0.3 : x.membership_tier === 'gold' ? 0.2 : 0);
        return score(b) - score(a);
      });
    }
    return list;
  }, [businesses, query, verifiedOnly, minRating, sortBy]);

  const top10 = useMemo(() => filtered.slice(0, 10), [filtered]);
  const rest = useMemo(() => filtered.slice(10), [filtered]);

  const meta = sector ? getSectorMeta(sector.slug, isRTL) : null;
  const cityName = city ? (isRTL ? city.nameAr : city.nameEn) : '';
  const cityIn = city ? (isRTL ? (city.inAr || `في ${city.nameAr}`) : `in ${city.nameEn}`) : '';

  const title = sector && city
    ? (isRTL
        ? `${meta!.name} ${cityIn} — أفضل ورش وموردين 2026 | قِطاعات`
        : `${meta!.name} ${cityIn} — top workshops & suppliers 2026 | Qitaat`)
    : (isRTL ? 'صفحة غير موجودة | قِطاعات' : 'Not found | Qitaat');

  const description = sector && city
    ? (isRTL
        ? `دليل ورش وموردي ${meta!.name} ${cityIn}: قارن المعارض، التقييمات، حالة التحقق، واطلب عرض سعر مجاني من أفضل المزودين في ${cityName}.`
        : `Directory of ${meta!.name} workshops and suppliers ${cityIn}: compare portfolios, ratings, verification status, and request free quotes from top providers in ${cityName}.`)
    : '';

  const keywords = sector && city
    ? [
        ...(isRTL ? meta!.keywords.split(',').map((k) => k.trim()) : []),
        `${isRTL ? meta!.name : meta!.name} ${cityName}`,
        `ورش ${meta?.name ?? ''} ${city?.nameAr ?? ''}`,
        `${city?.nameEn ?? ''} ${meta?.name ?? ''}`,
      ].filter(Boolean).join(', ')
    : '';

  usePageMeta({
    title,
    description,
    keywords,
    canonical: `${SITE_URL}/sectors/${sectorSlug}/${cityParam}`,
    ogImage: ogImageFor(`sector-${sectorSlug}-${cityParam}`, {
      type: 'sector',
      title: meta?.name ? `${meta.name} ${cityIn}` : undefined,
      subtitle: meta?.tagline,
    }),
    ogType: 'website',
  });

  useMultiJsonLd(
    useMemo(() => {
      if (!sector || !city || !meta) return null;
      const breadcrumb = buildBreadcrumbList([
        { name: isRTL ? 'القطاعات' : 'Sectors', url: '/sectors' },
        { name: meta.name, url: `/sectors/${sector.slug}` },
        { name: cityName, url: `/sectors/${sector.slug}/${city.slug}` },
      ])!;
      const collection = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${meta.name} ${cityIn}`,
        description,
        url: `${SITE_URL}/sectors/${sector.slug}/${city.slug}`,
        inLanguage: isRTL ? 'ar' : 'en',
        isPartOf: { '@type': 'WebSite', name: 'قِطاعات Qitaat', url: SITE_URL },
      };
      const itemList = filtered.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: isRTL ? `أفضل مزودي ${meta.name} ${cityIn}` : `Top ${meta.name} providers ${cityIn}`,
            numberOfItems: Math.min(filtered.length, 10),
            itemListElement: filtered.slice(0, 10).map((b, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE_URL}/${b.username}`,
              name: language === 'ar' ? b.name_ar : (b.name_en || b.name_ar),
            })),
          }
        : null;
      const faq = buildFaqPage([
        {
          q: isRTL ? `كيف أجد أفضل ورشة ${meta.name} ${cityIn}؟` : `How do I find the best ${meta.name} workshop ${cityIn}?`,
          a: isRTL
            ? `تصفّح قائمة قِطاعات لمزودي ${meta.name} ${cityIn}، صفِّ النتائج حسب التقييم وحالة التحقق، ثم قارن أعمالهم وأسعارهم قبل التواصل.`
            : `Browse the Qitaat listing of ${meta.name} providers ${cityIn}, filter by rating and verification, then compare portfolios and quotes before contacting.`,
        },
        {
          q: isRTL ? `هل خدمة طلب عرض السعر مجانية ${cityIn}؟` : `Is requesting a quote free ${cityIn}?`,
          a: isRTL
            ? `نعم، يمكنك التواصل مع أي مزود ${meta.name} مدرج ${cityIn} مباشرة عبر صفحته للحصول على عرض سعر مجاني وغير ملزم.`
            : `Yes — contact any listed ${meta.name} provider ${cityIn} directly from their page for a free, no-obligation quote.`,
        },
        {
          q: isRTL ? `كم متوسط أسعار ${meta.name} ${cityIn}؟` : `What is the average ${meta.name} price ${cityIn}?`,
          a: isRTL
            ? `راجع صفحة الأسعار والمقارنة لاطلاع كامل على نطاقات الأسعار حسب نوع الخدمة، أو اطلب عروضاً من 3 ورش لمقارنتها.`
            : `Check our prices & comparison page for full ranges by service type, or request 3 quotes to compare.`,
        },
      ])!;
      const blocks: Record<string, unknown>[] = [breadcrumb, collection, faq];
      if (itemList) blocks.splice(2, 0, itemList);
      return blocks;
    }, [sector, city, meta, isRTL, language, filtered, cityIn, cityName, description]),
  );

  if (sectorParam && !sector) return <Navigate to="/sectors" replace />;
  if (cityParam && !city) return <Navigate to={`/sectors/${sectorParam}`} replace />;
  if (!sector || !city || !meta) return null;

  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const sectorServices = SERVICES_CATALOG.filter((s) => s.sector === sector.slug).slice(0, 4);

  const tierLabel = (tier: string | null): string | null => {
    if (tier === 'platinum') return isRTL ? 'بلاتيني' : 'Platinum';
    if (tier === 'gold') return isRTL ? 'ذهبي' : 'Gold';
    if (tier === 'silver') return isRTL ? 'فضي' : 'Silver';
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="container py-8 md:py-12">
          <nav className="text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground">{isRTL ? 'الرئيسية' : 'Home'}</Link>
            <span className="mx-2">/</span>
            <Link to="/sectors" className="hover:text-foreground">{isRTL ? 'القطاعات' : 'Sectors'}</Link>
            <span className="mx-2">/</span>
            <Link to={`/sectors/${sector.slug}`} className="hover:text-foreground">{meta.name}</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{cityName}</span>
          </nav>

          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />{cityName}
              </Badge>
              <Badge variant="outline">{meta.name}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              {isRTL ? `${meta.name} ${cityIn}` : `${meta.name} ${cityIn}`}
            </h1>
            <p className="text-muted-foreground max-w-3xl">{description}</p>
          </header>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <SearchIcon className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-muted-foreground`} />
                <Input
                  dir="auto"
                  className={isRTL ? 'pr-9' : 'pl-9'}
                  placeholder={isRTL ? `ابحث عن ورشة ${meta.name} ${cityIn}...` : `Search a ${meta.name} workshop ${cityIn}...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Button
                variant={verifiedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerifiedOnly((v) => !v)}
              >
                {isRTL ? 'موثوق فقط' : 'Verified only'}
              </Button>
            </CardContent>
          </Card>

          {/* Listing */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {isRTL
                  ? `لم نجد بعد مزودي ${meta.name} ${cityIn}. جرّب تصفّح القطاع كاملاً.`
                  : `No ${meta.name} providers ${cityIn} yet. Try browsing the full sector.`}
                <div className="mt-4">
                  <Button asChild variant="outline">
                    <Link to={`/sectors/${sector.slug}`}>{meta.name} →</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((b) => (
                <Card key={b.id} className="hover-lift">
                  <CardContent className="p-4">
                    <Link to={`/${b.username}`} className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt={b.name_ar} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold truncate">
                            {language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)}
                          </h3>
                          {b.is_verified && <VerifiedBadge size="xs" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {language === 'ar' ? (b.cities?.name_ar || cityName) : (b.cities?.name_en || cityName)}
                        </p>
                        {Number(b.rating_avg ?? 0) > 0 && (
                          <p className="text-xs mt-1 inline-flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            <span className="tech-content">{Number(b.rating_avg).toFixed(1)}</span>
                            <span className="text-muted-foreground tech-content">({b.rating_count ?? 0})</span>
                          </p>
                        )}
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Services in this sector */}
          {sectorServices.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-4">
                {isRTL ? `أسعار خدمات ${meta.name} ${cityIn}` : `${meta.name} service prices ${cityIn}`}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {sectorServices.map((s) => (
                  <Card key={s.slug} className="hover-lift">
                    <CardContent className="p-4">
                      <Link to={`/services/${s.slug}`} className="font-semibold hover:underline">
                        {isRTL ? s.name_ar : s.name_en}
                      </Link>
                      <p className="tech-content text-sm font-medium mt-2">
                        {s.price_min.toLocaleString()}–{s.price_max.toLocaleString()} {isRTL ? 'ريال' : 'SAR'}
                        <span className="text-muted-foreground">/{isRTL ? UNIT_LABEL[s.unit].ar : UNIT_LABEL[s.unit].en}</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Other cities for this sector — internal linking for SEO */}
          <section className="mt-12">
            <h2 className="text-xl font-bold mb-3">
              {isRTL ? `${meta.name} في مدن أخرى` : `${meta.name} in other cities`}
            </h2>
            <div className="flex flex-wrap gap-2">
              {SA_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
                <Button key={c.slug} asChild variant="outline" size="sm">
                  <Link to={`/sectors/${sector.slug}/${c.slug}`}>
                    {isRTL ? c.nameAr : c.nameEn} <Arrow className="h-3.5 w-3.5 ms-1" />
                  </Link>
                </Button>
              ))}
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SectorCity;
