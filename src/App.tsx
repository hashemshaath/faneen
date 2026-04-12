import { lazy, Suspense, ComponentType } from "react";
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
import { AppDirectionShell } from "@/components/ui/app-direction-shell";
import { RouteScrollToTop } from "@/components/RouteScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";

function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch(() => {
      const key = 'lazy-retry-reloaded';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      return factory();
    })
  );
}

const Auth = lazyRetry(() => import("./pages/Auth"));
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));
const BusinessProfile = lazyRetry(() => import("./pages/BusinessProfile"));
const Search = lazyRetry(() => import("./pages/Search"));
const Contracts = lazyRetry(() => import("./pages/Contracts"));
const ContractDetail = lazyRetry(() => import("./pages/ContractDetail"));
const DashboardOverview = lazyRetry(() => import("./pages/dashboard/DashboardOverview"));
const DashboardServices = lazyRetry(() => import("./pages/dashboard/DashboardServices"));
const DashboardPortfolio = lazyRetry(() => import("./pages/dashboard/DashboardPortfolio"));
const DashboardReviews = lazyRetry(() => import("./pages/dashboard/DashboardReviews"));
const DashboardContracts = lazyRetry(() => import("./pages/dashboard/DashboardContracts"));
const DashboardWarranties = lazyRetry(() => import("./pages/dashboard/DashboardWarranties"));
const DashboardInstallments = lazyRetry(() => import("./pages/dashboard/DashboardInstallments"));
const DashboardSettings = lazyRetry(() => import("./pages/dashboard/DashboardSettings"));
const DashboardPromotions = lazyRetry(() => import("./pages/dashboard/DashboardPromotions"));
const DashboardProjects = lazyRetry(() => import("./pages/dashboard/DashboardProjects"));
const DashboardBlog = lazyRetry(() => import("./pages/dashboard/DashboardBlog"));
const DashboardProfileSystems = lazyRetry(() => import("./pages/dashboard/DashboardProfileSystems"));
const DashboardMessages = lazyRetry(() => import("./pages/dashboard/DashboardMessages"));
const DashboardBookmarks = lazyRetry(() => import("./pages/dashboard/DashboardBookmarks"));
const DashboardBookings = lazyRetry(() => import("./pages/dashboard/DashboardBookings"));
const DashboardAnalytics = lazyRetry(() => import("./pages/dashboard/DashboardAnalytics"));
const DashboardNotifications = lazyRetry(() => import("./pages/dashboard/DashboardNotifications"));
const Offers = lazyRetry(() => import("./pages/Offers"));
const Compare = lazyRetry(() => import("./pages/Compare"));
const CompareProfiles = lazyRetry(() => import("./pages/CompareProfiles"));
const Projects = lazyRetry(() => import("./pages/Projects"));
const ProjectDetail = lazyRetry(() => import("./pages/ProjectDetail"));
const Blog = lazyRetry(() => import("./pages/Blog"));
const BlogPost = lazyRetry(() => import("./pages/BlogPost"));
const ProfileSystems = lazyRetry(() => import("./pages/ProfileSystems"));
const ProfileSystemDetail = lazyRetry(() => import("./pages/ProfileSystemDetail"));
const AdminApiSettings = lazyRetry(() => import("./pages/admin/AdminApiSettings"));
const AdminApiDocs = lazyRetry(() => import("./pages/admin/AdminApiDocs"));
const AdminUsers = lazyRetry(() => import("./pages/admin/AdminUsers"));
const AdminSystemSettings = lazyRetry(() => import("./pages/admin/AdminSystemSettings"));
const AdminActivityLog = lazyRetry(() => import("./pages/admin/AdminActivityLog"));
const AdminCategories = lazyRetry(() => import("./pages/admin/AdminCategories"));
const AdminTags = lazyRetry(() => import("./pages/admin/AdminTags"));
const AdminBusinesses = lazyRetry(() => import("./pages/admin/AdminBusinesses"));
const AdminMemberships = lazyRetry(() => import("./pages/admin/AdminMemberships"));
const Notifications = lazyRetry(() => import("./pages/Notifications"));
const Membership = lazyRetry(() => import("./pages/Membership"));
const DashboardOperations = lazyRetry(() => import("./pages/dashboard/DashboardOperations"));
const DashboardAiCenter = lazyRetry(() => import("./pages/dashboard/DashboardAiCenter"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const Onboarding = lazyRetry(() => import("./pages/Onboarding"));
const Categories = lazyRetry(() => import("./pages/Categories"));
const About = lazyRetry(() => import("./pages/About"));
const Contact = lazyRetry(() => import("./pages/Contact"));
const Privacy = lazyRetry(() => import("./pages/Privacy"));
const Terms = lazyRetry(() => import("./pages/Terms"));
const Forbidden = lazyRetry(() => import("./pages/Forbidden"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold animate-pulse">
      <span className="font-heading text-lg font-black text-secondary-foreground">ف</span>
    </div>
  </div>
);

const AppRoutes = () => (
  <BrowserRouter>
    <AppDirectionShell>
      <RouteScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
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
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<Categories />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare-profiles" element={<CompareProfiles />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/forbidden" element={<Forbidden />} />

          <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
          <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />
          <Route path="/dashboard/contracts" element={<ProtectedRoute><DashboardContracts /></ProtectedRoute>} />
          <Route path="/dashboard/messages" element={<ProtectedRoute><DashboardMessages /></ProtectedRoute>} />
          <Route path="/dashboard/bookmarks" element={<ProtectedRoute><DashboardBookmarks /></ProtectedRoute>} />
          <Route path="/dashboard/notifications" element={<ProtectedRoute><DashboardNotifications /></ProtectedRoute>} />
          <Route path="/dashboard/bookings" element={<ProtectedRoute><DashboardBookings /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />

          <Route path="/dashboard/services" element={<ProtectedRoute requireProvider><DashboardServices /></ProtectedRoute>} />
          <Route path="/dashboard/portfolio" element={<ProtectedRoute requireProvider><DashboardPortfolio /></ProtectedRoute>} />
          <Route path="/dashboard/reviews" element={<ProtectedRoute requireProvider><DashboardReviews /></ProtectedRoute>} />
          <Route path="/dashboard/warranties" element={<ProtectedRoute requireProvider><DashboardWarranties /></ProtectedRoute>} />
          <Route path="/dashboard/installments" element={<ProtectedRoute><DashboardInstallments /></ProtectedRoute>} />
          <Route path="/dashboard/promotions" element={<ProtectedRoute requireProvider><DashboardPromotions /></ProtectedRoute>} />
          <Route path="/dashboard/projects" element={<ProtectedRoute requireProvider><DashboardProjects /></ProtectedRoute>} />
          <Route path="/dashboard/operations" element={<ProtectedRoute><DashboardOperations /></ProtectedRoute>} />
          <Route path="/admin/ai-center" element={<ProtectedRoute requireAdmin><DashboardAiCenter /></ProtectedRoute>} />

          <Route path="/dashboard/blog" element={<ProtectedRoute requireAdmin><DashboardBlog /></ProtectedRoute>} />
          <Route path="/dashboard/profile-systems" element={<ProtectedRoute requireAdmin><DashboardProfileSystems /></ProtectedRoute>} />
          <Route path="/admin/api-settings" element={<ProtectedRoute requireAdmin><AdminApiSettings /></ProtectedRoute>} />
          <Route path="/admin/api-docs" element={<ProtectedRoute requireAdmin><AdminApiDocs /></ProtectedRoute>} />
          <Route path="/admin/activity-log" element={<ProtectedRoute requireAdmin><AdminActivityLog /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requireAdmin><AdminCategories /></ProtectedRoute>} />
          <Route path="/admin/tags" element={<ProtectedRoute requireAdmin><AdminTags /></ProtectedRoute>} />
          <Route path="/admin/businesses" element={<ProtectedRoute requireAdmin><AdminBusinesses /></ProtectedRoute>} />
          <Route path="/admin/memberships" element={<ProtectedRoute requireAdmin><AdminMemberships /></ProtectedRoute>} />

          <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/system-settings" element={<ProtectedRoute requireSuperAdmin><AdminSystemSettings /></ProtectedRoute>} />

          <Route path="/:username" element={<BusinessProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppDirectionShell>
  </BrowserRouter>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
