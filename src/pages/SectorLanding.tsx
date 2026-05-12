import React, { useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, buildFaqPage, ogImageFor } from '@/lib/seo/structured-data';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Search as SearchIcon, Star, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { SECTOR_KEYWORDS, ALL_SECTORS, type SectorSlug, getSectorMeta } from '@/lib/sector-keywords';
import { getSectorGuides } from '@/lib/sector-guides';
import { SectorGuides } from '@/components/sector/SectorGuides';
import { SectorTopTechnicians } from '@/components/sector/SectorTopTechnicians';
import { SectorProjectExamples } from '@/components/sector/SectorProjectExamples';
import { SA_CITIES } from '@/lib/sa-cities';
import { SectorFAQ } from '@/components/sector/SectorFAQ';
import { getSectorFaqs } from '@/lib/sector-faqs';

/**
 * Maps a sector slug → list of category slugs that should be included
 * when listing providers for that sector. Categories live in
 * `public.categories` and are the source of truth used by `/search`.
 */
const SECTOR_TO_CATEGORY_SLUGS: Record<SectorSlug, string[]> = {
  aluminum: ['aluminum'],
  iron: ['iron-steel'],
  glass: ['glass'],
  wood: ['wood-cabinets'],
  cabinets: ['wood-cabinets'],
};

const PAGE_SIZE = 24;

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
  cities: { id: string; name_ar: string; name_en: string | null } | null;
  category_id: string;
};

const SectorLanding: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isRTL, language } = useLanguage();

  const sectorSlug = slug as SectorSlug;
  const sector = sectorSlug && SECTOR_KEYWORDS[sectorSlug] ? SECTOR_KEYWORDS[sectorSlug] : null;

  const [query, setQuery] = useState('');
  const [cityId, setCityId] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);

  // Resolve the category ids for this sector (one or more rows in `categories`).
  const categorySlugs = sector ? SECTOR_TO_CATEGORY_SLUGS[sector.slug] : [];
  const { data: categories = [] } = useQuery({
    queryKey: ['sector-categories', categorySlugs.join(',')],
    enabled: categorySlugs.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, slug, name_ar, name_en')
        .in('slug', categorySlugs);
      return data ?? [];
    },
  });
  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['sector-businesses', sectorSlug, categoryIds],
    enabled: categoryIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select(
          'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, city_id, category_id, cities(id, name_ar, name_en)',
        )
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('rating_avg', { ascending: false })
        .limit(500);
      return (data ?? []) as unknown as BizRow[];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['sector-cities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cities')
        .select('id, name_ar, name_en')
        .eq('is_active', true)
        .order('name_ar');
      return data ?? [];
    },
  });

  // Cities that actually have providers in this sector (for chips).
  const cityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of businesses) {
      if (!b.city_id) continue;
      map.set(b.city_id, (map.get(b.city_id) ?? 0) + 1);
    }
    return map;
  }, [businesses]);

  const topCities = useMemo(() => {
    return cities
      .map((c) => ({ ...c, count: cityCounts.get(c.id) ?? 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [cities, cityCounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businesses.filter((b) => {
      if (cityId !== 'all' && b.city_id !== cityId) return false;
      if (verifiedOnly && !b.is_verified) return false;
      if (minRating > 0 && Number(b.rating_avg ?? 0) < minRating) return false;
      if (q) {
        const hay = `${b.name_ar} ${b.name_en ?? ''} ${b.username}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [businesses, query, cityId, verifiedOnly, minRating]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  // ── Selected city (from filter) — drives city-aware sections + meta ───
  const selectedCity = useMemo(() => {
    if (cityId === 'all') return null;
    return cities.find((c) => c.id === cityId) ?? null;
  }, [cityId, cities]);
  const selectedCityName = selectedCity
    ? (language === 'ar' ? selectedCity.name_ar : (selectedCity.name_en || selectedCity.name_ar))
    : null;
  const selectedCitySlug = selectedCity?.name_en
    ? (SA_CITIES.find((sc) => sc.nameEn.toLowerCase() === selectedCity.name_en!.toLowerCase())?.slug ?? null)
    : null;

  // ── SEO ────────────────────────────────────────────────────────────────
  const meta = sector ? getSectorMeta(sector.slug, isRTL) : null;
  usePageMeta({
    title: meta
      ? selectedCityName
        ? (isRTL
            ? `${meta.name} في ${selectedCityName} — ${meta.tagline} | قِطاعات`
            : `${meta.name} in ${selectedCityName} — ${meta.tagline} | Qitaat`)
        : (isRTL
            ? `${meta.name} — ${meta.tagline} | قِطاعات`
            : `${meta.name} — ${meta.tagline} | Qitaat`)
      : isRTL
        ? 'قطاع غير معروف | قِطاعات'
        : 'Unknown sector | Qitaat',
    description: meta
      ? (selectedCityName
          ? (isRTL
              ? `أفضل مزودي ${meta.name} في ${selectedCityName}: ورش ومصانع موثّقة، أسعار، أعمال سابقة، ودليل اختيار. ${meta.description}`
              : `Top ${meta.name} providers in ${selectedCityName}: verified workshops, prices, past projects and a buyer guide. ${meta.description}`)
          : meta.description)
      : '',
    keywords: meta?.keywords,
    canonical: selectedCitySlug
      ? `https://qitaat.com/sectors/${sectorSlug}/${selectedCitySlug}`
      : `https://qitaat.com/sectors/${sectorSlug}`,
    ogImage: ogImageFor(`sector-${sectorSlug}`, {
      type: 'sector',
      title: selectedCityName
        ? `${meta?.name || ''} — ${selectedCityName}`
        : (meta?.name || (isRTL ? 'قطاع' : 'Sector')),
      subtitle: meta?.tagline || (isRTL ? 'دليل قِطاعات' : 'Qitaat directory'),
    }),
    ogType: 'website',
  });

  useMultiJsonLd(
    useMemo(() => {
      if (!sector || !meta) return null;
      const breadcrumb = buildBreadcrumbList([
        { name: isRTL ? 'القطاعات' : 'Sectors', url: '/sectors' },
        { name: meta.name, url: `/sectors/${sector.slug}` },
        ...(selectedCityName
          ? [{ name: selectedCityName, url: selectedCitySlug
              ? `/sectors/${sector.slug}/${selectedCitySlug}`
              : `/sectors/${sector.slug}` }]
          : []),
      ])!;
      const collection = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: selectedCityName ? `${meta.name} — ${selectedCityName}` : meta.name,
        description: selectedCityName
          ? (isRTL
              ? `${meta.name} في ${selectedCityName}. ${meta.description}`
              : `${meta.name} in ${selectedCityName}. ${meta.description}`)
          : meta.description,
        url: selectedCitySlug
          ? `https://qitaat.com/sectors/${sector.slug}/${selectedCitySlug}`
          : `https://qitaat.com/sectors/${sector.slug}`,
        inLanguage: isRTL ? 'ar' : 'en',
        keywords: meta.keywords,
        ...(selectedCityName
          ? {
              about: {
                '@type': 'Place',
                name: selectedCityName,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: selectedCityName,
                  addressCountry: 'SA',
                },
              },
            }
          : {}),
      };
      const itemList = filtered.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: selectedCityName
              ? (isRTL
                  ? `أفضل مزودي ${meta.name} في ${selectedCityName}`
                  : `Top ${meta.name} providers in ${selectedCityName}`)
              : (isRTL ? `أفضل مزودي ${meta.name}` : `Top ${meta.name} providers`),
            numberOfItems: Math.min(filtered.length, 10),
            itemListElement: filtered.slice(0, 10).map((b, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://qitaat.com/${b.username}`,
              name: language === 'ar' ? b.name_ar : (b.name_en || b.name_ar),
            })),
          }
        : null;
      // Full sector FAQ — city-aware question phrasing for richer snippets.
      const sectorFaqs = getSectorFaqs(sector.slug);
      const faqQa = sectorFaqs.map((f) => {
        const q = isRTL ? f.q_ar : f.q_en;
        const a = isRTL ? f.a_ar : f.a_en;
        if (!selectedCityName) return { q, a };
        // Inject the city into the question phrasing when relevant
        const qWithCity = isRTL
          ? q.replace(/في السعودية/g, `في ${selectedCityName}`)
          : q.replace(/in Saudi Arabia/g, `in ${selectedCityName}`);
        return { q: qWithCity, a };
      });
      const faq = buildFaqPage(faqQa)!;
      const blocks: Record<string, unknown>[] = [breadcrumb, collection, faq];
      if (itemList) blocks.splice(2, 0, itemList);
      // HowTo JSON-LD per buyer-guide (search engines pick up rich results).
      const guides = getSectorGuides(sector.slug);
      for (const g of guides) {
        blocks.push({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: selectedCityName
            ? (isRTL ? `${g.title_ar} — ${selectedCityName}` : `${g.title_en} — ${selectedCityName}`)
            : (isRTL ? g.title_ar : g.title_en),
          description: isRTL ? g.excerpt_ar : g.excerpt_en,
          inLanguage: isRTL ? 'ar' : 'en',
          step: (isRTL ? g.steps_ar : g.steps_en).map((s, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: s,
          })),
        });
      }
      return blocks;
    }, [sector, meta, isRTL, language, filtered, selectedCityName, selectedCitySlug]),
  );

  // Unknown sector → soft 404 to /sectors index (handled below).
  if (slug && !sector) {
    return <Navigate to="/sectors" replace />;
  }

  if (!sector || !meta) return null;

  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const guides = getSectorGuides(sector.slug);
  const topTechnicians = useMemo(
    () =>
      [...businesses]
        .filter((b) => b.is_verified && Number(b.rating_avg ?? 0) >= 4)
        .filter((b) => (cityId === 'all' ? true : b.city_id === cityId))
        .sort((a, b) => Number(b.rating_avg ?? 0) - Number(a.rating_avg ?? 0))
        .slice(0, 4),
    [businesses, cityId],
  );
  const relatedSectors = sector.relatedSlugs
    .map((s) => {
      const m = getSectorMeta(s, isRTL);
      return m ? { slug: s, ...m } : null;
    })
    .filter((s): s is { slug: SectorSlug; title: string; description: string; keywords: string; tagline: string; name: string } => Boolean(s));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <header className="bg-primary pt-24 pb-10">
        <div className="container px-4">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-3" aria-label="breadcrumb">
            <Link to="/" className="hover:text-gold transition-colors">{isRTL ? 'الرئيسية' : 'Home'}</Link>
            <span>/</span>
            <Link to="/sectors" className="hover:text-gold transition-colors">{isRTL ? 'القطاعات' : 'Sectors'}</Link>
            <span>/</span>
            <span className="text-primary-foreground">{meta.name}</span>
          </nav>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground">
            {meta.name}
          </h1>
          <p className="mt-2 text-primary-foreground/80 text-sm sm:text-base max-w-2xl">{meta.tagline}</p>
          <p className="mt-3 text-primary-foreground/60 text-xs sm:text-sm max-w-3xl leading-relaxed">{meta.description}</p>
          <p className="mt-4 text-primary-foreground/50 text-xs">
            {businesses.length} {isRTL ? 'مزود مدرج' : 'listed providers'}
          </p>
        </div>
      </header>

      {/* Filter bar */}
      <section className="border-b bg-card/30">
        <div className="container px-4 py-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
            <Input
              dir="auto"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder={isRTL ? `ابحث داخل ${meta.name}…` : `Search within ${meta.name}…`}
              className="h-11 ps-9 rounded-xl"
            />
          </div>
          <select
            value={cityId}
            onChange={(e) => { setCityId(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border bg-background px-3 text-sm min-w-[160px]"
            aria-label={isRTL ? 'المدينة' : 'City'}
          >
            <option value="all">{isRTL ? 'كل المدن' : 'All cities'}</option>
            {topCities.map((c) => (
              <option key={c.id} value={c.id}>
                {(language === 'ar' ? c.name_ar : (c.name_en || c.name_ar))} ({c.count})
              </option>
            ))}
          </select>
          <select
            value={String(minRating)}
            onChange={(e) => { setMinRating(Number(e.target.value)); setPage(1); }}
            className="h-11 rounded-xl border bg-background px-3 text-sm"
            aria-label={isRTL ? 'التقييم' : 'Rating'}
          >
            <option value="0">{isRTL ? 'كل التقييمات' : 'Any rating'}</option>
            <option value="3">★ 3+</option>
            <option value="4">★ 4+</option>
            <option value="4.5">★ 4.5+</option>
          </select>
          <Button
            type="button"
            variant={verifiedOnly ? 'default' : 'outline'}
            className="h-11 rounded-xl gap-2"
            onClick={() => { setVerifiedOnly((v) => !v); setPage(1); }}
          >
            <ShieldCheck className="w-4 h-4" />
            {isRTL ? 'موثّق فقط' : 'Verified only'}
          </Button>
        </div>
      </section>

      {/* City chips → deep link to /search for indexable combos */}
      {topCities.length > 0 && (
        <section className="container px-4 pt-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {isRTL ? `${meta.name} حسب المدينة` : `${meta.name} by city`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {topCities.map((c) => {
              // Prefer the indexable /sectors/:slug/:city landing page when
              // we have a known slug for this city; otherwise fall back to
              // the filtered /search URL (still indexable in sitemap).
              const known = SA_CITIES.find(
                (sc) => sc.nameEn.toLowerCase() === (c.name_en || '').toLowerCase(),
              );
              const href = known
                ? `/sectors/${sector.slug}/${known.slug}`
                : (() => {
                    const params = new URLSearchParams();
                    if (categoryIds[0]) params.set('category', categoryIds[0]);
                    params.set('city', c.id);
                    return `/search?${params.toString()}`;
                  })();
              return (
                <Link key={c.id} to={href}>
                  <Badge variant="secondary" className="hover-lift gap-1.5 px-3 py-1.5 cursor-pointer">
                    <MapPin className="w-3 h-3" />
                    {language === 'ar' ? c.name_ar : (c.name_en || c.name_ar)}
                    <span className="text-muted-foreground">({c.count})</span>
                  </Badge>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Top technicians strip — featured verified providers */}
      <SectorTopTechnicians
        sectorName={meta.name}
        technicians={topTechnicians}
        cityName={selectedCityName}
      />

      {/* Buyer guides — HowTo content per sector */}
      <SectorGuides
        sectorName={meta.name}
        sectorSlug={sector.slug}
        guides={guides}
        featuredProvider={topTechnicians[0] ?? null}
        cityName={selectedCityName}
        citySlug={selectedCitySlug}
      />

      {/* Project examples — real completed work in this sector */}
      <SectorProjectExamples
        sectorName={meta.name}
        sectorSlug={sector.slug}
        categoryIds={categoryIds}
        cityId={cityId === 'all' ? null : cityId}
        cityName={selectedCityName}
      />

      {/* Sector FAQ — categorized Q&A, matching FAQPage JSON-LD above */}
      <SectorFAQ
        sectorName={meta.name}
        faqs={getSectorFaqs(sector.slug)}
        cityName={selectedCityName}
      />

      {/* Results grid */}
      <main className="container py-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {isRTL ? 'نتيجة' : 'results'}
          </p>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">
              {isRTL ? 'لا توجد نتائج مطابقة' : 'No matching providers'}
            </p>
            <Link to="/search">
              <Button variant="outline">{isRTL ? 'الذهاب إلى البحث الشامل' : 'Open advanced search'}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pageItems.map((b) => (
              <Link key={b.id} to={`/${b.username}`} className="block">
                <Card className="hover:shadow-lg hover:border-gold/30 transition-all group h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {b.logo_url ? (
                        <img
                          src={b.logo_url}
                          alt={b.name_ar}
                          width={56}
                          height={56}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-bold text-sm text-foreground truncate group-hover:text-gold transition-colors">
                        {language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)}
                      </h3>
                      {b.cities && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {language === 'ar' ? b.cities.name_ar : (b.cities.name_en || b.cities.name_ar)}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 tech-content">
                        <Star className="w-3 h-3 fill-gold text-gold" />
                        <span className="text-xs text-gold">{Number(b.rating_avg ?? 0).toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">({b.rating_count ?? 0})</span>
                        {b.is_verified && <VerifiedBadge size="xs" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 mt-8" aria-label="pagination">
            <Button
              variant="outline" size="sm"
              disabled={page === 1}
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 200, behavior: 'smooth' }); }}
            >
              {isRTL ? 'السابق' : 'Previous'}
            </Button>
            <span className="text-sm text-muted-foreground tech-content">{page} / {totalPages}</span>
            <Button
              variant="outline" size="sm"
              disabled={page === totalPages}
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 200, behavior: 'smooth' }); }}
            >
              {isRTL ? 'التالي' : 'Next'}
            </Button>
          </nav>
        )}
      </main>

      {/* Related sectors */}
      {relatedSectors.length > 0 && (
        <section className="container px-4 pb-12">
          <h2 className="font-heading text-lg font-bold mb-4">
            {isRTL ? 'قطاعات ذات صلة' : 'Related sectors'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedSectors.map((rs) => (
              <Link key={rs.slug} to={`/sectors/${rs.slug}`}>
                <Card className="hover:shadow-lg hover:border-gold/30 transition-all group h-full">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-foreground group-hover:text-gold transition-colors">
                        {rs.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rs.tagline}</p>
                    </div>
                    <Arrow className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

/**
 * Index page: lists all 5 sectors with their taglines. Both routes
 * (`/sectors` and `/sectors/:slug`) are SSR-safe and indexable.
 */
export const SectorsIndex: React.FC = () => {
  const { isRTL } = useLanguage();
  usePageMeta({
    title: isRTL
      ? 'قطاعات الصناعات: ألمنيوم، حديد، زجاج، خشب، خزائن | قِطاعات'
      : 'Industrial Sectors: Aluminum, Iron, Glass, Wood, Cabinets | Qitaat',
    description: isRTL
      ? 'استعرض القطاعات الصناعية الرئيسية في دليل قِطاعات: الألمنيوم، الحديد، الزجاج، الخشب، والخزائن. اختر القطاع لاستكشاف أفضل المصانع والورش.'
      : 'Browse Qitaat top industrial sectors: aluminum, iron, glass, wood and cabinets. Pick a sector to explore the best factories and workshops.',
    keywords: ALL_SECTORS.flatMap((s) => (isRTL ? s.keywords_ar : s.keywords_en)).slice(0, 24).join(', '),
    canonical: 'https://qitaat.com/sectors',
  });

  useMultiJsonLd(
    useMemo(() => {
      const breadcrumb = buildBreadcrumbList([{ name: isRTL ? 'القطاعات' : 'Sectors', url: '/sectors' }])!;
      const list = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: isRTL ? 'القطاعات الصناعية' : 'Industrial sectors',
        numberOfItems: ALL_SECTORS.length,
        itemListElement: ALL_SECTORS.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://qitaat.com/sectors/${s.slug}`,
          name: isRTL ? s.name_ar : s.name_en,
        })),
      };
      return [breadcrumb, list];
    }, [isRTL]),
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <header className="bg-primary pt-24 pb-10">
        <div className="container px-4">
          <h1 className="font-heading text-3xl font-bold text-primary-foreground">
            {isRTL ? 'قطاعات قِطاعات' : 'Qitaat Sectors'}
          </h1>
          <p className="mt-2 text-primary-foreground/70 text-sm">
            {isRTL
              ? 'اختر قطاعاً لاستكشاف أفضل المصانع والورش'
              : 'Pick a sector to explore the best factories and workshops'}
          </p>
        </div>
      </header>
      <main className="container py-8 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_SECTORS.map((s) => {
            const m = getSectorMeta(s.slug, isRTL)!;
            return (
              <Link key={s.slug} to={`/sectors/${s.slug}`}>
                <Card className="hover:shadow-lg hover:border-gold/30 transition-all group h-full">
                  <CardContent className="p-5">
                    <h2 className="font-heading font-bold text-foreground group-hover:text-gold transition-colors">
                      {m.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">{m.tagline}</p>
                    <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{m.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SectorLanding;