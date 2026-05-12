import { lazy, Suspense, ComponentType } from "react";
import "@/lib/accent-colors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import { GlobalLinkTracker } from "@/components/GlobalLinkTracker";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ThemeApplier } from "@/components/ThemeApplier";
const Index = lazyRetry(() => import("./pages/Index"));
const ConsentBanner = lazy(() => import("./components/consent/ConsentBanner"));

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
const Guides = lazyRetry(() => import("./pages/Guides"));
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
const AdminContactCenter = lazyRetry(() => import("./pages/admin/AdminContactCenter"));
const AdminLeadRequests = lazyRetry(() => import("./pages/admin/AdminLeadRequests"));
const AdminEmailDeliverability = lazyRetry(() => import("./pages/admin/AdminEmailDeliverability"));
const AdminEmailCenter = lazyRetry(() => import("./pages/admin/AdminEmailCenter"));
const AdminSiteAudit = lazyRetry(() => import("./pages/admin/AdminSiteAudit"));
const AdminSectorSeo = lazyRetry(() => import("./pages/admin/AdminSectorSeo"));
const AdminMarketAnalytics = lazyRetry(() => import("./pages/admin/AdminMarketAnalytics"));
const AdminSitemapStatus = lazyRetry(() => import("./pages/admin/AdminSitemapStatus"));
const AdminAccessManagement = lazyRetry(() => import("./pages/admin/AdminAccessManagement"));
const AdminProviderReview = lazyRetry(() => import("./pages/admin/AdminProviderReview"));
const AdminProviderAnalytics = lazyRetry(() => import("./pages/admin/AdminProviderAnalytics"));
const Notifications = lazyRetry(() => import("./pages/Notifications"));
const Membership = lazyRetry(() => import("./pages/Membership"));
const DashboardOperations = lazyRetry(() => import("./pages/dashboard/DashboardOperations"));
const DashboardAiCenter = lazyRetry(() => import("./pages/dashboard/DashboardAiCenter"));
const DashboardLeads = lazyRetry(() => import("./pages/dashboard/DashboardLeads"));
const DashboardBadge = lazyRetry(() => import("./pages/dashboard/DashboardBadge"));
const DashboardMyRequests = lazyRetry(() => import("./pages/dashboard/DashboardMyRequests"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const Onboarding = lazyRetry(() => import("./pages/Onboarding"));
const Categories = lazyRetry(() => import("./pages/Categories"));
const SectorLanding = lazyRetry(() => import("./pages/SectorLanding"));
const SectorsIndex = lazyRetry(() => import("./pages/SectorLanding").then(m => ({ default: m.SectorsIndex })));
const SectorCity = lazyRetry(() => import("./pages/SectorCity"));
const Services = lazyRetry(() => import("./pages/Services"));
const ServiceDetail = lazyRetry(() => import("./pages/ServiceDetail"));
const About = lazyRetry(() => import("./pages/About"));
const Contact = lazyRetry(() => import("./pages/Contact"));
const Privacy = lazyRetry(() => import("./pages/Privacy"));
const Terms = lazyRetry(() => import("./pages/Terms"));
const Forbidden = lazyRetry(() => import("./pages/Forbidden"));
const Unsubscribe = lazyRetry(() => import("./pages/Unsubscribe"));
const VerifyContract = lazyRetry(() => import("./pages/VerifyContract"));
const InviteAccept = lazyRetry(() => import("./pages/InviteAccept"));
const Diagnostics = lazyRetry(() => import("./pages/Diagnostics"));
const ForProviders = lazyRetry(() => import("./pages/ForProviders"));
const DashboardCommunicationPreferences = lazyRetry(() => import("./pages/dashboard/DashboardCommunicationPreferences"));
const AdminProviderLanding = lazyRetry(() => import("./pages/admin/AdminProviderLanding"));
const AdminAnalyticsSettings = lazyRetry(() => import("./pages/admin/AdminAnalyticsSettings"));
const AdminBranding = lazyRetry(() => import("./pages/admin/AdminBranding"));
const AdminContractTemplates = lazyRetry(() => import("./pages/admin/AdminContractTemplates"));
const AdminPdfExportAudit = lazyRetry(() => import("./pages/admin/AdminPdfExportAudit"));

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
    <div className="animate-pulse">
      <BrandLogo variant="mark" tone="auto" size="loader" priority alt="قِطاعات" />
    </div>
  </div>
);

const AppRoutes = () => (
  <BrowserRouter>
    <AppDirectionShell>
      <RouteScrollToTop />
      <GlobalLinkTracker />
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
          <Route path="/guides" element={<Guides />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/profile-systems" element={<ProfileSystems />} />
          <Route path="/profile-systems/:slug" element={<ProfileSystemDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<Categories />} />
          <Route path="/sectors" element={<SectorsIndex />} />
          <Route path="/sectors/:slug" element={<SectorLanding />} />
          <Route path="/sectors/:sector/:city" element={<SectorCity />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare-profiles" element={<CompareProfiles />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/v/c/:number" element={<VerifyContract />} />
          <Route path="/invite/:token" element={<InviteAccept />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/for-providers" element={<ForProviders />} />
          <Route path="/join-as-provider" element={<ForProviders />} />

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
          <Route path="/dashboard/communication-preferences" element={<ProtectedRoute><DashboardCommunicationPreferences /></ProtectedRoute>} />

          <Route path="/dashboard/services" element={<ProtectedRoute requireProvider><DashboardServices /></ProtectedRoute>} />
          <Route path="/dashboard/portfolio" element={<ProtectedRoute requireProvider><DashboardPortfolio /></ProtectedRoute>} />
          <Route path="/dashboard/reviews" element={<ProtectedRoute requireProvider><DashboardReviews /></ProtectedRoute>} />
          <Route path="/dashboard/warranties" element={<ProtectedRoute requireProvider><DashboardWarranties /></ProtectedRoute>} />
          <Route path="/dashboard/installments" element={<ProtectedRoute><DashboardInstallments /></ProtectedRoute>} />
          <Route path="/dashboard/promotions" element={<ProtectedRoute requireProvider><DashboardPromotions /></ProtectedRoute>} />
          <Route path="/dashboard/projects" element={<ProtectedRoute requireProvider><DashboardProjects /></ProtectedRoute>} />
          <Route path="/dashboard/operations" element={<ProtectedRoute><DashboardOperations /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute requireProvider><DashboardAnalytics /></ProtectedRoute>} />
          <Route path="/dashboard/leads" element={<ProtectedRoute requireProvider><DashboardLeads /></ProtectedRoute>} />
          <Route path="/dashboard/badge" element={<ProtectedRoute requireProvider><DashboardBadge /></ProtectedRoute>} />
          <Route path="/dashboard/my-requests" element={<ProtectedRoute><DashboardMyRequests /></ProtectedRoute>} />
          <Route path="/admin/ai-center" element={<ProtectedRoute requireAdmin><DashboardAiCenter /></ProtectedRoute>} />

          <Route path="/dashboard/blog" element={<ProtectedRoute requireAdmin><DashboardBlog /></ProtectedRoute>} />
          <Route path="/dashboard/profile-systems" element={<ProtectedRoute requireAdmin><DashboardProfileSystems /></ProtectedRoute>} />
          <Route path="/admin/api-settings" element={<ProtectedRoute requireAdmin><AdminApiSettings /></ProtectedRoute>} />
          <Route path="/admin/api-docs" element={<ProtectedRoute requireAdmin><AdminApiDocs /></ProtectedRoute>} />
          <Route path="/admin/activity-log" element={<ProtectedRoute requireAdmin><AdminActivityLog /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requireAdmin><AdminCategories /></ProtectedRoute>} />
          <Route path="/admin/tags" element={<ProtectedRoute requireAdmin><AdminTags /></ProtectedRoute>} />
          <Route path="/admin/businesses" element={<ProtectedRoute requireAdmin><AdminBusinesses /></ProtectedRoute>} />
          <Route path="/admin/provider-review" element={<ProtectedRoute requireAdmin><AdminProviderReview /></ProtectedRoute>} />
          <Route path="/admin/memberships" element={<ProtectedRoute requireAdmin><AdminMemberships /></ProtectedRoute>} />
          {/* Phase B — Unified Contact Center. Old routes redirect to the matching tab. */}
          <Route path="/admin/contact-messages" element={<ProtectedRoute requireAdmin><AdminContactCenter /></ProtectedRoute>} />
          <Route path="/admin/contact-inbox-settings" element={<Navigate to="/admin/contact-messages?tab=settings" replace />} />
          <Route path="/admin/contact-audit-log" element={<Navigate to="/admin/contact-messages?tab=audit" replace />} />
          <Route path="/admin/contact-sla-dashboard" element={<Navigate to="/admin/contact-messages?tab=sla" replace />} />
          <Route path="/admin/contact-notification-log" element={<Navigate to="/admin/contact-messages?tab=notifications" replace />} />
          <Route path="/admin/lead-requests" element={<ProtectedRoute requireAdmin><AdminLeadRequests /></ProtectedRoute>} />
          <Route path="/admin/email-deliverability" element={<ProtectedRoute requireAdmin><AdminEmailDeliverability /></ProtectedRoute>} />
          <Route path="/admin/email-center" element={<ProtectedRoute requireAdmin><AdminEmailCenter /></ProtectedRoute>} />
          <Route path="/admin/site-audit" element={<ProtectedRoute requireAdmin><AdminSiteAudit /></ProtectedRoute>} />
          <Route path="/admin/sector-seo" element={<ProtectedRoute requireAdmin><AdminSectorSeo /></ProtectedRoute>} />
          <Route path="/admin/market-analytics" element={<ProtectedRoute requireAdmin><AdminMarketAnalytics /></ProtectedRoute>} />
          <Route path="/admin/sitemap-status" element={<ProtectedRoute requireAdmin><AdminSitemapStatus /></ProtectedRoute>} />
          <Route path="/admin/provider-analytics" element={<ProtectedRoute requireAdmin><AdminProviderAnalytics /></ProtectedRoute>} />
          <Route path="/admin/provider-landing" element={<ProtectedRoute requireAdmin><AdminProviderLanding /></ProtectedRoute>} />
          <Route path="/admin/access-management" element={<ProtectedRoute requireSuperAdmin><AdminAccessManagement /></ProtectedRoute>} />

          <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/system-settings" element={<ProtectedRoute requireSuperAdmin><AdminSystemSettings /></ProtectedRoute>} />
          <Route path="/admin/analytics-settings" element={<ProtectedRoute requireAdmin><AdminAnalyticsSettings /></ProtectedRoute>} />
          <Route path="/admin/branding" element={<ProtectedRoute requireAdmin><AdminBranding /></ProtectedRoute>} />
          <Route path="/admin/contract-templates" element={<ProtectedRoute requireAdmin><AdminContractTemplates /></ProtectedRoute>} />
          <Route path="/admin/pdf-exports" element={<ProtectedRoute requireAdmin><AdminPdfExportAudit /></ProtectedRoute>} />

          <Route path="/:username" element={<BusinessProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <ConsentBanner />
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
              <ThemeApplier />
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
