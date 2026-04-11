import { lazy, Suspense, ComponentType } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { ScrollToTop } from "@/components/ScrollToTop";

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

const SectionFallback = () => (
  <div className="py-16 px-4 container space-y-4">
    <div className="h-8 w-48 bg-muted animate-pulse rounded-lg mx-auto" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}</div>
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <Suspense fallback={<SectionFallback />}>
        <CategoriesSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <HowItWorksSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TopProvidersSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <LatestProjectsSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <LatestOffersSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <FeaturesSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <LatestBlogSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <MembershipSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <CTASection />
      </Suspense>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
