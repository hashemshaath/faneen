import { lazy, Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { ScrollToTop } from "@/components/ScrollToTop";

// Lazy load below-the-fold sections
const CategoriesSection = lazy(() => import("@/components/home/CategoriesSection").then(m => ({ default: m.CategoriesSection })));
const LatestProjectsSection = lazy(() => import("@/components/home/LatestProjectsSection").then(m => ({ default: m.LatestProjectsSection })));
const LatestOffersSection = lazy(() => import("@/components/home/LatestOffersSection").then(m => ({ default: m.LatestOffersSection })));
const FeaturesSection = lazy(() => import("@/components/home/FeaturesSection").then(m => ({ default: m.FeaturesSection })));
const LatestBlogSection = lazy(() => import("@/components/home/LatestBlogSection").then(m => ({ default: m.LatestBlogSection })));
const SearchSection = lazy(() => import("@/components/home/SearchSection").then(m => ({ default: m.SearchSection })));
const MembershipSection = lazy(() => import("@/components/home/MembershipSection").then(m => ({ default: m.MembershipSection })));

const SectionFallback = () => (
  <div className="py-16 flex justify-center">
    <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
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
        <SearchSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <MembershipSection />
      </Suspense>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
