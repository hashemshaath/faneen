import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, ogImageFor } from '@/lib/seo/structured-data';
// JSON-LD types emitted via helpers below: '@type': 'BreadcrumbList', itemListElement:
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import {
  ALL_SECTORS,
  detectSectorFromCategorySlug,
  getSectorMeta,
} from '@/lib/sector-keywords';
import { track } from '@/lib/analytics-events';
import { useCategoryCounts } from '@/services/categories/useCategoryCounts';
import { listActiveCategories } from '@/modules/categories';
import { listPublicBusinessesByCategory } from '@/modules/businesses';

type CategoryRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
};

type CategoryBusinessRow = {
  id: string;
  username: string;
  name_ar: string;
  name_en: string | null;
  logo_url: string | null;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  city_id: string | null;
  cities: { name_ar: string; name_en: string } | null;
};

const Categories = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { isRTL, language } = useLanguage();

  const { data: categories = [], isLoading } = useQuery<CategoryRow[]>({
    queryKey: ['categories-page'],
    queryFn: async () => {
      const { data } = await listActiveCategories<CategoryRow>({ select: '*' });
      return data ?? [];
    },
  });

  const { byId: countsById, bySlug: countsBySlug } = useCategoryCounts();

  const selectedCategory = slug ? categories.find(c => c.slug === slug) : null;
  const catName = selectedCategory ? (language === 'ar' ? selectedCategory.name_ar : selectedCategory.name_en) : '';
  const selectedCounts = selectedCategory ? countsById.get(selectedCategory.id) : undefined;

  // Detect sector from the category slug (or the loaded category's slug) so we
  // can hydrate the page with industry-specific title/description/keywords.
  const sectorSlug = detectSectorFromCategorySlug(selectedCategory?.slug ?? slug);
  const sectorMeta = sectorSlug ? getSectorMeta(sectorSlug, isRTL) : null;

  // category_view — fires whenever the user lands on a specific category page.
  useEffect(() => {
    if (!selectedCategory?.slug) return;
    track.categoryView({
      category_slug: selectedCategory.slug,
      category_name: catName || undefined,
      sector: sectorSlug || undefined,
    });
  }, [selectedCategory?.slug, catName, sectorSlug]);

  // For the categories index (no slug) we mix the top keywords across sectors.
  const allSectorKeywords = useMemo(
    () =>
      ALL_SECTORS.flatMap((s) => (isRTL ? s.keywords_ar : s.keywords_en))
        .slice(0, 24)
        .join(', '),
    [isRTL],
  );

  const { data: businesses = [], isLoading: bizLoading } = useQuery<CategoryBusinessRow[]>({
    queryKey: ['businesses-by-category', selectedCategory?.id],
    // Use businesses_public to enforce is_active=true, approval_status='published', is_demo=false
    queryFn: () => listPublicBusinessesByCategory<CategoryBusinessRow>(selectedCategory!.id, { limit: 50 }),
    enabled: !!selectedCategory?.id,
  });

  usePageMeta({
    title: selectedCategory
      ? sectorMeta
        ? (isRTL
            ? `${catName} — ${sectorMeta.tagline} | قِطاعات`
            : `${catName} — ${sectorMeta.tagline} | Qitaat`)
        : (language === 'ar' ? `${catName} - دليل مزودي الخدمات | قِطاعات` : `${catName} - Service Providers | Qitaat`)
      : (language === 'ar' ? 'تصفح الأقسام والفئات | قِطاعات' : 'Browse Categories | Qitaat'),
    description: selectedCategory
      ? sectorMeta
        ? sectorMeta.description
        : (language === 'ar' ? `تصفح أفضل مزودي خدمات ${catName} مع التقييمات والأسعار` : `Browse the best ${catName} service providers`)
      : (language === 'ar' ? 'تصفح جميع أقسام وفئات خدمات الألمنيوم والحديد والزجاج والخشب' : 'Browse all aluminum, iron, glass and wood categories'),
    keywords: selectedCategory
      ? (sectorMeta ? sectorMeta.keywords : `${catName}, قِطاعات, دليل, مزودي خدمات`)
      : allSectorKeywords,
    canonical: selectedCategory
      ? `https://qitaat.com/categories/${selectedCategory.slug}`
      : 'https://qitaat.com/categories',
    ogImage: ogImageFor(selectedCategory ? `category-${selectedCategory.slug}` : 'categories', {
      type: 'category',
      title: selectedCategory
        ? (isRTL ? catName : catName)
        : (isRTL ? 'تصفح الأقسام والفئات' : 'Browse Categories'),
      subtitle: selectedCategory
        ? (sectorMeta?.tagline || (isRTL ? 'دليل قِطاعات' : 'Qitaat directory'))
        : (isRTL ? 'الألمنيوم · الزجاج · الحديد · الخشب' : 'Aluminum · Glass · Steel · Wood'),
    }),
    ogTitle: selectedCategory
      ? (isRTL ? `${catName} — قِطاعات` : `${catName} — Qitaat`)
      : (isRTL ? 'تصفح الأقسام والفئات — قِطاعات' : 'Browse Categories — Qitaat'),
    ogDescription: selectedCategory
      ? (sectorMeta?.description || (isRTL ? `أفضل مزودي ${catName} في السعودية والخليج` : `Best ${catName} providers in Saudi & Gulf`))
      : (isRTL ? 'دليل أقسام الصناعات الخفيفة في السعودية والخليج' : 'Light industries directory for Saudi & Gulf'),
  });

  useMultiJsonLd(useMemo(() => {
    if (!selectedCategory) {
      const indexBreadcrumb = buildBreadcrumbList([
        { name: isRTL ? 'الأقسام' : 'Categories', url: '/categories' },
      ]);
      return indexBreadcrumb ? [indexBreadcrumb] : null;
    }
    const breadcrumb = buildBreadcrumbList([
      { name: isRTL ? 'الأقسام' : 'Categories', url: '/categories' },
      { name: catName, url: `/categories/${selectedCategory.slug}` },
    ])!;
    const website = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: 'https://qitaat.com',
      name: 'قِطاعات Qitaat',
      inLanguage: isRTL ? 'ar' : 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://qitaat.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
      keywords: sectorMeta ? sectorMeta.keywords : `${catName}, قِطاعات`,
    };
    const itemList = businesses.length > 0 ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: isRTL ? `أفضل مزودي ${catName}` : `Top ${catName} providers`,
      numberOfItems: Math.min(businesses.length, 10),
      keywords: sectorMeta ? sectorMeta.keywords : `${catName}, قِطاعات`,
      itemListElement: businesses.slice(0, 10).map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://qitaat.com/${b.username}`,
        name: language === 'ar' ? b.name_ar : (b.name_en || b.name_ar),
      })),
    } : null;
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `كيف أجد أفضل ورشة ${catName} في السعودية؟`,
          acceptedAnswer: { '@type': 'Answer', text: `ابحث في دليل قِطاعات عن ورش ${catName}. يمكنك تصفية النتائج حسب التقييم والموقع ومقارنة الأسعار والخدمات.` },
        },
        {
          '@type': 'Question',
          name: `ما هي أسعار ${catName} في السعودية؟`,
          acceptedAnswer: { '@type': 'Answer', text: `تتفاوت أسعار ${catName} حسب الجودة والمساحة والموقع. يمكنك طلب عروض أسعار مجانية من خلال دليل قِطاعات.` },
        },
        {
          '@type': 'Question',
          name: `هل يمكنني الاطلاع على أعمال ورش ${catName} السابقة؟`,
          acceptedAnswer: { '@type': 'Answer', text: `نعم، كل ورشة في دليل قِطاعات تملك معرض صور لأعمالها السابقة يمكنك الاطلاع عليه قبل التواصل.` },
        },
      ],
    };
    return itemList ? [breadcrumb, website, itemList, faq] : [breadcrumb, website, faq];
  }, [selectedCategory, catName, sectorMeta, businesses, isRTL, language]));

  if (slug && selectedCategory) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="bg-primary pt-24 pb-10">
          <div className="container-app">
            <div className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-3">
              <Link to="/categories" className="hover:text-gold transition-colors">{isRTL ? 'الأقسام' : 'Categories'}</Link>
              <span>/</span>
              <span className="text-primary-foreground">{catName}</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{catName}</h1>
            {selectedCategory.description_ar && <p className="mt-2 text-primary-foreground/70 text-sm max-w-2xl">{language === 'ar' ? selectedCategory.description_ar : (selectedCategory.description_en || selectedCategory.description_ar)}</p>}
            <p className="mt-2 text-primary-foreground/50 text-xs tech-content">
              {isRTL
                ? `${selectedCounts?.providers_count ?? businesses.length} مزود · ${selectedCounts?.active_services_count ?? 0} خدمة نشطة`
                : `${selectedCounts?.providers_count ?? businesses.length} providers · ${selectedCounts?.active_services_count ?? 0} active services`}
            </p>
          </div>
        </div>
        <div className="container-app page-shell">
          {bizLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">{isRTL ? 'لا يوجد مزودين في هذا القسم حالياً' : 'No providers in this category yet'}</p>
              <Link to="/search"><Button variant="outline">{isRTL ? 'البحث' : 'Search'}</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map((b: any) => (
                <Link key={b.id} to={`/${b.username}`}>
                  <Card className="hover:shadow-lg hover:border-gold/30 transition-all group">
                    <CardContent className="card-pad-md flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {b.logo_url ? <img src={b.logo_url} alt={b.name_ar} className="w-full h-full object-cover" /> : <Building2 className="ic-xl text-muted-foreground/40" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-bold text-sm text-foreground truncate group-hover:text-gold transition-colors">{language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)}</h3>
                        {b.cities && <p className="text-xs text-muted-foreground mt-0.5">{language === 'ar' ? b.cities.name_ar : b.cities.name_en}</p>}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-gold">★ {Number(b.rating_avg).toFixed(1)}</span>
                          <span className="text-micro text-muted-foreground">({b.rating_count})</span>
                          {b.is_verified && <VerifiedBadge size="xs" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10">
        <div className="container-app">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{isRTL ? 'تصفح الأقسام' : 'Browse Categories'}</h1>
          <p className="mt-2 text-primary-foreground/70 text-sm">{isRTL ? 'اختر القسم المناسب لتجد مزودي الخدمات' : 'Choose a category to find service providers'}</p>
        </div>
      </div>
      <div className="container-app page-shell">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <Link key={cat.id} to={`/categories/${cat.slug}`}>
                <Card className="hover:shadow-lg hover:border-gold/30 transition-all group h-full">
                  <CardContent className="card-pad-md flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition-colors">
                      <Layers className="ic-lg text-gold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-heading font-bold text-foreground group-hover:text-gold transition-colors">{language === 'ar' ? cat.name_ar : cat.name_en}</h2>
                      {cat.description_ar && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{language === 'ar' ? cat.description_ar : (cat.description_en || cat.description_ar)}</p>}
                      {(() => {
                        const counts = countsBySlug.get(cat.slug);
                        if (!counts) return null;
                        return (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground tech-content">
                            <span>{isRTL ? `${counts.providers_count} مزود` : `${counts.providers_count} providers`}</span>
                            <span className="opacity-40">·</span>
                            <span>{isRTL ? `${counts.active_services_count} خدمة نشطة` : `${counts.active_services_count} active services`}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Categories;
