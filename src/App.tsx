import { lazy, Suspense } from "react";
import "@/lib/accent-colors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/components/ThemeToggle";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

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
const AdminSystemSettings = lazy(() => import("./pages/admin/AdminSystemSettings"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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
                  {/* Public pages */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<ProtectedRoute skipOnboarding><Onboarding /></ProtectedRoute>} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/offers" element={<Offers />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/profile-systems" element={<ProfileSystems />} />
                  <Route path="/profile-systems/:slug" element={<ProfileSystemDetail />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/compare-profiles" element={<CompareProfiles />} />

                  {/* Auth-protected pages */}
                  <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
                  <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

                  {/* Dashboard - requires auth */}
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />
                  <Route path="/dashboard/services" element={<ProtectedRoute><DashboardServices /></ProtectedRoute>} />
                  <Route path="/dashboard/portfolio" element={<ProtectedRoute><DashboardPortfolio /></ProtectedRoute>} />
                  <Route path="/dashboard/reviews" element={<ProtectedRoute><DashboardReviews /></ProtectedRoute>} />
                  <Route path="/dashboard/contracts" element={<ProtectedRoute><DashboardContracts /></ProtectedRoute>} />
                  <Route path="/dashboard/warranties" element={<ProtectedRoute><DashboardWarranties /></ProtectedRoute>} />
                  <Route path="/dashboard/installments" element={<ProtectedRoute><DashboardInstallments /></ProtectedRoute>} />
                  <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
                  <Route path="/dashboard/promotions" element={<ProtectedRoute><DashboardPromotions /></ProtectedRoute>} />
                  <Route path="/dashboard/projects" element={<ProtectedRoute><DashboardProjects /></ProtectedRoute>} />
                  <Route path="/dashboard/messages" element={<ProtectedRoute><DashboardMessages /></ProtectedRoute>} />
                  <Route path="/dashboard/bookmarks" element={<ProtectedRoute><DashboardBookmarks /></ProtectedRoute>} />

                  {/* Admin pages - requires admin role */}
                  <Route path="/dashboard/blog" element={<ProtectedRoute requireAdmin><DashboardBlog /></ProtectedRoute>} />
                  <Route path="/dashboard/profile-systems" element={<ProtectedRoute requireAdmin><DashboardProfileSystems /></ProtectedRoute>} />
                  <Route path="/admin/api-settings" element={<ProtectedRoute requireAdmin><AdminApiSettings /></ProtectedRoute>} />
                  <Route path="/admin/api-docs" element={<ProtectedRoute requireAdmin><AdminApiDocs /></ProtectedRoute>} />
                  <Route path="/admin/activity-log" element={<ProtectedRoute requireAdmin><AdminActivityLog /></ProtectedRoute>} />

                  {/* Super Admin only */}
                  <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin><AdminUsers /></ProtectedRoute>} />
                  <Route path="/admin/system-settings" element={<ProtectedRoute requireSuperAdmin><AdminSystemSettings /></ProtectedRoute>} />

                  {/* Dynamic profile route (must be last) */}
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
