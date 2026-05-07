import { lazy, Suspense, ComponentType, useMemo, memo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { ScrollToTop } from "@/components/ScrollToTop";
import { usePageMeta, useJsonLd } from "@/hooks/usePageMeta";

// Retry wrapper for lazy imports to handle stale chunk errors after deploys
function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch(() => {
      // Force reload once to get fresh assets
      const key = 'lazy-retry-reloaded';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      return factory();
    })
  );
}

const CategoriesSection = lazyRetry(() => import("@/components/home/CategoriesSection").then(m => ({ default: m.CategoriesSection })));
const HowItWorksSection = lazyRetry(() => import("@/components/home/HowItWorksSection").then(m => ({ default: m.HowItWorksSection })));
const TopProvidersSection = lazyRetry(() => import("@/components/home/TopProvidersSection").then(m => ({ default: m.TopProvidersSection })));
const LatestProjectsSection = lazyRetry(() => import("@/components/home/LatestProjectsSection").then(m => ({ default: m.LatestProjectsSection })));
const LatestOffersSection = lazyRetry(() => import("@/components/home/LatestOffersSection").then(m => ({ default: m.LatestOffersSection })));
const FeaturesSection = lazyRetry(() => import("@/components/home/FeaturesSection").then(m => ({ default: m.FeaturesSection })));
const LatestBlogSection = lazyRetry(() => import("@/components/home/LatestBlogSection").then(m => ({ default: m.LatestBlogSection })));
const MembershipSection = lazyRetry(() => import("@/components/home/MembershipSection").then(m => ({ default: m.MembershipSection })));
const CTASection = lazyRetry(() => import("@/components/home/CTASection").then(m => ({ default: m.CTASection })));

/**
 * Reserves a fixed vertical block while a lazy section loads, so layout
 * doesn't jump (CLS). Height matches a typical section so content beneath
 * doesn't shift when the real section mounts.
 */
const SectionFallback = ({ minH = 480 }: { minH?: number }) => (
  <div
    aria-hidden="true"
    className="py-16 px-4 container"
    style={{ minHeight: minH, contain: 'layout paint' }}
  >
    <div className="h-8 w-48 bg-muted/60 animate-pulse rounded-lg mx-auto" />
  </div>
);

const Index = () => {
  usePageMeta({
    title: 'قِطاعات — دليل ورش الألمنيوم والحديد والزجاج',
    description: 'دليل شامل لأفضل ورش ومصانع الألمنيوم والحديد والزجاج والمطابخ في السعودية والخليج. ابحث وقارن بين مزودي الخدمات بسهولة.',
    keywords: 'ألمنيوم, حديد, زجاج, مطابخ, أبواب, شبابيك, ديكورات, ورش, صناعات خفيفة, دليل أعمال, قِطاعات',
    canonical: 'https://qitaat.com/',
    ogType: 'website',
    ogTitle: 'قِطاعات Qitaat — دليل الصناعات الخفيفة',
    ogDescription: 'دليل شامل لأفضل ورش ومصانع الألمنيوم والحديد والزجاج والديكورات في الخليج',
  });

  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'قِطاعات Qitaat',
    url: 'https://qitaat.com',
    description: 'دليل شامل لأعمال الألمنيوم والحديد والزجاج والخشب والمطابخ والديكورات',
    inLanguage: 'ar',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://qitaat.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'قِطاعات Qitaat',
      url: 'https://qitaat.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://qitaat.com/logo.png',
      },
      sameAs: [
        'https://x.com/qitaat',
        'https://www.instagram.com/qitaat',
        'https://www.linkedin.com/company/qitaat',
        'https://www.youtube.com/@qitaat',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        url: 'https://qitaat.com/contact',
        availableLanguage: ['ar', 'en'],
      },
    },
  }), []));

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <Suspense fallback={<SectionFallback />}>
        <CategoriesSection />
      </Suspense>
      <div className="cv-auto">
        <Suspense fallback={<SectionFallback />}>
          <HowItWorksSection />
        </Suspense>
      </div>
      <div className="cv-auto">
        <Suspense fallback={<SectionFallback />}>
          <TopProvidersSection />
        </Suspense>
      </div>
      <div className="cv-auto">
        <Suspense fallback={<SectionFallback />}>
          <LatestProjectsSection />
        </Suspense>
      </div>
      <div className="cv-auto">
        <Suspense fallback={<SectionFallback />}>
          <LatestOffersSection />
        </Suspense>
      </div>
      <div className="cv-auto">
        <Suspense fallback={<SectionFallback />}>
          <FeaturesSection />
        </Suspense>
      </div>
      <div className="cv-auto">
        <Suspense fallback={<SectionFallback />}>
          <LatestBlogSection />
        </Suspense>
      </div>
      <div className="cv-auto">
        <Suspense fallback={<SectionFallback />}>
          <MembershipSection />
        </Suspense>
      </div>
      <div className="cv-auto">
        <Suspense fallback={<SectionFallback />}>
          <CTASection />
        </Suspense>
      </div>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
