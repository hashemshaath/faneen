import { lazy, Suspense, ComponentType } from "react";
import "@/lib/accent-colors";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
const BuildVersionWatcher = lazy(() => import("./components/BuildVersionWatcher"));

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
const HelpCenterHome = lazyRetry(() => import("./pages/help/HelpCenterHome"));
const HelpCategoryPage = lazyRetry(() => import("./pages/help/HelpCategoryPage"));
const HelpArticlePage = lazyRetry(() => import("./pages/help/HelpArticlePage"));
const ReportIssuePage = lazyRetry(() => import("./pages/help/ReportIssuePage"));
const FeatureRequestPage = lazyRetry(() => import("./pages/help/FeatureRequestPage"));
const AdminHelpCenter = lazyRetry(() => import("./pages/admin/AdminHelpCenter"));
const DashboardHelpCenter = lazyRetry(() => import("./pages/dashboard/DashboardHelpCenter"));
const HelpLauncherFloating = lazy(() => import("./components/help/HelpLauncherFloating"));
const PublicSiteScan = lazyRetry(() => import("./pages/PublicSiteScan"));
const PublicBarcodeResolve = lazyRetry(() => import("./pages/PublicBarcodeResolve"));
const ReferenceResolver = lazyRetry(() => import("./pages/ReferenceResolver"));
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));
const QuotationViewer = lazyRetry(() => import("./pages/QuotationViewer"));
const CustomerProjectPortal = lazyRetry(() => import("./pages/CustomerProjectPortal"));
const QSlugDispatcher = lazyRetry(() => import("./pages/QSlugDispatcher"));
const BusinessProfile = lazyRetry(() => import("./pages/BusinessProfile"));
const UsernameResolver = lazyRetry(() => import("./pages/UsernameResolver"));
const Search = lazyRetry(() => import("./pages/Search"));
const Quote = lazyRetry(() => import("./pages/Quote"));
const ProviderLeads = lazyRetry(() => import("./pages/dashboard/ProviderLeads"));
const ProviderLeadDetails = lazyRetry(() => import("./pages/dashboard/ProviderLeadDetails"));
const ProviderServiceAreas = lazyRetry(() => import("./pages/dashboard/ProviderServiceAreas"));
const ProviderMembership = lazyRetry(() => import("./pages/dashboard/ProviderMembership"));
const AdminProviderSubscriptions = lazyRetry(() => import("./pages/admin/AdminProviderSubscriptions"));
const AdminAbExperiments = lazyRetry(() => import("./pages/admin/AdminAbExperiments"));
const AdminShowcase = lazyRetry(() => import("./pages/admin/AdminShowcase"));
const DashboardShowcase = lazyRetry(() => import("./pages/dashboard/DashboardShowcase"));
const Showcase = lazyRetry(() => import("./pages/Showcase"));
const Contracts = lazyRetry(() => import("./pages/Contracts"));
const ContractDetail = lazyRetry(() => import("./pages/ContractDetail"));
const DashboardOverview = lazyRetry(() => import("./pages/dashboard/DashboardOverview"));
const DashboardServices = lazyRetry(() => import("./pages/dashboard/DashboardServices"));
const DashboardPortfolio = lazyRetry(() => import("./pages/dashboard/DashboardPortfolio"));
const DashboardReviews = lazyRetry(() => import("./pages/dashboard/DashboardReviews"));
const DashboardContracts = lazyRetry(() => import("./pages/dashboard/DashboardContracts"));
const DashboardWorkOrders = lazyRetry(() => import("./pages/dashboard/DashboardWorkOrders"));
const DashboardWorkOrdersOverview = lazyRetry(() => import("./pages/dashboard/DashboardWorkOrdersOverview"));
const ProductionBoardPage = lazyRetry(() => import("./pages/dashboard/ProductionBoardPage"));
const DashboardWorkOrderDetail = lazyRetry(() => import("./pages/dashboard/DashboardWorkOrderDetail"));
const DashboardProcurement = lazyRetry(() => import("./pages/dashboard/DashboardProcurement"));
const DashboardProcurementDetail = lazyRetry(() => import("./pages/dashboard/DashboardProcurementDetail"));
const DashboardWarranties = lazyRetry(() => import("./pages/dashboard/DashboardWarranties"));
const DashboardInstallments = lazyRetry(() => import("./pages/dashboard/DashboardInstallments"));
const DashboardSettings = lazyRetry(() => import("./pages/dashboard/DashboardSettings"));
const DashboardStaffCenter = lazyRetry(() => import("./pages/dashboard/DashboardStaffCenter"));
const DashboardNoAccess = lazyRetry(() => import("./pages/dashboard/DashboardNoAccess"));
const DashboardProfile = lazyRetry(() => import("./pages/dashboard/DashboardProfile"));
const DashboardPromotions = lazyRetry(() => import("./pages/dashboard/DashboardPromotions"));
const DashboardPrivateSectors = lazyRetry(() => import("./pages/dashboard/DashboardPrivateSectors"));
const AdminPrivateSectors = lazyRetry(() => import("./pages/admin/AdminPrivateSectors"));
const BrandsCatalog = lazyRetry(() => import("./pages/BrandsCatalog"));
const BrandDetail = lazyRetry(() => import("./pages/BrandDetail"));
const DashboardProjects = lazyRetry(() => import("./pages/dashboard/DashboardProjects"));
const DashboardBlog = lazyRetry(() => import("./pages/dashboard/DashboardBlog"));
const DashboardProfileSystems = lazyRetry(() => import("./pages/dashboard/DashboardProfileSystems"));
const DashboardMessages = lazyRetry(() => import("./pages/dashboard/DashboardMessages"));
const DashboardBookmarks = lazyRetry(() => import("./pages/dashboard/DashboardBookmarks"));
const DashboardBookings = lazyRetry(() => import("./pages/dashboard/DashboardBookings"));
const DashboardAnalytics = lazyRetry(() => import("./pages/dashboard/DashboardAnalytics"));
const DashboardContractAnalytics = lazyRetry(() => import("./pages/dashboard/DashboardContractAnalytics"));
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
const AdminUserDetail = lazyRetry(() => import("./pages/admin/AdminUserDetail"));
const AdminIdentity = lazyRetry(() => import("./pages/admin/AdminIdentity"));
const AdminSystemSettings = lazyRetry(() => import("./pages/admin/AdminSystemSettings"));
const AdminCronRuns = lazyRetry(() => import("./pages/admin/AdminCronRuns"));
const AdminOperations = lazyRetry(() => import("./pages/admin/AdminOperations"));
const AdminOperationsConsole = lazyRetry(() => import("./pages/admin/AdminOperationsConsole"));
const AdminReferenceInspector = lazyRetry(() => import("./pages/admin/AdminReferenceInspector"));
const AdminBulkReferenceTriage = lazyRetry(() => import("./pages/admin/AdminBulkReferenceTriage"));
const AdminActivityLog = lazyRetry(() => import("./pages/admin/AdminActivityLog"));
const AdminCategories = lazyRetry(() => import("./pages/admin/AdminCategories"));
const AdminTags = lazyRetry(() => import("./pages/admin/AdminTags"));
const AdminBusinesses = lazyRetry(() => import("./pages/admin/AdminBusinesses"));
const AdminEntityAccessRequests = lazyRetry(() => import("./pages/admin/AdminEntityAccessRequests"));
const AdminLocationsHub = lazyRetry(() => import("./pages/admin/locations/AdminLocationsHub"));
const AdminLocationsCatalog = lazyRetry(() => import("./pages/admin/locations/AdminLocationsCatalog"));
const AdminBusinessServiceAreas = lazyRetry(() => import("./pages/admin/locations/AdminBusinessServiceAreas"));
const AdminBusinessCoordinates = lazyRetry(() => import("./pages/admin/locations/AdminBusinessCoordinates"));
const AdminClientSitesMonitoring = lazyRetry(() => import("./pages/admin/AdminClientSitesMonitoring"));
const AdminBarcodeRegistry = lazyRetry(() => import("./pages/admin/AdminBarcodeRegistry"));
const AdminMemberships = lazyRetry(() => import("./pages/admin/AdminMemberships"));
const AdminMembershipRejections = lazyRetry(() => import("./pages/admin/AdminMembershipRejections"));
const AdminMembershipEvents = lazyRetry(() => import("./pages/admin/AdminMembershipEvents"));
const AdminMembershipPayments = lazyRetry(() => import("./pages/admin/AdminMembershipPayments"));
const AdminContactCenter = lazyRetry(() => import("./pages/admin/AdminContactCenter"));
const AdminLeadRequests = lazyRetry(() => import("./pages/admin/AdminLeadRequests"));
const AdminQuoteRequests = lazyRetry(() => import("./pages/admin/AdminQuoteRequests"));
const AdminQuoteRequestDetails = lazyRetry(() => import("./pages/admin/AdminQuoteRequestDetails"));
const AdminQuoteOperations = lazyRetry(() => import("./pages/admin/AdminQuoteOperations"));
const QuoteRequestDetails = lazyRetry(() => import("./pages/dashboard/QuoteRequestDetails"));
const AdminEmailDeliverability = lazyRetry(() => import("./pages/admin/AdminEmailDeliverability"));
const AdminEmailCenter = lazyRetry(() => import("./pages/admin/AdminEmailCenter"));
const AdminSiteAudit = lazyRetry(() => import("./pages/admin/AdminSiteAudit"));
const AdminDiagnostics = lazyRetry(() => import("./pages/admin/AdminDiagnostics"));
const AdminSectorSeo = lazyRetry(() => import("./pages/admin/AdminSectorSeo"));
const AdminMarketAnalytics = lazyRetry(() => import("./pages/admin/AdminMarketAnalytics"));
const AdminSitemapStatus = lazyRetry(() => import("./pages/admin/AdminSitemapStatus"));
const AdminAccessManagement = lazyRetry(() => import("./pages/admin/AdminAccessManagement"));
const AdminProviderReview = lazyRetry(() => import("./pages/admin/AdminProviderReview"));
const AdminProviderAnalytics = lazyRetry(() => import("./pages/admin/AdminProviderAnalytics"));
const AdminContractAnalytics = lazyRetry(() => import("./pages/admin/AdminContractAnalytics"));
const AdminContracts = lazyRetry(() => import("./pages/admin/AdminContracts"));
const AdminContractCreate = lazyRetry(() => import("./pages/admin/AdminContractCreate"));
const Notifications = lazyRetry(() => import("./pages/Notifications"));
const Membership = lazyRetry(() => import("./pages/Membership"));
const MembershipInvoice = lazyRetry(() => import("./pages/MembershipInvoice"));
const MembershipPaymentReturn = lazyRetry(() => import("./pages/MembershipPaymentReturn"));
const DashboardOperations = lazyRetry(() => import("./pages/dashboard/DashboardOperations"));
const DashboardOperationsFeed = lazyRetry(() => import("./pages/dashboard/DashboardOperationsFeed"));
const DashboardOperationsCenter = lazyRetry(() => import("./pages/dashboard/DashboardOperationsCenter"));
const DashboardAiCenter = lazyRetry(() => import("./pages/dashboard/DashboardAiCenter"));
const DashboardLeads = lazyRetry(() => import("./pages/dashboard/DashboardLeads"));
const DashboardClients = lazyRetry(() => import("./pages/dashboard/DashboardClients"));
const DashboardBadge = lazyRetry(() => import("./pages/dashboard/DashboardBadge"));
const DashboardMyRequests = lazyRetry(() => import("./pages/dashboard/DashboardMyRequests"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const Onboarding = lazyRetry(() => import("./pages/Onboarding"));
const Categories = lazyRetry(() => import("./pages/Categories"));
const SectorLanding = lazyRetry(() => import("./pages/SectorLanding"));
const SectorsIndex = lazyRetry(() => import("./pages/SectorLanding").then(m => ({ default: m.SectorsIndex })));
const SectorCity = lazyRetry(() => import("./pages/SectorCity"));
const SectorsHub = lazyRetry(() => import("./pages/SectorsHub"));
const SectorSeoLanding = lazyRetry(() => import("./pages/SectorSeoLanding"));
const SectorBrief = lazyRetry(() => import("./pages/SectorBrief"));
const Services = lazyRetry(() => import("./pages/Services"));
const ServiceDetail = lazyRetry(() => import("./pages/ServiceDetail"));
const About = lazyRetry(() => import("./pages/About"));
const Contact = lazyRetry(() => import("./pages/Contact"));
const Privacy = lazyRetry(() => import("./pages/Privacy"));
const Terms = lazyRetry(() => import("./pages/Terms"));
const Forbidden = lazyRetry(() => import("./pages/Forbidden"));
const Unsubscribe = lazyRetry(() => import("./pages/Unsubscribe"));
const VerifyContract = lazyRetry(() => import("./pages/VerifyContract"));
const VerifyBusiness = lazyRetry(() => import("./pages/VerifyBusiness"));
const InviteAccept = lazyRetry(() => import("./pages/InviteAccept"));
const StaffInviteAccept = lazyRetry(() => import("./pages/StaffInviteAccept"));
const Diagnostics = lazyRetry(() => import("./pages/Diagnostics"));
const DashboardAccountDiagnostics = lazyRetry(() => import("./pages/dashboard/DashboardAccountDiagnostics"));
const ForProviders = lazyRetry(() => import("./pages/ForProviders"));
const DashboardCommunicationPreferences = lazyRetry(() => import("./pages/dashboard/DashboardCommunicationPreferences"));
const DashboardBusinessCompletion = lazyRetry(() => import("./pages/dashboard/DashboardBusinessCompletion"));
const DashboardBusinessDraft = lazyRetry(() => import("./pages/dashboard/DashboardBusinessDraft"));
const DashboardBusinessEdit = lazyRetry(() => import("./pages/dashboard/DashboardBusinessEdit"));
const AdminProviderLanding = lazyRetry(() => import("./pages/admin/AdminProviderLanding"));
const AdminAnalyticsSettings = lazyRetry(() => import("./pages/admin/AdminAnalyticsSettings"));
const AdminBranding = lazyRetry(() => import("./pages/admin/AdminBranding"));
const AdminContractTemplates = lazyRetry(() => import("./pages/admin/AdminContractTemplates"));
const AdminPdfExportAudit = lazyRetry(() => import("./pages/admin/AdminPdfExportAudit"));
const AdminPdfVisualQa = lazyRetry(() => import("./pages/admin/AdminPdfVisualQa"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="animate-pulse">
      <BrandLogo variant="mark" tone="auto" size="loader" priority alt="قِطاعات" />
    </div>
  </div>
);

const AppRoutes = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
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
          <Route path="/quote" element={<Quote />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/profile-systems" element={<ProfileSystems />} />
          <Route path="/profile-systems/:slug" element={<ProfileSystemDetail />} />
          <Route path="/profile-systems/category/:cat" element={<ProfileSystems />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<Categories />} />
          <Route path="/sectors" element={<SectorsHub />} />
          <Route path="/sectors/all" element={<SectorsIndex />} />
          <Route path="/sectors/aluminum" element={<SectorSeoLanding />} />
          <Route path="/sectors/steel" element={<SectorSeoLanding />} />
          <Route path="/sectors/wood" element={<SectorSeoLanding />} />
          <Route path="/sectors/glass" element={<SectorSeoLanding />} />
          <Route path="/sectors/stainless-steel" element={<SectorSeoLanding />} />
          <Route path="/sectors/fabrication-installation" element={<SectorSeoLanding />} />
          <Route path="/sectors/:slug" element={<SectorLanding />} />
          <Route path="/sectors/:sector/:city" element={<SectorCity />} />
          {/* Singular /sector/:slug — brief landing per sector with provider list by city */}
          <Route path="/sector/:slug" element={<SectorBrief />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="/brands" element={<BrandsCatalog />} />
          <Route path="/brands/:slug" element={<BrandDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare-profiles" element={<CompareProfiles />} />
          <Route path="/membership" element={<Membership />} />
          <Route
            path="/membership/payments/:paymentIntentId/invoice"
            element={<ProtectedRoute><MembershipInvoice /></ProtectedRoute>}
          />
          <Route
            path="/membership/payment/return"
            element={<ProtectedRoute><MembershipPaymentReturn /></ProtectedRoute>}
          />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<HelpCenterHome />} />
          <Route path="/help/category/:slug" element={<HelpCategoryPage />} />
          <Route path="/help/article/:slug" element={<HelpArticlePage />} />
          <Route path="/help/report-issue" element={<ProtectedRoute><ReportIssuePage /></ProtectedRoute>} />
          <Route path="/help/feature-request" element={<ProtectedRoute><FeatureRequestPage /></ProtectedRoute>} />
          <Route path="/dashboard/help" element={<ProtectedRoute><DashboardHelpCenter /></ProtectedRoute>} />
          <Route path="/admin/help" element={<ProtectedRoute requireAdmin><AdminHelpCenter /></ProtectedRoute>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/v/c/:number" element={<VerifyContract />} />
          <Route path="/v/b/:username" element={<VerifyBusiness />} />
          <Route path="/invite/:token" element={<InviteAccept />} />
          <Route path="/staff-invite/:token" element={<StaffInviteAccept />} />
          <Route path="/s/:token" element={<PublicSiteScan />} />
          <Route path="/q/:code" element={<QSlugDispatcher />} />
          <Route path="/client/:refId" element={<CustomerProjectPortal />} />
          <Route path="/r/:refId" element={<ReferenceResolver />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/for-providers" element={<ForProviders />} />
          <Route path="/join-as-provider" element={<ForProviders />} />

          <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
          <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />
          <Route path="/dashboard/diagnostics" element={<ProtectedRoute><DashboardAccountDiagnostics /></ProtectedRoute>} />
          <Route path="/dashboard/contracts" element={<ProtectedRoute><DashboardContracts /></ProtectedRoute>} />
          <Route path="/dashboard/work-orders" element={<ProtectedRoute><DashboardWorkOrders /></ProtectedRoute>} />
          <Route path="/dashboard/work-orders/overview" element={<ProtectedRoute><DashboardWorkOrdersOverview /></ProtectedRoute>} />
          <Route path="/dashboard/work-orders/board" element={<ProtectedRoute><ProductionBoardPage /></ProtectedRoute>} />
          <Route path="/dashboard/work-orders/:refId" element={<ProtectedRoute><DashboardWorkOrderDetail /></ProtectedRoute>} />
          <Route path="/dashboard/procurement" element={<ProtectedRoute><DashboardProcurement /></ProtectedRoute>} />
          <Route path="/dashboard/procurement/:id" element={<ProtectedRoute><DashboardProcurementDetail /></ProtectedRoute>} />
          <Route path="/dashboard/messages" element={<ProtectedRoute><DashboardMessages /></ProtectedRoute>} />
          <Route path="/dashboard/bookmarks" element={<ProtectedRoute><DashboardBookmarks /></ProtectedRoute>} />
          <Route path="/dashboard/notifications" element={<ProtectedRoute><DashboardNotifications /></ProtectedRoute>} />
          <Route path="/dashboard/bookings" element={<ProtectedRoute><DashboardBookings /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
          <Route path="/dashboard/settings/staff" element={<ProtectedRoute><DashboardStaffCenter /></ProtectedRoute>} />
          <Route path="/dashboard/no-access" element={<ProtectedRoute><DashboardNoAccess /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardProfile /></ProtectedRoute>} />
          <Route path="/dashboard/business-completion" element={<ProtectedRoute><DashboardBusinessCompletion /></ProtectedRoute>} />
          <Route path="/dashboard/business-draft" element={<ProtectedRoute><DashboardBusinessDraft /></ProtectedRoute>} />
          <Route path="/dashboard/business-edit" element={<ProtectedRoute><DashboardBusinessEdit /></ProtectedRoute>} />
          <Route path="/dashboard/communication-preferences" element={<ProtectedRoute><DashboardCommunicationPreferences /></ProtectedRoute>} />

          <Route path="/dashboard/services" element={<ProtectedRoute requireProvider><DashboardServices /></ProtectedRoute>} />
          <Route path="/dashboard/portfolio" element={<ProtectedRoute requireProvider><DashboardPortfolio /></ProtectedRoute>} />
          <Route path="/dashboard/reviews" element={<ProtectedRoute requireProvider><DashboardReviews /></ProtectedRoute>} />
          <Route path="/dashboard/warranties" element={<ProtectedRoute requireProvider><DashboardWarranties /></ProtectedRoute>} />
          <Route path="/dashboard/installments" element={<ProtectedRoute><DashboardInstallments /></ProtectedRoute>} />
          <Route path="/dashboard/promotions" element={<ProtectedRoute requireProvider><DashboardPromotions /></ProtectedRoute>} />
          <Route path="/dashboard/private-sectors" element={<ProtectedRoute requireProvider><DashboardPrivateSectors /></ProtectedRoute>} />
          <Route path="/admin/private-sectors" element={<ProtectedRoute requireAdmin><AdminPrivateSectors /></ProtectedRoute>} />
          <Route path="/dashboard/projects" element={<ProtectedRoute requireProvider><DashboardProjects /></ProtectedRoute>} />
          <Route path="/dashboard/operations" element={<ProtectedRoute><DashboardOperations /></ProtectedRoute>} />
          <Route path="/dashboard/operations/feed" element={<ProtectedRoute><DashboardOperationsFeed /></ProtectedRoute>} />
          <Route path="/dashboard/operations-center" element={<ProtectedRoute><DashboardOperationsCenter /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute requireProvider><DashboardAnalytics /></ProtectedRoute>} />
          <Route path="/dashboard/contract-analytics" element={<ProtectedRoute requireProvider><DashboardContractAnalytics /></ProtectedRoute>} />
          <Route path="/dashboard/leads" element={<ProtectedRoute requireProvider><DashboardLeads /></ProtectedRoute>} />
          <Route path="/dashboard/clients" element={<ProtectedRoute requireProvider><DashboardClients /></ProtectedRoute>} />
          <Route path="/dashboard/badge" element={<ProtectedRoute requireProvider><DashboardBadge /></ProtectedRoute>} />
          <Route path="/dashboard/my-requests" element={<ProtectedRoute><DashboardMyRequests /></ProtectedRoute>} />
          <Route path="/dashboard/my-requests/:id" element={<ProtectedRoute><QuoteRequestDetails /></ProtectedRoute>} />
          <Route path="/dashboard/provider/leads" element={<ProtectedRoute requireProvider><ProviderLeads /></ProtectedRoute>} />
          <Route path="/dashboard/provider/leads/:id" element={<ProtectedRoute requireProvider><ProviderLeadDetails /></ProtectedRoute>} />
          <Route path="/dashboard/provider/membership" element={<ProtectedRoute requireProvider><ProviderMembership /></ProtectedRoute>} />
          <Route path="/dashboard/provider/service-areas" element={<ProtectedRoute requireProvider><ProviderServiceAreas /></ProtectedRoute>} />
          <Route path="/admin/ai-center" element={<ProtectedRoute requireAdmin><DashboardAiCenter /></ProtectedRoute>} />

          <Route path="/dashboard/blog" element={<ProtectedRoute requireAdmin><DashboardBlog /></ProtectedRoute>} />
          <Route path="/dashboard/profile-systems" element={<ProtectedRoute requireAdmin><DashboardProfileSystems /></ProtectedRoute>} />
          <Route path="/admin/api-settings" element={<ProtectedRoute requireAdmin><AdminApiSettings /></ProtectedRoute>} />
          <Route path="/admin/ab-experiments" element={<ProtectedRoute requireAdmin><AdminAbExperiments /></ProtectedRoute>} />
          <Route path="/admin/showcase" element={<ProtectedRoute requireAdmin><AdminShowcase /></ProtectedRoute>} />
          <Route path="/dashboard/showcase" element={<ProtectedRoute><DashboardShowcase /></ProtectedRoute>} />
          <Route path="/showcase" element={<Showcase />} />
          <Route path="/admin/api-docs" element={<ProtectedRoute requireAdmin><AdminApiDocs /></ProtectedRoute>} />
          <Route path="/admin/activity-log" element={<ProtectedRoute requireAdmin><AdminActivityLog /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requireAdmin><AdminCategories /></ProtectedRoute>} />
          <Route path="/admin/tags" element={<ProtectedRoute requireAdmin><AdminTags /></ProtectedRoute>} />
          <Route path="/admin/businesses" element={<ProtectedRoute requireAdmin><AdminBusinesses /></ProtectedRoute>} />
          <Route path="/admin/entity-access-requests" element={<ProtectedRoute requireAdmin><AdminEntityAccessRequests /></ProtectedRoute>} />
          <Route path="/admin/locations" element={<ProtectedRoute requireAdmin><AdminLocationsHub /></ProtectedRoute>} />
          <Route path="/admin/locations/catalog" element={<ProtectedRoute requireAdmin><AdminLocationsCatalog /></ProtectedRoute>} />
          <Route path="/admin/locations/service-areas" element={<ProtectedRoute requireAdmin><AdminBusinessServiceAreas /></ProtectedRoute>} />
          <Route path="/admin/locations/business-coordinates" element={<ProtectedRoute requireAdmin><AdminBusinessCoordinates /></ProtectedRoute>} />
          <Route path="/admin/client-sites" element={<ProtectedRoute requireAdmin><AdminClientSitesMonitoring /></ProtectedRoute>} />
          <Route path="/admin/barcode-registry" element={<ProtectedRoute requireAdmin><AdminBarcodeRegistry /></ProtectedRoute>} />
          <Route path="/admin/provider-review" element={<ProtectedRoute requireAdmin><AdminProviderReview /></ProtectedRoute>} />
          <Route path="/admin/memberships" element={<ProtectedRoute requireAdmin><AdminMemberships /></ProtectedRoute>} />
          <Route path="/admin/membership-rejections" element={<ProtectedRoute requireAdmin><AdminMembershipRejections /></ProtectedRoute>} />
          <Route path="/admin/membership-events" element={<ProtectedRoute requireAdmin><AdminMembershipEvents /></ProtectedRoute>} />
          <Route path="/admin/membership-payments" element={<ProtectedRoute requireAdmin><AdminMembershipPayments /></ProtectedRoute>} />
          {/* Phase B — Unified Contact Center. Old routes redirect to the matching tab. */}
          <Route path="/admin/contact-messages" element={<ProtectedRoute requireAdmin><AdminContactCenter /></ProtectedRoute>} />
          <Route path="/admin/contact-inbox-settings" element={<Navigate to="/admin/contact-messages?tab=settings" replace />} />
          <Route path="/admin/contact-audit-log" element={<Navigate to="/admin/contact-messages?tab=audit" replace />} />
          <Route path="/admin/contact-sla-dashboard" element={<Navigate to="/admin/contact-messages?tab=sla" replace />} />
          <Route path="/admin/contact-notification-log" element={<Navigate to="/admin/contact-messages?tab=notifications" replace />} />
          <Route path="/admin/lead-requests" element={<ProtectedRoute requireAdmin><AdminLeadRequests /></ProtectedRoute>} />
          <Route path="/admin/quote-requests" element={<ProtectedRoute requireAdmin><AdminQuoteRequests /></ProtectedRoute>} />
          <Route path="/admin/quote-requests/:id" element={<ProtectedRoute requireAdmin><AdminQuoteRequestDetails /></ProtectedRoute>} />
          <Route path="/admin/quote-operations" element={<ProtectedRoute requireAdmin><AdminQuoteOperations /></ProtectedRoute>} />
          <Route path="/admin/provider-subscriptions" element={<ProtectedRoute requireAdmin><AdminProviderSubscriptions /></ProtectedRoute>} />
          <Route path="/admin/email-deliverability" element={<ProtectedRoute requireAdmin><AdminEmailDeliverability /></ProtectedRoute>} />
          <Route path="/admin/email-center" element={<ProtectedRoute requireAdmin><AdminEmailCenter /></ProtectedRoute>} />
          <Route path="/admin/site-audit" element={<ProtectedRoute requireAdmin><AdminSiteAudit /></ProtectedRoute>} />
          <Route path="/admin/diagnostics" element={<ProtectedRoute requireAdmin><AdminDiagnostics /></ProtectedRoute>} />
          <Route path="/admin/sector-seo" element={<ProtectedRoute requireAdmin><AdminSectorSeo /></ProtectedRoute>} />
          <Route path="/admin/market-analytics" element={<ProtectedRoute requireAdmin><AdminMarketAnalytics /></ProtectedRoute>} />
          <Route path="/admin/sitemap-status" element={<ProtectedRoute requireAdmin><AdminSitemapStatus /></ProtectedRoute>} />
          <Route path="/admin/provider-analytics" element={<ProtectedRoute requireAdmin><AdminProviderAnalytics /></ProtectedRoute>} />
          <Route path="/admin/provider-landing" element={<ProtectedRoute requireAdmin><AdminProviderLanding /></ProtectedRoute>} />
          <Route path="/admin/access-management" element={<ProtectedRoute requireSuperAdmin><AdminAccessManagement /></ProtectedRoute>} />

          <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute requireSuperAdmin><AdminUserDetail /></ProtectedRoute>} />
          <Route path="/admin/identity" element={<ProtectedRoute requireSuperAdmin><AdminIdentity /></ProtectedRoute>} />
          <Route path="/admin/system-settings" element={<ProtectedRoute requireSuperAdmin><AdminSystemSettings /></ProtectedRoute>} />
          <Route path="/admin/cron-runs" element={<ProtectedRoute requireAdmin><AdminCronRuns /></ProtectedRoute>} />
          <Route path="/admin/operations" element={<ProtectedRoute requireAdmin><AdminOperations /></ProtectedRoute>} />
          <Route path="/admin/operations/console" element={<ProtectedRoute requireAdmin><AdminOperationsConsole /></ProtectedRoute>} />
         <Route path="/admin/ref/triage" element={<ProtectedRoute requireAdmin><AdminBulkReferenceTriage /></ProtectedRoute>} />
         <Route path="/admin/ref/:refId" element={<ProtectedRoute requireAdmin><AdminReferenceInspector /></ProtectedRoute>} />
          <Route path="/admin/analytics-settings" element={<ProtectedRoute requireAdmin><AdminAnalyticsSettings /></ProtectedRoute>} />
          <Route path="/admin/branding" element={<ProtectedRoute requireAdmin><AdminBranding /></ProtectedRoute>} />
          <Route path="/admin/contract-templates" element={<ProtectedRoute requireAdmin><AdminContractTemplates /></ProtectedRoute>} />
          <Route path="/admin/pdf-exports" element={<ProtectedRoute requireAdmin><AdminPdfExportAudit /></ProtectedRoute>} />
          <Route path="/admin/pdf-visual-qa" element={<ProtectedRoute requireAdmin><AdminPdfVisualQa /></ProtectedRoute>} />
          <Route path="/admin/contracts/analytics" element={<ProtectedRoute requireAdmin><AdminContractAnalytics /></ProtectedRoute>} />
          <Route path="/admin/contracts" element={<ProtectedRoute requireAdmin><AdminContracts /></ProtectedRoute>} />
          <Route path="/admin/contracts/create" element={<ProtectedRoute requireAdmin><AdminContractCreate /></ProtectedRoute>} />

          <Route path="/:username" element={<UsernameResolver />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <ConsentBanner />
      </Suspense>
      <Suspense fallback={null}>
        <BuildVersionWatcher />
      </Suspense>
      <Suspense fallback={null}>
        <HelpLauncherFloating />
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
