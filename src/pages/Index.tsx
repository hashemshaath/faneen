import { Suspense, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { usePageMeta, useMultiJsonLd } from "@/hooks/usePageMeta";
import { useImagePerfTracking } from "@/hooks/useImagePerfTracking";
import { LazyOnView } from "@/components/LazyOnView";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazyRetry } from "@/lib/lazyRetry";
import { HOME_JSONLD_SLUGS, getHomeTaxonomyEntry } from "@/components/home/v2/data/homeTaxonomy";
// Eager: above-the-fold + LCP hero, plus the chips bar (small, no images).
import { HeroV2 } from "@/components/home/v2/HomeV2";
// FAQ JSON-LD reads from the same source as <FAQSection>: DB first
// (home_faq_items), with a static fallback baked into useHomeFaq.
import { useHomeFaq } from "@/modules/home";
// Below-the-fold sections — each one ships as its own chunk so HomeV2 no
// longer carries every image import in the eager bundle (PERF-1C).
// HomeV2 rebuild (marketplace layout): 11 sections → 6 sections.
const HomeSectorGrid       = lazyRetry(() => import("@/components/home/v2/sections/HomeSectorGrid"));
const HomeAudienceSplit    = lazyRetry(() => import("@/components/home/v2/sections/HomeAudienceSplit"));
const HomeCategoryRows     = lazyRetry(() => import("@/components/home/v2/sections/HomeCategoryRows"));
const HowItWorksV2         = lazyRetry(() => import("@/components/home/v2/sections/HowItWorksV2"));
const FAQSection           = lazyRetry(() => import("@/components/home/v2/sections/FAQSection"));
const PartnerShowcaseSection = lazyRetry(() => import("@/components/home/v2/sections/PartnerShowcaseSection"));

/**
 * Skeleton placeholder rendered while a lazy home section is loading.
 * Mirrors the visual rhythm of `<Section>` + `<SectionCover>` + a 3-card
 * grid so the page doesn't visibly collapse to a tiny pulse bar between
 * the hero and the first scroll-in section.
 *
 * variant:
 *  - "grid"   (default): eyebrow + title + 3 card tiles
 *  - "split"           : eyebrow + title + 2-column (image + bullets) row
 *  - "centered"        : eyebrow + title + sub + single CTA pill (final CTA)
 */
const SectionFallback = ({
  minH = 360,
  variant = "grid",
}: {
  minH?: number;
  variant?: "grid" | "split" | "centered";
}) => (
  <section
    aria-hidden="true"
    className="py-14 sm:py-20"
    style={{ minHeight: minH, contain: "layout paint" }}
  >
    <div className="container-app">
      {/* Eyebrow + title block — matches SectionCover spacing */}
      <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14 space-y-4">
        <div className="mx-auto h-5 w-32 rounded-full bg-muted/70 animate-pulse" />
        <div className="mx-auto h-8 sm:h-10 w-3/4 rounded-lg bg-muted/70 animate-pulse" />
        <div className="mx-auto h-4 w-2/3 rounded bg-muted/50 animate-pulse" />
      </div>

      {variant === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-card overflow-hidden"
            >
              <div className="aspect-[4/3] sm:aspect-[16/10] bg-muted/70 animate-pulse" />
              <div className="p-4 sm:p-5 md:p-6 space-y-3">
                <div className="h-4 w-5/6 rounded bg-muted/60 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
                <div className="pt-3 border-t border-border/40">
                  <div className="h-3 w-28 rounded bg-muted/50 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "split" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="space-y-3">
            <div className="h-5 w-24 rounded-full bg-muted/70 animate-pulse" />
            <div className="h-7 w-3/4 rounded bg-muted/70 animate-pulse" />
            <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-muted/50 animate-pulse" />
            <div className="pt-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 w-2/3 rounded bg-muted/40 animate-pulse" />
              ))}
            </div>
            <div className="h-11 w-40 rounded-xl bg-muted/70 animate-pulse mt-4" />
          </div>
          <div className="aspect-[4/3] rounded-2xl bg-muted/70 animate-pulse border border-border/60" />
        </div>
      )}

      {variant === "centered" && (
        <div className="max-w-xl mx-auto flex flex-col items-center gap-4">
          <div className="h-11 w-48 rounded-xl bg-muted/70 animate-pulse" />
        </div>
      )}
    </div>
  </section>
);

const Index = () => {
  useImagePerfTracking('home');
  const { items: faqItems } = useHomeFaq();
  usePageMeta({
    title: 'قطاعات | مزودو خدمات الألمنيوم والحديد والخشب والزجاج في السعودية',
    description:
      'ابحث عن مزودي خدمات الصناعات الخفيفة في السعودية، واطلب عروض أسعار في الألمنيوم، الحديد، الخشب، الزجاج، والستانلس ستيل بطريقة أوضح وأكثر تنظيمًا.',
    keywords:
      'مزودو خدمات الصناعات الخفيفة, ورش ألمنيوم, أعمال حديد, أعمال خشب, أعمال زجاج, ستانلس ستيل, طلب عرض سعر, مزودي خدمة في السعودية, ورش ومصانع, مقاولين ومكاتب هندسية',
    canonical: 'https://qitaat.com/',
    ogType: 'website',
    ogTitle: 'قطاعات — مزودو خدمات الصناعات الخفيفة في مكان واحد',
    ogDescription:
      'منصة تساعدك على الوصول إلى مزودي خدمات الألمنيوم والحديد والخشب والزجاج والستانلس ستيل، وطلب عروض الأسعار بطريقة منظمة.',
  });

  // WebSite + Organization + FAQPage JSON-LD (all rendered as separate <script> tags)
  useMultiJsonLd(useMemo(() => {
    const blocks: Array<Record<string, unknown>> = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'قِطاعات Qitaat',
      url: 'https://qitaat.com',
      description:
        'منصة تساعد على الوصول إلى مزودي خدمات الصناعات الخفيفة (ألمنيوم، حديد، خشب، زجاج، ستانلس ستيل) وطلب عروض الأسعار بطريقة منظمة.',
      inLanguage: 'ar',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://qitaat.com/search?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
      publisher: {
        '@type': 'Organization',
        name: 'قِطاعات Qitaat',
        url: 'https://qitaat.com',
        logo: { '@type': 'ImageObject', url: 'https://qitaat.com/logo.png' },
        sameAs: [
          'https://twitter.com/qitaat',
          'https://www.linkedin.com/company/qitaat',
          'https://www.instagram.com/qitaat',
        ],
        contactPoint: [{
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@qitaat.com',
          areaServed: 'SA',
          availableLanguage: ['Arabic', 'English'],
        }],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'قطاعات الصناعات الخفيفة',
      description: 'الأنشطة الرئيسية على منصة قِطاعات: ألمنيوم، زجاج وسيكوريت، حديد ومعادن، ستانلس ستيل، خشب ونجارة، مطابخ، واجهات وكلادينج، مقاولات وتشطيبات، مصاعد وصيانة، طاقة واستدامة، تقنية وشبكات، أنظمة حماية وتحكم، وتأجير المعدات.',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: HOME_JSONLD_SLUGS.length,
      // Derived from homeTaxonomy.ts — no slug strings in this file.
      itemListElement: HOME_JSONLD_SLUGS.map((slug) => {
        const e = getHomeTaxonomyEntry(slug);
        if (!e) throw new Error(`Index.tsx JSON-LD: unknown home slug "${slug}"`);
        return { slug: e.slug, name: e.labelAr, nameEn: e.labelEn, desc: e.descAr };
      }).map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: s.name,
        url: `https://qitaat.com/search?category=${s.slug}`,
        item: {
          '@type': 'Service',
          '@id': `https://qitaat.com/search?category=${s.slug}#service`,
          name: s.name,
          alternateName: s.nameEn,
          description: s.desc,
          serviceType: s.name,
          inLanguage: 'ar-SA-u-nu-latn',
          category: s.nameEn,
          areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
          provider: { '@type': 'Organization', name: 'قِطاعات Qitaat', url: 'https://qitaat.com' },
          url: `https://qitaat.com/search?category=${s.slug}`,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'التنقل الرئيسي — قطاعات',
      itemListElement: [
        { name: 'الرئيسية',     url: 'https://qitaat.com/' },
        { name: 'القطاعات',     url: 'https://qitaat.com/categories' },
        { name: 'البحث',         url: 'https://qitaat.com/search' },
        { name: 'كيف يعمل',      url: 'https://qitaat.com/#how-it-works' },
        { name: 'القطاعات الرئيسية', url: 'https://qitaat.com/#sectors' },
        { name: 'الأسئلة الشائعة', url: 'https://qitaat.com/#faq' },
      ].map((n, i) => ({
        '@type': 'SiteNavigationElement',
        position: i + 1,
        name: n.name,
        url: n.url,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://qitaat.com/' },
        { '@type': 'ListItem', position: 2, name: 'القطاعات', item: 'https://qitaat.com/categories' },
        { '@type': 'ListItem', position: 3, name: 'البحث', item: 'https://qitaat.com/search' },
      ],
    },
  ];
  if (faqItems.length > 0) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((it) => ({
        '@type': 'Question',
        name: it.question_ar,
        acceptedAnswer: { '@type': 'Answer', text: it.answer_ar },
      })),
    });
  }
  if (featuredProviders.length > 0) {
  return blocks;
  }, [faqItems]));

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* 1. Hero — above the fold, eager */}
        <HeroV2 />

        {/* 2. Main sectors — clean visual grid, 6 taxonomy-stable tiles */}
        <LazyOnView minHeight={520} className="cv-auto">
          <Suspense fallback={<SectionFallback variant="grid" minH={520} />}><HomeSectorGrid /></Suspense>
        </LazyOnView>

        {/* 3. Audience split — customer | provider in one row */}
        <LazyOnView minHeight={360} className="cv-auto">
          <Suspense fallback={<SectionFallback variant="split" minH={360} />}><HomeAudienceSplit /></Suspense>
        </LazyOnView>

        {/* 4. Marketplace rows — specialised category clusters with chips */}
        <LazyOnView minHeight={600} className="cv-auto">
          <Suspense fallback={<SectionFallback variant="grid" minH={600} />}><HomeCategoryRows /></Suspense>
        </LazyOnView>

        {/* 5. How it works — concise 3-step explainer */}
        <LazyOnView minHeight={420} className="cv-auto">
          <Suspense fallback={<SectionFallback variant="grid" minH={420} />}><HowItWorksV2 /></Suspense>
        </LazyOnView>

        {/* 6b. Partner showcase — admin-controlled logo marquee */}
        <LazyOnView minHeight={220} className="cv-auto">
          <Suspense fallback={<div className="min-h-[220px]" />}><PartnerShowcaseSection /></Suspense>
        </LazyOnView>

        {/* 7. FAQ — also feeds FAQPage JSON-LD above */}
        <LazyOnView minHeight={460} className="cv-auto">
          <Suspense fallback={<SectionFallback variant="grid" minH={460} />}><FAQSection /></Suspense>
        </LazyOnView>
      </main>
      <Footer />
      <ScrollToTop />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
