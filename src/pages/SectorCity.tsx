import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listPublicBusinessesForSector } from '@/modules/businesses';
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
import { getSectorFaqs } from '@/lib/sector-faqs';
import { useSectorPageviewTracking } from '@/hooks/useSectorPageviewTracking';

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

  useSectorPageviewTracking(sector?.slug ?? null, city?.slug ?? null);

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
      const { data } = await listPublicBusinessesForSector({
        select:
          'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, city_id, category_id, short_description_ar, short_description_en, membership_tier, mobile, phone, cities(id, name_ar, name_en)',
        filters: [
          { column: 'category_id', op: 'in', value: categoryIds },
          { column: 'city_id', op: 'eq', value: cityRow!.id },
          { column: 'is_active', op: 'eq', value: true },
        ],
        orderBy: { column: 'rating_avg', ascending: false },
        limit: 200,
      });
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
      const pageUrl = `${SITE_URL}/sectors/${sector.slug}/${city.slug}`;
      const cityBlock = {
        '@type': 'City',
        name: city.nameEn,
        alternateName: city.nameAr,
        address: {
          '@type': 'PostalAddress',
          addressLocality: city.nameEn,
          addressRegion: city.nameEn,
          addressCountry: 'SA',
        },
      } as const;
      const breadcrumb = {
        ...buildBreadcrumbList([
        { name: isRTL ? 'القطاعات' : 'Sectors', url: '/sectors' },
        { name: meta.name, url: `/sectors/${sector.slug}` },
        { name: cityName, url: `/sectors/${sector.slug}/${city.slug}` },
        ])!,
        '@id': `${pageUrl}#breadcrumbs`,
      };
      const collection = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        name: `${meta.name} ${cityIn}`,
        description,
        url: pageUrl,
        inLanguage: isRTL ? 'ar' : 'en',
        isPartOf: { '@type': 'WebSite', name: 'قِطاعات Qitaat', url: SITE_URL },
        about: cityBlock,
        spatialCoverage: cityBlock,
      };

      // ── Numbered ItemList of providers, each enriched with a LocalBusiness item ──
      const top = filtered.slice(0, 10);
      const verifiedCount = filtered.filter((b) => b.is_verified).length;
      const ratedTop = top.filter((b) => (b.rating_count ?? 0) > 0);
      const itemList = top.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            '@id': `${pageUrl}#providers`,
            name: isRTL ? `أفضل ${top.length} من مزودي ${meta.name} ${cityIn}` : `Top ${top.length} ${meta.name} providers ${cityIn}`,
            description: isRTL
              ? `قائمة مرتّبة بأفضل ${top.length} من ورش ${meta.name} ${cityIn} وفقاً للتقييم وحالة التحقق على منصة قِطاعات.`
              : `Ranked list of the top ${top.length} ${meta.name} workshops ${cityIn} by rating and verification on Qitaat.`,
            url: pageUrl,
            about: cityBlock,
            areaServed: cityBlock,
            itemListOrder: 'https://schema.org/ItemListOrderDescending',
            numberOfItems: top.length,
            itemListElement: top.map((b, i) => {
              const name = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
              const url = `${SITE_URL}/${b.username}`;
              const localBusiness: Record<string, unknown> = {
                '@type': 'LocalBusiness',
                '@id': url,
                name,
                url,
                ...(b.logo_url ? { image: b.logo_url, logo: b.logo_url } : {}),
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: city.nameEn,
                  addressRegion: city.nameEn,
                  addressCountry: 'SA',
                },
                areaServed: { '@type': 'City', name: city.nameEn },
                priceRange: 'SAR',
              };
              if ((b.rating_count ?? 0) > 0 && b.rating_avg != null) {
                localBusiness.aggregateRating = {
                  '@type': 'AggregateRating',
                  ratingValue: Number(b.rating_avg).toFixed(1),
                  reviewCount: b.rating_count,
                  bestRating: 5,
                  worstRating: 1,
                };
              }
              return {
                '@type': 'ListItem',
                position: i + 1,
                url,
                name,
                item: localBusiness,
              };
            }),
          }
        : null;

      // ── City-aware FAQ: city/sector contextual Qs + curated sector FAQs ──
      const sectorServices = SERVICES_CATALOG.filter((s) => s.sector === sector.slug);
      const priceMin = sectorServices.length > 0 ? Math.min(...sectorServices.map((s) => s.price_min)) : null;
      const priceMax = sectorServices.length > 0 ? Math.max(...sectorServices.map((s) => s.price_max)) : null;
      const leadMin = sectorServices.length > 0 ? Math.min(...sectorServices.map((s) => s.lead_time_days)) : null;
      const leadMax = sectorServices.length > 0 ? Math.max(...sectorServices.map((s) => s.lead_time_days)) : null;
      const avgRatingTop = ratedTop.length > 0
        ? (ratedTop.reduce((a, b) => a + Number(b.rating_avg ?? 0), 0) / ratedTop.length)
        : null;
      const providersCount = filtered.length;

      const cityFaqEntries: Array<{ q: string; a: string }> = [];

      cityFaqEntries.push({
        q: isRTL ? `كم عدد ورش ${meta.name} المعتمدة ${cityIn}؟` : `How many verified ${meta.name} workshops are listed ${cityIn}?`,
        a: isRTL
          ? `يضم دليل قِطاعات حالياً ${providersCount} ${providersCount === 1 ? 'ورشة' : 'ورشة'} ${meta.name} ${cityIn}، منها ${verifiedCount} موثّقة بعد التحقق من الهوية والسجل التجاري.`
          : `Qitaat currently lists ${providersCount} ${meta.name} workshop${providersCount === 1 ? '' : 's'} ${cityIn}, including ${verifiedCount} verified after ID & commercial-registration checks.`,
      });

      if (priceMin != null && priceMax != null) {
        cityFaqEntries.push({
          q: isRTL ? `كم متوسط أسعار ${meta.name} ${cityIn}؟` : `What is the typical ${meta.name} price ${cityIn}?`,
          a: isRTL
            ? `تتراوح أسعار خدمات ${meta.name} ${cityIn} بين ${priceMin} و${priceMax} ريالاً للوحدة (متر مربع، متر طولي أو قطعة) شاملة المواد والتركيب، وتختلف حسب نوع الخدمة والمواصفات. قارن 3 عروض على الأقل قبل التعاقد.`
            : `${meta.name} services ${cityIn} typically range from SAR ${priceMin} to SAR ${priceMax} per unit (m², lin. m or piece) including materials and installation, varying by service type and specifications. Compare at least 3 quotes before signing.`,
        });
      }

      if (leadMin != null && leadMax != null) {
        cityFaqEntries.push({
          q: isRTL ? `كم تستغرق مدة تنفيذ مشروع ${meta.name} ${cityIn}؟` : `How long does a ${meta.name} project take ${cityIn}?`,
          a: isRTL
            ? `تتراوح مدة التصنيع والتركيب لمشاريع ${meta.name} ${cityIn} بين ${leadMin} و${leadMax} يوم عمل بحسب حجم المشروع وتعقيد التصميم وتوفّر المواد.`
            : `${meta.name} fabrication and installation ${cityIn} typically takes ${leadMin}–${leadMax} working days depending on project size, design complexity and material availability.`,
        });
      }

      if (avgRatingTop != null) {
        cityFaqEntries.push({
          q: isRTL ? `ما متوسط تقييم أفضل ورش ${meta.name} ${cityIn}؟` : `What is the average rating of top ${meta.name} workshops ${cityIn}?`,
          a: isRTL
            ? `يبلغ متوسط تقييم أفضل ${ratedTop.length} ورشة ${meta.name} ${cityIn} على قِطاعات نحو ${avgRatingTop.toFixed(1)} من 5، وفق مراجعات حقيقية لعملاء سابقين.`
            : `The top ${ratedTop.length} ${meta.name} workshops ${cityIn} average ${avgRatingTop.toFixed(1)} out of 5 on Qitaat, based on verified customer reviews.`,
        });
      }

      cityFaqEntries.push({
        q: isRTL ? `هل طلب عرض سعر ${meta.name} ${cityIn} مجاني؟` : `Is requesting a ${meta.name} quote ${cityIn} free?`,
        a: isRTL
          ? `نعم، التواصل مع أي مزود ${meta.name} مدرج ${cityIn} مجاني وغير ملزم. يمكنك إرسال طلب عرض سعر واحد إلى عدة ورش دفعة واحدة من خلال زر "اطلب عروض أسعار" أعلى الصفحة.`
          : `Yes — contacting any listed ${meta.name} provider ${cityIn} is free and non-binding. You can send one RFQ to multiple workshops at once via the "Request quotes" button above.`,
      });

      // Append up to 4 sector-wide curated FAQs (avoid duplicates by question text).
      const seenQ = new Set(cityFaqEntries.map((e) => e.q.trim()));
      const sectorFaqs = getSectorFaqs(sector.slug).slice(0, 4);
      for (const f of sectorFaqs) {
        const q = isRTL ? f.q_ar : f.q_en;
        const a = isRTL ? f.a_ar : f.a_en;
        if (!seenQ.has(q.trim())) {
          cityFaqEntries.push({ q, a });
          seenQ.add(q.trim());
        }
      }

      const faq = {
        ...buildFaqPage(cityFaqEntries)!,
        '@id': `${pageUrl}#faq`,
        about: cityBlock,
      };

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
              <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
                <Trophy className="h-3 w-3" />
                {isRTL ? `أفضل 10 ${cityIn}` : `Top 10 ${cityIn}`}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              {isRTL ? `${meta.name} ${cityIn}` : `${meta.name} ${cityIn}`}
            </h1>
            <p className="text-muted-foreground max-w-3xl">{description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to={`/contact?topic=${sector.slug}&city=${city.slug}`}>
                  <MessageSquare className="h-4 w-4 me-1.5" />
                  {isRTL ? 'اطلب عروض أسعار من 3 ورش' : 'Request quotes from 3 workshops'}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/services?sector=${sector.slug}`}>
                  {isRTL ? 'تصفّح الأسعار التقديرية' : 'Browse estimated prices'}
                  <Arrow className="h-4 w-4 ms-1" />
                </Link>
              </Button>
            </div>
          </header>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1">
                  <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    dir="auto"
                    className="ps-9"
                    placeholder={isRTL ? `ابحث عن ورشة ${meta.name} ${cityIn}...` : `Search a ${meta.name} workshop ${cityIn}...`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button
                  variant={verifiedOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVerifiedOnly((v) => !v)}
                  className="gap-1.5"
                >
                  <VerifiedBadge size="xs" />
                  {isRTL ? 'موثوق فقط' : 'Verified only'}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {isRTL ? 'التقييم:' : 'Rating:'}
                </span>
                {(['all', '4', '4.5'] as RatingFilter[]).map((r) => (
                  <Button
                    key={r}
                    variant={minRating === r ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2.5"
                    onClick={() => setMinRating(r)}
                  >
                    {r === 'all' ? (isRTL ? 'الكل' : 'All') : `${r}+`}
                    {r !== 'all' && <Star className="h-3 w-3 ms-1 text-amber-500" />}
                  </Button>
                ))}
                <span className="mx-1 h-4 w-px bg-border" />
                <span className="text-muted-foreground">{isRTL ? 'الترتيب:' : 'Sort:'}</span>
                <Button variant={sortBy === 'top' ? 'default' : 'outline'} size="sm" className="h-7 px-2.5" onClick={() => setSortBy('top')}>
                  {isRTL ? 'أفضل جودة' : 'Top quality'}
                </Button>
                <Button variant={sortBy === 'reviews' ? 'default' : 'outline'} size="sm" className="h-7 px-2.5" onClick={() => setSortBy('reviews')}>
                  {isRTL ? 'الأكثر تقييماً' : 'Most reviewed'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? `${filtered.length} مزود متاح ${cityIn} حسب الفلاتر الحالية`
                  : `${filtered.length} providers available ${cityIn} with current filters`}
              </p>
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
            <>
              <h2 className="text-xl md:text-2xl font-bold mb-4 inline-flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                {isRTL ? `أفضل ${top10.length} مزودي ${meta.name} ${cityIn}` : `Top ${top10.length} ${meta.name} providers ${cityIn}`}
              </h2>
              <ol className="space-y-3 mb-6">
                {top10.map((b, i) => {
                  const tier = tierLabel(b.membership_tier);
                  const dispName = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
                  const desc = language === 'ar' ? b.short_description_ar : (b.short_description_en || b.short_description_ar);
                  const callPhone = b.mobile || b.phone;
                  const rankCls = i === 0
                    ? 'bg-amber-500/15 text-amber-600 ring-2 ring-amber-500/30'
                    : i === 1 ? 'bg-zinc-300/30 text-zinc-700 dark:text-zinc-300 ring-2 ring-zinc-400/30'
                    : i === 2 ? 'bg-orange-700/15 text-orange-700 dark:text-orange-400 ring-2 ring-orange-700/30'
                    : 'bg-muted text-muted-foreground';
                  return (
                    <li key={b.id}>
                      <Card className="hover-lift overflow-hidden">
                        <CardContent className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-center">
                          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                            <div className={`shrink-0 h-10 w-10 rounded-full grid place-items-center font-bold text-sm tech-content ${rankCls}`}>#{i + 1}</div>
                            <Link to={`/${b.username}`} className="h-14 w-14 md:h-16 md:w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                              {b.logo_url ? (
                                <img src={b.logo_url} alt={dispName} width={64} height={64} loading={i < 4 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
                              ) : (
                                <Building2 className="h-6 w-6 text-muted-foreground" />
                              )}
                            </Link>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-semibold text-base md:text-lg truncate">
                                  <Link to={`/${b.username}`} className="hover:underline">{dispName}</Link>
                                </h3>
                                {b.is_verified && <VerifiedBadge size="xs" />}
                                {tier && (
                                  <Badge variant="outline" className="gap-1 h-5 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">
                                    <Crown className="h-3 w-3" />{tier}
                                  </Badge>
                                )}
                              </div>
                              {desc && <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{desc}</p>}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs">
                                {Number(b.rating_avg ?? 0) > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                    <span className="tech-content font-medium">{Number(b.rating_avg).toFixed(1)}</span>
                                    <span className="text-muted-foreground tech-content">({b.rating_count ?? 0})</span>
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {language === 'ar' ? (b.cities?.name_ar || cityName) : (b.cities?.name_en || cityName)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row md:flex-col gap-2 md:w-auto w-full md:min-w-[180px]">
                            <Button asChild size="sm" className="w-full">
                              <Link to={`/${b.username}?ref=top10&action=quote`}>
                                <MessageSquare className="h-4 w-4 me-1.5" />
                                {isRTL ? 'اطلب سعراً' : 'Get quote'}
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="w-full">
                              <Link to={`/${b.username}?ref=top10&action=book`}>
                                <CalendarCheck className="h-4 w-4 me-1.5" />
                                {isRTL ? 'احجز' : 'Book'}
                              </Link>
                            </Button>
                            {callPhone && (
                              <Button asChild size="sm" variant="ghost" className="w-full">
                                <a href={`tel:${callPhone}`}>
                                  <Phone className="h-4 w-4 me-1.5" />
                                  {isRTL ? 'اتصل' : 'Call'}
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ol>
              {rest.length > 0 && (
                <details className="mb-4 group">
                  <summary className="cursor-pointer text-sm font-medium text-primary hover:underline list-none inline-flex items-center gap-1">
                    <span>{isRTL ? `عرض ${rest.length} مزوداً إضافياً ${cityIn}` : `Show ${rest.length} more providers ${cityIn}`}</span>
                    <span className="group-open:rotate-180 transition">▾</span>
                  </summary>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {rest.map((b) => (
                      <Card key={b.id} className="hover-lift">
                        <CardContent className="p-3">
                          <Link to={`/${b.username}`} className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                              {b.logo_url ? (
                                <img src={b.logo_url} alt={b.name_ar} width={40} height={40} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                              ) : (
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-medium text-sm truncate">{language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)}</h3>
                                {b.is_verified && <VerifiedBadge size="xs" />}
                              </div>
                              {Number(b.rating_avg ?? 0) > 0 && (
                                <p className="text-xs mt-0.5 inline-flex items-center gap-1">
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
                </details>
              )}
            </>
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

          {/* Auto internal links to related service pages — city-aware bilingual anchors */}
          {(() => {
            const allSectorServices = SERVICES_CATALOG.filter((s) => s.sector === sector.slug);
            if (allSectorServices.length === 0) return null;
            const anchorVariantsAr = (svc: string): string[] => [
              `سعر ${svc} ${cityIn}`,
              `أفضل ورش ${svc} ${cityIn}`,
              `تركيب ${svc} ${cityIn}`,
              `عروض أسعار ${svc} ${cityIn}`,
              `${svc} ${cityIn}`,
            ];
            const anchorVariantsEn = (svc: string): string[] => [
              `${svc} prices ${cityIn}`,
              `Best ${svc} workshops ${cityIn}`,
              `${svc} installation ${cityIn}`,
              `${svc} quotes ${cityIn}`,
              `${svc} ${cityIn}`,
            ];
            const anchorFor = (idx: number, svc: string): string => {
              const variants = isRTL ? anchorVariantsAr(svc) : anchorVariantsEn(svc);
              return variants[idx % variants.length];
            };
            return (
              <section className="mt-12" aria-labelledby="related-services-heading">
                <h2 id="related-services-heading" className="text-xl font-bold mb-3">
                  {isRTL
                    ? `روابط مفيدة: خدمات ${meta.name} ${cityIn}`
                    : `Related: ${meta.name} services ${cityIn}`}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {isRTL ? (
                    <>
                      تصفّح أبرز خدمات {meta.name} المتاحة {cityIn} من خلال صفحات تفصيلية
                      تشمل الأسعار والمواصفات والضمان: {allSectorServices.slice(0, 5).map((s, i) => (
                        <React.Fragment key={s.slug}>
                          <Link
                            to={`/services/${s.slug}?city=${city.slug}`}
                            className="text-primary hover:underline"
                          >
                            {anchorFor(i, s.name_ar)}
                          </Link>
                          {i < Math.min(4, allSectorServices.length - 1) ? '، ' : '.'}
                        </React.Fragment>
                      ))}
                    </>
                  ) : (
                    <>
                      Explore the main {meta.name} services available {cityIn} via detailed
                      pages with pricing, specs and warranties: {allSectorServices.slice(0, 5).map((s, i) => (
                        <React.Fragment key={s.slug}>
                          <Link
                            to={`/services/${s.slug}?city=${city.slug}`}
                            className="text-primary hover:underline"
                          >
                            {anchorFor(i, s.name_en)}
                          </Link>
                          {i < Math.min(4, allSectorServices.length - 1) ? ', ' : '.'}
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {allSectorServices.map((s, i) => (
                    <Link
                      key={s.slug}
                      to={`/services/${s.slug}?city=${city.slug}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs hover-lift hover:border-primary/40"
                      title={isRTL ? s.name_ar : (s.name_en || s.name_ar)}
                    >
                      <span>{anchorFor(i, isRTL ? s.name_ar : (s.name_en || s.name_ar))}</span>
                      <Arrow className="h-3 w-3 opacity-60" />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })()}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SectorCity;
