import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/components/ThemeToggle";
import { AuthProvider } from "@/contexts/AuthContext";

// Only Index is eagerly loaded for fast first paint
import Index from "./pages/Index";

// Lazy load all other pages
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const BusinessProfile = lazy(() => import("./pages/BusinessProfile"));
const Search = lazy(() => import("./pages/Search"));
const Contracts = lazy(() => import("./pages/Contracts"));
const ContractDetail = lazy(() => import("./pages/ContractDetail"));
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const DashboardServices = lazy(() => import("./pages/dashboard/DashboardServices"));
const DashboardPortfolio = lazy(() => import("./pages/dashboard/DashboardPortfolio"));
const DashboardReviews = lazy(() => import("./pages/dashboard/DashboardReviews"));
const DashboardContracts = lazy(() => import("./pages/dashboard/DashboardContracts"));
const DashboardWarranties = lazy(() => import("./pages/dashboard/DashboardWarranties"));
const DashboardInstallments = lazy(() => import("./pages/dashboard/DashboardInstallments"));
const DashboardSettings = lazy(() => import("./pages/dashboard/DashboardSettings"));
const DashboardPromotions = lazy(() => import("./pages/dashboard/DashboardPromotions"));
const DashboardProjects = lazy(() => import("./pages/dashboard/DashboardProjects"));
const DashboardBlog = lazy(() => import("./pages/dashboard/DashboardBlog"));
const DashboardProfileSystems = lazy(() => import("./pages/dashboard/DashboardProfileSystems"));
const DashboardMessages = lazy(() => import("./pages/dashboard/DashboardMessages"));
const DashboardBookmarks = lazy(() => import("./pages/dashboard/DashboardBookmarks"));
const Offers = lazy(() => import("./pages/Offers"));
const Compare = lazy(() => import("./pages/Compare"));
const CompareProfiles = lazy(() => import("./pages/CompareProfiles"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ProfileSystems = lazy(() => import("./pages/ProfileSystems"));
const ProfileSystemDetail = lazy(() => import("./pages/ProfileSystemDetail"));
const AdminApiSettings = lazy(() => import("./pages/admin/AdminApiSettings"));
const AdminApiDocs = lazy(() => import("./pages/admin/AdminApiDocs"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center animate-pulse">
      <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
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
                  <Route path="/dashboard/bookmarks" element={<DashboardBookmarks />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/offers" element={<Offers />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/profile-systems" element={<ProfileSystems />} />
                  <Route path="/profile-systems/:slug" element={<ProfileSystemDetail />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/compare-profiles" element={<CompareProfiles />} />
                  <Route path="/admin/api-settings" element={<AdminApiSettings />} />
                  <Route path="/admin/api-docs" element={<AdminApiDocs />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/activity-log" element={<AdminActivityLog />} />
                  <Route path="/:username" element={<BusinessProfile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
