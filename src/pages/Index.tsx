import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { SearchSection } from "@/components/home/SearchSection";
import { MembershipSection } from "@/components/home/MembershipSection";
import { LatestProjectsSection } from "@/components/home/LatestProjectsSection";
import { LatestBlogSection } from "@/components/home/LatestBlogSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <CategoriesSection />
      <LatestProjectsSection />
      <FeaturesSection />
      <LatestBlogSection />
      <SearchSection />
      <MembershipSection />
      <Footer />
    </div>
  );
};

export default Index;
