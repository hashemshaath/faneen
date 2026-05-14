import { lazy, Suspense, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { usePageMeta, useJsonLd } from "@/hooks/usePageMeta";
import { LazyOnView } from "@/components/LazyOnView";
import {
  HeroV2,
  SectorChipsBar,
  ProblemSection,
  SolutionSection,
  HowItWorksV2,
  WhoIsItForSection,
  MainSectorsSection,
  ForClientsSection,
  ForContractorsSection,
  ForProvidersSection,
  TrustSection,
  FAQSection,
  FinalCTASection,
  FAQ_ITEMS_BI,
} from "@/components/home/v2/HomeV2";

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

  // WebSite + Organization JSON-LD
  useJsonLd(useMemo(() => ({
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
    },
  }), []));

  // FAQPage JSON-LD generated from the same items shown in the UI
  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS_BI.map((it) => ({
      '@type': 'Question',
      name: it.qAr,
      acceptedAnswer: { '@type': 'Answer', text: it.aAr },
    })),
  }), []));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* 1. Hero — above the fold, eager */}
        <HeroV2 />

        {/* 2. Quick sectors — keeps users moving immediately */}
        <SectorChipsBar />

        {/* 3-13. Below-the-fold sections, mounted as they approach view */}
        <LazyOnView minHeight={420} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><ProblemSection /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={460} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><SolutionSection /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={460} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><HowItWorksV2 /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={420} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><WhoIsItForSection /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={520} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><MainSectorsSection /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={420} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><ForClientsSection /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={420} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><ForContractorsSection /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={420} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><ForProvidersSection /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={460} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><TrustSection /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={460} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><FAQSection /></Suspense>
        </LazyOnView>
        <LazyOnView minHeight={360} className="cv-auto">
          <Suspense fallback={<SectionFallback />}><FinalCTASection /></Suspense>
        </LazyOnView>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
