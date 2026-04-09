import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import BusinessProfile from "./pages/BusinessProfile";
import Search from "./pages/Search";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import DashboardServices from "./pages/dashboard/DashboardServices";
import DashboardPortfolio from "./pages/dashboard/DashboardPortfolio";
import DashboardReviews from "./pages/dashboard/DashboardReviews";
import DashboardContracts from "./pages/dashboard/DashboardContracts";
import DashboardWarranties from "./pages/dashboard/DashboardWarranties";
import DashboardInstallments from "./pages/dashboard/DashboardInstallments";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import DashboardPromotions from "./pages/dashboard/DashboardPromotions";
import Offers from "./pages/Offers";
import Compare from "./pages/Compare";
import AdminApiSettings from "./pages/admin/AdminApiSettings";
import AdminApiDocs from "./pages/admin/AdminApiDocs";
import DashboardProjects from "./pages/dashboard/DashboardProjects";
import DashboardBlog from "./pages/dashboard/DashboardBlog";
import Projects from "./pages/Projects";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ProfileSystems from "./pages/ProfileSystems";
import ProfileSystemDetail from "./pages/ProfileSystemDetail";
import CompareProfiles from "./pages/CompareProfiles";
import DashboardProfileSystems from "./pages/dashboard/DashboardProfileSystems";
import DashboardMessages from "./pages/dashboard/DashboardMessages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/search" element={<Search />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/dashboard" element={<DashboardOverview />} />
              <Route path="/dashboard/services" element={<DashboardServices />} />
              <Route path="/dashboard/portfolio" element={<DashboardPortfolio />} />
              <Route path="/dashboard/reviews" element={<DashboardReviews />} />
              <Route path="/dashboard/contracts" element={<DashboardContracts />} />
              <Route path="/dashboard/warranties" element={<DashboardWarranties />} />
              <Route path="/dashboard/installments" element={<DashboardInstallments />} />
              <Route path="/dashboard/settings" element={<DashboardSettings />} />
              <Route path="/dashboard/promotions" element={<DashboardPromotions />} />
              <Route path="/dashboard/projects" element={<DashboardProjects />} />
              <Route path="/dashboard/blog" element={<DashboardBlog />} />
              <Route path="/dashboard/profile-systems" element={<DashboardProfileSystems />} />
              <Route path="/dashboard/messages" element={<DashboardMessages />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/profile-systems" element={<ProfileSystems />} />
              <Route path="/profile-systems/:slug" element={<ProfileSystemDetail />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/compare-profiles" element={<CompareProfiles />} />
              <Route path="/admin/api-settings" element={<AdminApiSettings />} />
              <Route path="/admin/api-docs" element={<AdminApiDocs />} />
              <Route path="/:username" element={<BusinessProfile />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
