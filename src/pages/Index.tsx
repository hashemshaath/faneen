import { Suspense, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { usePageMeta, useMultiJsonLd } from "@/hooks/usePageMeta";
import { LazyOnView } from "@/components/LazyOnView";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazyRetry } from "@/lib/lazyRetry";
// Eager: above-the-fold + LCP hero, plus the chips bar (small, no images).
import { HeroV2 } from "@/components/home/v2/HomeV2";
import SectorChipsBar from "@/components/home/v2/sections/SectorChipsBar";
// FAQ data is needed eagerly for JSON-LD; keep it in a tiny module so the
// FAQSection component itself can stay lazy-loaded.
import { FAQ_ITEMS_BI } from "@/components/home/v2/sections/faqItems";
// Below-the-fold sections — each one ships as its own chunk so HomeV2 no
// longer carries every image import in the eager bundle (PERF-1C).
const MainSectorsSection = lazyRetry(() => import("@/components/home/v2/sections/MainSectorsSection"));
const HowItWorksV2       = lazyRetry(() => import("@/components/home/v2/sections/HowItWorksV2"));
const SolutionSection    = lazyRetry(() => import("@/components/home/v2/sections/SolutionSection"));
const WhoIsItForSection  = lazyRetry(() => import("@/components/home/v2/sections/WhoIsItForSection"));
const TrustSection       = lazyRetry(() => import("@/components/home/v2/sections/TrustSection"));
const ForProvidersSection = lazyRetry(() => import("@/components/home/v2/sections/ForProvidersSection"));
const ForClientsSection  = lazyRetry(() => import("@/components/home/v2/sections/ForClientsSection"));
const FAQSection         = lazyRetry(() => import("@/components/home/v2/sections/FAQSection"));
const FinalCTASection    = lazyRetry(() => import("@/components/home/v2/sections/FinalCTASection"));

const SectionFallback = ({ minH = 360 }: { minH?: number }) => (
  <div
    aria-hidden="true"
    className="py-16 px-4 container"
    style={{ minHeight: minH, contain: "layout paint" }}
  >
    <div className="h-8 w-48 bg-muted/60 animate-pulse rounded-lg mx-auto" />
  </div>
);

const Index = () => {
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
  useMultiJsonLd(useMemo(() => ([
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
      description: 'القطاعات الرئيسية المتاحة على منصة قِطاعات: ألمنيوم، حديد، خشب، زجاج، ستانلس ستيل، تصنيع وتركيب.',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: 6,
      itemListElement: [
        { slug: 'aluminum',    name: 'ألمنيوم',          nameEn: 'Aluminum',           desc: 'ورش ومصانع الألمنيوم: واجهات، نوافذ، أبواب، كيرتن وول.' },
        { slug: 'iron',        name: 'حديد',             nameEn: 'Iron',               desc: 'أعمال الحديد والتصنيع المعدني: درابزين، أبواب، هياكل.' },
        { slug: 'wood',        name: 'خشب',              nameEn: 'Wood',               desc: 'النجارة والمطابخ والدواليب بمقاسات مخصّصة.' },
        { slug: 'glass',       name: 'زجاج',             nameEn: 'Glass',              desc: 'تركيبات الزجاج، السكوريت، والواجهات الزجاجية.' },
        { slug: 'stainless',   name: 'ستانلس ستيل',      nameEn: 'Stainless Steel',    desc: 'تصنيع وتركيب الستانلس ستيل للمشاريع التجارية والصناعية.' },
        { slug: 'fabrication', name: 'تصنيع وتركيب',     nameEn: 'Fabrication & Install', desc: 'خدمات التصنيع والتركيب الشاملة للمقاولين والمكاتب الهندسية.' },
      ].map((s, i) => ({
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
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS_BI.map((it) => ({
        '@type': 'Question',
        name: it.qAr,
        acceptedAnswer: { '@type': 'Answer', text: it.aAr },
      })),
    },
  ]), []));

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* 1. Hero — above the fold, eager */}
        <HeroV2 />

        {/* 2. Quick sectors — keeps users moving immediately */}
        <SectorChipsBar />

        {/* 3. Featured sectors (acts as featured-providers entry point) */}
        <LazyOnView minHeight={520} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><MainSectorsSection /></Suspense>
        </LazyOnView>

        {/* 4. How it works */}
        <LazyOnView minHeight={460} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><HowItWorksV2 /></Suspense>
        </LazyOnView>

        {/* 5. Why Qitaat */}
        <LazyOnView minHeight={460} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><SolutionSection /></Suspense>
        </LazyOnView>

        {/* 6. Who it's for */}
        <LazyOnView minHeight={420} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><WhoIsItForSection /></Suspense>
        </LazyOnView>

        {/* 7. Trust / verification */}
        <LazyOnView minHeight={460} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><TrustSection /></Suspense>
        </LazyOnView>

        {/* 8. Provider CTA */}
        <LazyOnView minHeight={420} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><ForProvidersSection /></Suspense>
        </LazyOnView>

        {/* 9. Customer CTA */}
        <LazyOnView minHeight={420} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><ForClientsSection /></Suspense>
        </LazyOnView>

        {/* 10. FAQ */}
        <LazyOnView minHeight={460} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><FAQSection /></Suspense>
        </LazyOnView>

        {/* 11. Final CTA */}
        <LazyOnView minHeight={360} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><FinalCTASection /></Suspense>
        </LazyOnView>
      </main>
      <Footer />
      <ScrollToTop />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
