import { Suspense } from "react";
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
import { GlobalShortcuts } from "@/components/GlobalShortcuts";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ThemeApplier } from "@/components/ThemeApplier";
import { IdentityTokensApplier } from "@/components/IdentityTokensApplier";
import { BrandFaviconApplier } from "@/components/BrandFaviconApplier";
import { lazyRetry } from "@/lib/lazyRetry";
const Index = lazyRetry(() => import("./pages/Index"));
const DeferredAppOverlays = lazyRetry(() => import("./components/DeferredAppOverlays"));

const Auth = lazyRetry(() => import("./pages/Auth"));
const HelpCenterHome = lazyRetry(() => import("./pages/help/HelpCenterHome"));
const HelpCategoryPage = lazyRetry(() => import("./pages/help/HelpCategoryPage"));
const HelpArticlePage = lazyRetry(() => import("./pages/help/HelpArticlePage"));
const ReportIssuePage = lazyRetry(() => import("./pages/help/ReportIssuePage"));
const FeatureRequestPage = lazyRetry(() => import("./pages/help/FeatureRequestPage"));
const AdminHelpCenter = lazyRetry(() => import("./pages/admin/AdminHelpCenter"));
const DashboardHelpCenter = lazyRetry(() => import("./pages/dashboard/DashboardHelpCenter"));
// HelpLauncherFloating, ConsentBanner, and BuildVersionWatcher are now
// rendered exclusively via <DeferredAppOverlays>, which holds them off the
// critical path until window load + requestIdleCallback.
const PublicSiteScan = lazyRetry(() => import("./pages/PublicSiteScan"));
const PublicBarcodeResolve = lazyRetry(() => import("./pages/PublicBarcodeResolve"));
const ReferenceResolver = lazyRetry(() => import("./pages/ReferenceResolver"));
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));
const QuotationViewer = lazyRetry(() => import("./pages/QuotationViewer"));
const CustomerProjectPortal = lazyRetry(() => import("./pages/CustomerProjectPortal"));
const QSlugDispatcher = lazyRetry(() => import("./pages/QSlugDispatcher"));
const BusinessProfile = lazyRetry(() => import("./pages/BusinessProfile"));
const BranchDetail = lazyRetry(() => import("./pages/BranchDetail"));
const UsernameResolver = lazyRetry(() => import("./pages/UsernameResolver"));
const ClaimBusiness = lazyRetry(() => import("./pages/ClaimBusiness"));
const Search = lazyRetry(() => import("./pages/Search"));
const Quote = lazyRetry(() => import("./pages/Quote"));
const ProviderLeads = lazyRetry(() => import("./pages/dashboard/ProviderLeads"));
const ProviderLeadDetails = lazyRetry(() => import("./pages/dashboard/ProviderLeadDetails"));
const ProviderServiceAreas = lazyRetry(() => import("./pages/dashboard/ProviderServiceAreas"));
const ProviderMembership = lazyRetry(() => import("./pages/dashboard/ProviderMembership"));
const AdminProviderSubscriptions = lazyRetry(() => import("./pages/admin/AdminProviderSubscriptions"));
const AdminServiceActivations = lazyRetry(() => import("./pages/admin/AdminServiceActivations"));
const AdminAbExperiments = lazyRetry(() => import("./pages/admin/AdminAbExperiments"));
const AdminShowcase = lazyRetry(() => import("./pages/admin/AdminShowcase"));
const AdminPartnerShowcase = lazyRetry(() => import("./pages/admin/AdminPartnerShowcase"));
const AdminHomeFaq = lazyRetry(() => import("./pages/admin/AdminHomeFaq"));
const AdminHomeSectors = lazyRetry(() => import("./pages/admin/AdminHomeSectors"));
const DashboardShowcase = lazyRetry(() => import("./pages/dashboard/DashboardShowcase"));
const Showcase = lazyRetry(() => import("./pages/Showcase"));
const Contracts = lazyRetry(() => import("./pages/Contracts"));
const ContractDetail = lazyRetry(() => import("./pages/ContractDetail"));
const DashboardOverview = lazyRetry(() => import("./pages/dashboard/DashboardOverview"));
const DashboardServices = lazyRetry(() => import("./pages/dashboard/DashboardServices"));
const DashboardPortfolio = lazyRetry(() => import("./pages/dashboard/DashboardPortfolio"));
const DashboardSites = lazyRetry(() => import("./pages/dashboard/DashboardSites"));
const DashboardRentals = lazyRetry(() => import("./pages/dashboard/DashboardRentals"));
const DashboardRentalsCalendar = lazyRetry(() => import("./pages/dashboard/DashboardRentalsCalendar"));
const DashboardRentalsAnalytics = lazyRetry(() => import("./pages/dashboard/DashboardRentalsAnalytics"));
const AdminRentals = lazyRetry(() => import("./pages/admin/AdminRentals"));
const DashboardAssets = lazyRetry(() => import("./pages/dashboard/DashboardAssets"));
const AdminAssets = lazyRetry(() => import("./pages/admin/AdminAssets"));
const AdminAssetOverrides = lazyRetry(() => import("./pages/admin/AdminAssetOverrides"));
const RentalsCatalog = lazyRetry(() => import("./pages/RentalsCatalog"));
const RentalItemPublic = lazyRetry(() => import("./pages/RentalItemPublic"));
const DashboardSitePrint = lazyRetry(() => import("./pages/dashboard/DashboardSitePrint"));
const DashboardSiteDetail = lazyRetry(() => import("./pages/dashboard/DashboardSiteDetail"));
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
const DashboardTeamAccess = lazyRetry(() => import("./pages/dashboard/DashboardTeamAccess"));
const DashboardNoAccess = lazyRetry(() => import("./pages/dashboard/DashboardNoAccess"));
const DashboardProfile = lazyRetry(() => import("./pages/dashboard/DashboardProfile"));
const DashboardPromotions = lazyRetry(() => import("./pages/dashboard/DashboardPromotions"));
const DashboardPrivateSectors = lazyRetry(() => import("./pages/dashboard/DashboardPrivateSectors"));
const AdminPrivateSectors = lazyRetry(() => import("./pages/admin/AdminPrivateSectors"));
const AdminServiceRequests = lazyRetry(() => import("./pages/admin/AdminServiceRequests"));
const AdminBrands = lazyRetry(() => import("./pages/admin/AdminBrands"));
const AdminBrandDetail = lazyRetry(() => import("./pages/admin/AdminBrandDetail"));
const AdminBrandRequests = lazyRetry(() => import("./pages/admin/AdminBrandRequests"));
const DashboardBrands = lazyRetry(() => import("./pages/dashboard/DashboardBrands"));
const BrandsCatalog = lazyRetry(() => import("./pages/BrandsCatalog"));
const BrandDetail = lazyRetry(() => import("./pages/BrandDetail"));
const PrivateSectorsCatalog = lazyRetry(() => import("./pages/PrivateSectorsCatalog"));
const PrivateSectorDetail = lazyRetry(() => import("./pages/PrivateSectorDetail"));
const DashboardProjects = lazyRetry(() => import("./pages/dashboard/DashboardProjects"));
const DashboardBlog = lazyRetry(() => import("./pages/dashboard/DashboardBlog"));
const DashboardProfileSystems = lazyRetry(() => import("./pages/dashboard/DashboardProfileSystems"));
const DashboardMessages = lazyRetry(() => import("./pages/dashboard/DashboardMessages"));
const DashboardBookmarks = lazyRetry(() => import("./pages/dashboard/DashboardBookmarks"));
const DashboardBookings = lazyRetry(() => import("./pages/dashboard/DashboardBookings"));
const DashboardAnalytics = lazyRetry(() => import("./pages/dashboard/DashboardAnalytics"));
const DashboardContractAnalytics = lazyRetry(() => import("./pages/dashboard/DashboardContractAnalytics"));
const DashboardNotifications = lazyRetry(() => import("./pages/dashboard/DashboardNotifications"));
const DashboardInquiries = lazyRetry(() => import("./pages/DashboardInquiries"));
const Offers = lazyRetry(() => import("./pages/Offers"));
const Compare = lazyRetry(() => import("./pages/Compare"));
const CompareProfiles = lazyRetry(() => import("./pages/CompareProfiles"));
const Projects = lazyRetry(() => import("./pages/Projects"));
const ProjectDetail = lazyRetry(() => import("./pages/ProjectDetail"));
const Blog = lazyRetry(() => import("./pages/Blog"));
const Guides = lazyRetry(() => import("./pages/Guides"));
const HeavyEquipmentRentalSaudiArabia = lazyRetry(() => import("./pages/guides/HeavyEquipmentRentalSaudiArabia"));
const BlogPost = lazyRetry(() => import("./pages/BlogPost"));
const ProfileSystems = lazyRetry(() => import("./pages/ProfileSystems"));
const ProfileSystemDetail = lazyRetry(() => import("./pages/ProfileSystemDetail"));
const AdminApiSettings = lazyRetry(() => import("./pages/admin/AdminApiSettings"));
const AdminGoogleServices = lazyRetry(() => import("./pages/admin/AdminGoogleServices"));
const AdminIntegrations = lazyRetry(() => import("./pages/admin/AdminIntegrations"));
const AdminApiDocs = lazyRetry(() => import("./pages/admin/AdminApiDocs"));
const AdminUsers = lazyRetry(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazyRetry(() => import("./pages/admin/AdminUserDetail"));
const AdminIdentity = lazyRetry(() => import("./pages/admin/AdminIdentity"));
const AdminIdentityCenter = lazyRetry(() => import("./pages/admin/AdminIdentityCenter"));
const AdminSystemSettings = lazyRetry(() => import("./pages/admin/AdminSystemSettings"));
const AdminCronRuns = lazyRetry(() => import("./pages/admin/AdminCronRuns"));
const AdminOperations = lazyRetry(() => import("./pages/admin/AdminOperations"));
const AdminOperationsConsole = lazyRetry(() => import("./pages/admin/AdminOperationsConsole"));
const AdminReferenceInspector = lazyRetry(() => import("./pages/admin/AdminReferenceInspector"));
const AdminBulkReferenceTriage = lazyRetry(() => import("./pages/admin/AdminBulkReferenceTriage"));
const AdminActivityLog = lazyRetry(() => import("./pages/admin/AdminActivityLog"));
// Historical taxonomy CRUD pages (AdminCategories / AdminTags /
// AdminTaxonomyHub) were retired in favor of /admin/taxonomy. The
// deprecation routes still render a replacement notice for any bookmarked
// URLs. TODO(legacy-sunset): see TODO-C1-01 in `docs/pilot-launch-backlog.md`
// — remove the underlying files once /admin/taxonomy adoption is verified
// at 100%. Identifier kept as `AdminLegacyTaxonomyReplaced` because tests
// and the do-not-remove list reference it by name.
const AdminLegacyTaxonomyReplaced = lazyRetry(() => import("./pages/admin/AdminLegacyTaxonomyReplaced"));
const AdminBusinesses = lazyRetry(() => import("./pages/admin/AdminBusinesses"));
const AdminOwnershipTransferRequests = lazyRetry(() => import("./pages/admin/AdminOwnershipTransferRequests"));
const AdminEntityAccessRequests = lazyRetry(() => import("./pages/admin/AdminEntityAccessRequests"));
const AdminApprovalsCenter = lazyRetry(() => import("./pages/admin/AdminApprovalsCenter"));
const AdminBusinessVisibility = lazyRetry(() => import("./pages/admin/AdminBusinessVisibility"));
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
const AdminPerformance = lazyRetry(() => import("./pages/admin/AdminPerformance"));
const AdminDiagnostics = lazyRetry(() => import("./pages/admin/AdminDiagnostics"));
const AdminDataEnrichment = lazyRetry(() => import("./pages/admin/AdminDataEnrichment"));
const AdminDataEnrichmentGovernance = lazyRetry(() => import("./pages/admin/AdminDataEnrichmentGovernance"));
const AdminSectorSeo = lazyRetry(() => import("./pages/admin/AdminSectorSeo"));
const AdminMarketAnalytics = lazyRetry(() => import("./pages/admin/AdminMarketAnalytics"));
const AdminSitemapStatus = lazyRetry(() => import("./pages/admin/AdminSitemapStatus"));
const AdminAccessManagement = lazyRetry(() => import("./pages/admin/AdminAccessManagement"));
const AdminSystemAccess = lazyRetry(() => import("./pages/admin/AdminSystemAccess"));
const AdminProviderReview = lazyRetry(() => import("./pages/admin/AdminProviderReview"));
const AdminProviderGrowth = lazyRetry(() => import("./pages/admin/AdminProviderGrowth"));
const AdminProviderGrowthQueue = lazyRetry(() => import("./pages/admin/AdminProviderGrowthQueue"));
const AdminCatalogGovernance = lazyRetry(() => import("./pages/admin/AdminCatalogGovernance"));
const AdminCatalogGovernanceQueue = lazyRetry(() => import("./pages/admin/AdminCatalogGovernanceQueue"));
const AdminProviderAnalytics = lazyRetry(() => import("./pages/admin/AdminProviderAnalytics"));
const AdminContractAnalytics = lazyRetry(() => import("./pages/admin/AdminContractAnalytics"));
const AdminContracts = lazyRetry(() => import("./pages/admin/AdminContracts"));
const AdminContractCreate = lazyRetry(() => import("./pages/admin/AdminContractCreate"));
const AdminReports = lazyRetry(() => import("./pages/admin/AdminReports"));
const AdminKpis = lazyRetry(() => import("./pages/admin/AdminKpis"));
const AdminAuditLog = lazyRetry(() => import("./pages/admin/AdminAuditLog"));
const DashboardRfq = lazyRetry(() => import("./pages/dashboard/DashboardRfq"));
const DashboardRfqDetail = lazyRetry(() => import("./pages/dashboard/DashboardRfqDetail"));
const DashboardRfqInbox = lazyRetry(() => import("./pages/dashboard/DashboardRfqInbox"));
const DashboardLoyalty = lazyRetry(() => import("./pages/dashboard/DashboardLoyalty"));
const DashboardLoyaltyStore = lazyRetry(() => import("./pages/dashboard/DashboardLoyaltyStore"));
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
const ProviderJoin = lazyRetry(() => import("./pages/ProviderJoin"));
const ProviderJoinEdit = lazyRetry(() => import("./pages/ProviderJoinEdit"));
const AdminProviderLeads = lazyRetry(() => import("./pages/admin/AdminProviderLeads"));
const DashboardCommunicationPreferences = lazyRetry(() => import("./pages/dashboard/DashboardCommunicationPreferences"));
const DashboardBusinessCompletion = lazyRetry(() => import("./pages/dashboard/DashboardBusinessCompletion"));
const DashboardBusinessDraft = lazyRetry(() => import("./pages/dashboard/DashboardBusinessDraft"));
const DashboardBusinessEdit = lazyRetry(() => import("./pages/dashboard/DashboardBusinessEdit"));
const DashboardEntities = lazyRetry(() => import("./pages/dashboard/DashboardEntities"));
const DashboardEntityDetail = lazyRetry(() => import("./pages/dashboard/DashboardEntityDetail"));
const AdminProviderLanding = lazyRetry(() => import("./pages/admin/AdminProviderLanding"));
const AdminAnalyticsSettings = lazyRetry(() => import("./pages/admin/AdminAnalyticsSettings"));
const AdminBranding = lazyRetry(() => import("./pages/admin/AdminBranding"));
const AdminContractTemplates = lazyRetry(() => import("./pages/admin/AdminContractTemplates"));
const AdminPdfExportAudit = lazyRetry(() => import("./pages/admin/AdminPdfExportAudit"));
const AdminPdfVisualQa = lazyRetry(() => import("./pages/admin/AdminPdfVisualQa"));
// NAVIGATION-CONSOLIDATION-1 — unified tabbed hubs (Phase 2).
const DashboardBusinessProfileHub = lazyRetry(() => import("./pages/dashboard/DashboardBusinessProfileHub"));
const DashboardBranches = lazyRetry(() => import("./pages/dashboard/DashboardBranches"));
const DashboardRequestsHub = lazyRetry(() => import("./pages/dashboard/DashboardRequestsHub"));
const DashboardRfqHub = lazyRetry(() => import("./pages/dashboard/DashboardRfqHub"));
const DashboardContractsHub = lazyRetry(() => import("./pages/dashboard/DashboardContractsHub"));
const DashboardLoyaltyHub = lazyRetry(() => import("./pages/dashboard/DashboardLoyaltyHub"));
const DashboardStaffHub = lazyRetry(() => import("./pages/dashboard/DashboardStaffHub"));
const AdminOperationsHub = lazyRetry(() => import("./pages/admin/AdminOperationsHub"));
const AdminOperationsCenterUnified = lazyRetry(() => import("./pages/admin/AdminOperationsCenterUnified"));
const AdminConversionOptimization = lazyRetry(() => import("./pages/admin/AdminConversionOptimization"));
const AdminReportsHub = lazyRetry(() => import("./pages/admin/AdminReportsHub"));
const AdminEmailHub = lazyRetry(() => import("./pages/admin/AdminEmailHub"));
const AdminSeoHub = lazyRetry(() => import("./pages/admin/AdminSeoHub"));
// NAVIGATION-CONSOLIDATION-1 — Phase 3 hubs.
const AdminProviderReviewHub = lazyRetry(() => import("./pages/admin/AdminProviderReviewHub"));
const AdminContractsHub = lazyRetry(() => import("./pages/admin/AdminContractsHub"));
const AdminMembershipsHub = lazyRetry(() => import("./pages/admin/AdminMembershipsHub"));
// AdminTaxonomyHub retired — the deprecation routes /admin/categories and
// /admin/tags now render AdminLegacyTaxonomyReplaced as a
// backward-compatibility notice. TODO(legacy-sunset): see TODO-C1-02 in
// `docs/pilot-launch-backlog.md` — delete the file once verified.
const AdminSystemSettingsHub = lazyRetry(() => import("./pages/admin/AdminSystemSettingsHub"));
// Taxonomy & Reference Data Center — Phase 2.
const AdminTaxonomyCenter = lazyRetry(() => import("./pages/admin/AdminTaxonomyCenter"));

const PageLoader = () => (
  <div className="flex min-h-dvh items-center justify-center bg-background">
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
      <GlobalShortcuts />
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
          <Route path="/guides/heavy-equipment-rental-saudi-arabia" element={<HeavyEquipmentRentalSaudiArabia />} />
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
          <Route path="/private-sectors" element={<PrivateSectorsCatalog />} />
          <Route path="/private-sectors/:slug" element={<PrivateSectorDetail />} />
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
          <Route path="/branch/:slug" element={<BranchDetail />} />
          <Route path="/invite/:token" element={<InviteAccept />} />
          <Route path="/staff-invite/:token" element={<StaffInviteAccept />} />
          <Route path="/s/:token" element={<PublicSiteScan />} />
          <Route path="/q/:code" element={<QSlugDispatcher />} />
          <Route path="/client/:refId" element={<CustomerProjectPortal />} />
          <Route path="/r/:refId" element={<ReferenceResolver />} />
          {/* RENTAL-MICROSERVICE-1 — public rentals catalog */}
          <Route path="/rentals" element={<RentalsCatalog />} />
          <Route path="/rentals/category/:slug" element={<RentalsCatalog />} />
          <Route path="/rentals/:slug" element={<RentalItemPublic />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/for-providers" element={<ForProviders />} />
          <Route path="/join-as-provider" element={<Navigate to="/for-providers" replace />} />
          <Route path="/join/qitaat" element={<ProviderJoin />} />
          <Route path="/join/qitaat/edit" element={<ProviderJoinEdit />} />
          <Route path="/providers/join" element={<Navigate to="/join/qitaat" replace />} />

          <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
          <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />
          <Route path="/dashboard/diagnostics" element={<ProtectedRoute><DashboardAccountDiagnostics /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 4 — Contracts hub. */}
          <Route path="/dashboard/contracts" element={<ProtectedRoute><DashboardContractsHub /></ProtectedRoute>} />
          {/* RENTAL-MICROSERVICE-1 — provider + admin rental hubs */}
          <Route path="/dashboard/rentals" element={<ProtectedRoute><DashboardRentals /></ProtectedRoute>} />
          <Route path="/dashboard/rentals/calendar" element={<ProtectedRoute><DashboardRentalsCalendar /></ProtectedRoute>} />
          <Route path="/dashboard/rentals/analytics" element={<ProtectedRoute><DashboardRentalsAnalytics /></ProtectedRoute>} />
          <Route path="/admin/rentals" element={<ProtectedRoute requireAdmin><AdminRentals /></ProtectedRoute>} />
          {/* ASSET-MANAGEMENT-MICROSERVICE-1 — provider + admin asset hubs (never public) */}
          <Route path="/dashboard/assets" element={<ProtectedRoute><DashboardAssets /></ProtectedRoute>} />
          <Route path="/admin/assets" element={<ProtectedRoute requireAdmin><AdminAssets /></ProtectedRoute>} />
          <Route path="/admin/assets/overrides" element={<ProtectedRoute requireAdmin><AdminAssetOverrides /></ProtectedRoute>} />
          <Route path="/dashboard/contract-analytics" element={<Navigate to="/dashboard/contracts?tab=analytics" replace />} />
          <Route path="/dashboard/work-orders" element={<ProtectedRoute><DashboardWorkOrders /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 (group 5): legacy overview merged into main work-orders */}
          <Route path="/dashboard/work-orders/overview" element={<Navigate to="/dashboard/work-orders" replace />} />
          <Route path="/dashboard/work-orders/board" element={<ProtectedRoute><ProductionBoardPage /></ProtectedRoute>} />
          <Route path="/dashboard/work-orders/:refId" element={<ProtectedRoute><DashboardWorkOrderDetail /></ProtectedRoute>} />
          <Route path="/dashboard/procurement" element={<ProtectedRoute><DashboardProcurement /></ProtectedRoute>} />
          <Route path="/dashboard/procurement/:id" element={<ProtectedRoute><DashboardProcurementDetail /></ProtectedRoute>} />
          <Route path="/dashboard/messages" element={<ProtectedRoute><DashboardMessages /></ProtectedRoute>} />
          <Route path="/dashboard/bookmarks" element={<ProtectedRoute><DashboardBookmarks /></ProtectedRoute>} />
          <Route path="/dashboard/notifications" element={<ProtectedRoute><DashboardNotifications /></ProtectedRoute>} />
          <Route path="/dashboard/inquiries" element={<ProtectedRoute><DashboardInquiries /></ProtectedRoute>} />
          <Route path="/dashboard/bookings" element={<ProtectedRoute><DashboardBookings /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 8 — Staff hub. */}
          <Route path="/dashboard/settings/staff" element={<ProtectedRoute><DashboardStaffHub /></ProtectedRoute>} />
          <Route path="/dashboard/settings/staff-access" element={<Navigate to="/dashboard/settings/staff?tab=permissions" replace />} />
          <Route path="/dashboard/no-access" element={<ProtectedRoute><DashboardNoAccess /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardProfile /></ProtectedRoute>} />
          <Route path="/dashboard/business-completion" element={<ProtectedRoute><DashboardBusinessCompletion /></ProtectedRoute>} />
          <Route path="/dashboard/business-draft" element={<ProtectedRoute><DashboardBusinessDraft /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 1 — Business Profile hub. */}
          <Route path="/dashboard/business-edit" element={<ProtectedRoute><DashboardBusinessProfileHub /></ProtectedRoute>} />
          <Route path="/dashboard/branches" element={<ProtectedRoute><DashboardBranches /></ProtectedRoute>} />
          <Route path="/dashboard/entities" element={<Navigate to="/dashboard/business-edit?tab=entities" replace />} />
          <Route path="/dashboard/entities/:id" element={<ProtectedRoute><DashboardEntityDetail /></ProtectedRoute>} />
          <Route path="/dashboard/credentials" element={<Navigate to="/dashboard/business-edit?tab=credentials" replace />} />
          <Route path="/dashboard/communication-preferences" element={<ProtectedRoute><DashboardCommunicationPreferences /></ProtectedRoute>} />

          <Route path="/dashboard/services" element={<ProtectedRoute requireProvider><DashboardServices /></ProtectedRoute>} />
          <Route path="/dashboard/portfolio" element={<ProtectedRoute requireProvider><DashboardPortfolio /></ProtectedRoute>} />
          <Route path="/dashboard/sites" element={<ProtectedRoute><DashboardSites /></ProtectedRoute>} />
          <Route path="/dashboard/sites/:id/print" element={<ProtectedRoute><DashboardSitePrint /></ProtectedRoute>} />
          <Route path="/dashboard/sites/:id" element={<ProtectedRoute><DashboardSiteDetail /></ProtectedRoute>} />
          <Route path="/dashboard/reviews" element={<ProtectedRoute requireProvider><DashboardReviews /></ProtectedRoute>} />
          <Route path="/dashboard/warranties" element={<ProtectedRoute requireProvider><DashboardWarranties /></ProtectedRoute>} />
          <Route path="/dashboard/installments" element={<ProtectedRoute><DashboardInstallments /></ProtectedRoute>} />
          <Route path="/dashboard/promotions" element={<ProtectedRoute requireProvider><DashboardPromotions /></ProtectedRoute>} />
          <Route path="/dashboard/private-sectors" element={<ProtectedRoute requireProvider><DashboardPrivateSectors /></ProtectedRoute>} />
          <Route path="/admin/private-sectors" element={<ProtectedRoute requireAdmin><AdminPrivateSectors /></ProtectedRoute>} />
          <Route path="/admin/service-requests" element={<ProtectedRoute requireAdmin><AdminServiceRequests /></ProtectedRoute>} />
          <Route path="/admin/brands" element={<ProtectedRoute requireAdmin><AdminBrands /></ProtectedRoute>} />
          <Route path="/admin/brands/:id" element={<ProtectedRoute requireAdmin><AdminBrandDetail /></ProtectedRoute>} />
          <Route path="/admin/brand-requests" element={<ProtectedRoute requireAdmin><AdminBrandRequests /></ProtectedRoute>} />
          <Route path="/dashboard/brands" element={<ProtectedRoute><DashboardBrands /></ProtectedRoute>} />
          <Route path="/dashboard/projects" element={<ProtectedRoute requireProvider><DashboardProjects /></ProtectedRoute>} />
          <Route path="/dashboard/operations" element={<ProtectedRoute><DashboardOperations /></ProtectedRoute>} />
          <Route path="/dashboard/operations/feed" element={<ProtectedRoute><DashboardOperationsFeed /></ProtectedRoute>} />
          <Route path="/dashboard/operations-center" element={<ProtectedRoute><DashboardOperationsCenter /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute requireProvider><DashboardAnalytics /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 2 — Requests hub.
              Note: original /dashboard/leads required provider; the hub
              keeps that guard. Legacy /dashboard/provider/leads (also
              provider-only) redirects in to tab=quote-opportunities. */}
          <Route path="/dashboard/leads" element={<ProtectedRoute requireProvider><DashboardRequestsHub /></ProtectedRoute>} />
          <Route path="/dashboard/clients" element={<ProtectedRoute requireProvider><DashboardClients /></ProtectedRoute>} />
          <Route path="/dashboard/badge" element={<ProtectedRoute requireProvider><DashboardBadge /></ProtectedRoute>} />
          <Route path="/dashboard/my-requests" element={<ProtectedRoute><DashboardMyRequests /></ProtectedRoute>} />
          <Route path="/dashboard/my-requests/:id" element={<ProtectedRoute><QuoteRequestDetails /></ProtectedRoute>} />
          <Route path="/dashboard/provider/leads" element={<Navigate to="/dashboard/leads?tab=quote-opportunities" replace />} />
          <Route path="/dashboard/provider/leads/:id" element={<ProtectedRoute requireProvider><ProviderLeadDetails /></ProtectedRoute>} />
          <Route path="/dashboard/provider/membership" element={<ProtectedRoute requireProvider><ProviderMembership /></ProtectedRoute>} />
          <Route path="/dashboard/provider/service-areas" element={<ProtectedRoute requireProvider><ProviderServiceAreas /></ProtectedRoute>} />
          <Route path="/admin/ai-center" element={<ProtectedRoute requireAdmin><DashboardAiCenter /></ProtectedRoute>} />

          <Route path="/dashboard/blog" element={<ProtectedRoute requireAdmin><DashboardBlog /></ProtectedRoute>} />
          <Route path="/dashboard/profile-systems" element={<ProtectedRoute requireAdmin><DashboardProfileSystems /></ProtectedRoute>} />
          <Route path="/admin/api-settings" element={<ProtectedRoute requireAdmin><Navigate to="/admin/system-settings?tab=api" replace /></ProtectedRoute>} />
          <Route path="/admin/integrations/google" element={<ProtectedRoute requireAdmin><AdminGoogleServices /></ProtectedRoute>} />
          <Route path="/admin/integrations" element={<ProtectedRoute requireAdmin><AdminIntegrations /></ProtectedRoute>} />
          <Route path="/admin/ab-experiments" element={<ProtectedRoute requireAdmin><AdminAbExperiments /></ProtectedRoute>} />
          <Route path="/admin/showcase" element={<ProtectedRoute requireAdmin><AdminShowcase /></ProtectedRoute>} />
          <Route path="/admin/partner-showcase" element={<ProtectedRoute requireAdmin><AdminPartnerShowcase /></ProtectedRoute>} />
          <Route path="/admin/home-faq" element={<ProtectedRoute requireAdmin><AdminHomeFaq /></ProtectedRoute>} />
          <Route path="/admin/home-sectors" element={<ProtectedRoute requireAdmin><AdminHomeSectors /></ProtectedRoute>} />
          <Route path="/dashboard/showcase" element={<ProtectedRoute><DashboardShowcase /></ProtectedRoute>} />
          <Route path="/showcase" element={<Showcase />} />
          <Route path="/admin/api-docs" element={<ProtectedRoute requireAdmin><AdminApiDocs /></ProtectedRoute>} />
          <Route path="/admin/activity-log" element={<ProtectedRoute requireAdmin><AdminActivityLog /></ProtectedRoute>} />
          {/* Legacy taxonomy routes — show replacement notice pointing to /admin/taxonomy. */}
          <Route path="/admin/categories" element={<ProtectedRoute requireAdmin><AdminLegacyTaxonomyReplaced /></ProtectedRoute>} />
          <Route path="/admin/tags" element={<ProtectedRoute requireAdmin><AdminLegacyTaxonomyReplaced /></ProtectedRoute>} />
          <Route path="/admin/taxonomy" element={<ProtectedRoute requireAdmin><AdminTaxonomyCenter /></ProtectedRoute>} />
          <Route path="/admin/businesses" element={<ProtectedRoute requireAdmin><AdminBusinesses /></ProtectedRoute>} />
          <Route path="/admin/ownership-transfer-requests" element={<ProtectedRoute requireAdmin><AdminOwnershipTransferRequests /></ProtectedRoute>} />
          <Route path="/claim/:businessId" element={<ClaimBusiness />} />
          {/* SERVICE-ACTIVATION-GOVERNANCE-2 — Phase D admin control surface. */}
          <Route path="/admin/service-activations" element={<ProtectedRoute requireAdmin><AdminServiceActivations /></ProtectedRoute>} />
          <Route path="/admin/entity-access-requests" element={<ProtectedRoute requireAdmin><AdminEntityAccessRequests /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute requireAdmin><AdminApprovalsCenter /></ProtectedRoute>} />
          <Route path="/admin/business-visibility" element={<ProtectedRoute requireAdmin><AdminBusinessVisibility /></ProtectedRoute>} />
          <Route path="/admin/locations" element={<ProtectedRoute requireAdmin><AdminLocationsHub /></ProtectedRoute>} />
          <Route path="/admin/locations/catalog" element={<ProtectedRoute requireAdmin><AdminLocationsCatalog /></ProtectedRoute>} />
          <Route path="/admin/locations/service-areas" element={<ProtectedRoute requireAdmin><AdminBusinessServiceAreas /></ProtectedRoute>} />
          <Route path="/admin/locations/business-coordinates" element={<ProtectedRoute requireAdmin><AdminBusinessCoordinates /></ProtectedRoute>} />
          <Route path="/admin/client-sites" element={<ProtectedRoute requireAdmin><AdminClientSitesMonitoring /></ProtectedRoute>} />
          <Route path="/admin/barcode-registry" element={<ProtectedRoute requireAdmin><AdminBarcodeRegistry /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 10 — Provider Review hub. */}
          <Route path="/admin/provider-review" element={<ProtectedRoute requireAdmin><AdminProviderReviewHub /></ProtectedRoute>} />
          {/* PROVIDER-GROWTH-ENGINE-2 — admin growth dashboard + ops queue */}
          <Route path="/admin/provider-growth" element={<ProtectedRoute requireAdmin><AdminProviderGrowth /></ProtectedRoute>} />
          <Route path="/admin/provider-growth/queue" element={<ProtectedRoute requireAdmin><AdminProviderGrowthQueue /></ProtectedRoute>} />
          <Route path="/admin/catalog-governance" element={<ProtectedRoute requireAdmin><AdminCatalogGovernance /></ProtectedRoute>} />
          <Route path="/admin/catalog-governance/queue" element={<ProtectedRoute requireAdmin><AdminCatalogGovernanceQueue /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 13 — Memberships hub. */}
          <Route path="/admin/memberships" element={<ProtectedRoute requireAdmin><AdminMembershipsHub /></ProtectedRoute>} />
          <Route path="/admin/membership-rejections" element={<ProtectedRoute requireAdmin><Navigate to="/admin/memberships?tab=rejections" replace /></ProtectedRoute>} />
          <Route path="/admin/membership-events" element={<ProtectedRoute requireAdmin><Navigate to="/admin/memberships?tab=events" replace /></ProtectedRoute>} />
          <Route path="/admin/membership-payments" element={<ProtectedRoute requireAdmin><Navigate to="/admin/memberships?tab=payments" replace /></ProtectedRoute>} />
          {/* Phase B — Unified Contact Center. Old routes redirect to the matching tab. */}
          <Route path="/admin/contact-messages" element={<ProtectedRoute requireAdmin><AdminContactCenter /></ProtectedRoute>} />
          <Route path="/admin/contact-inbox-settings" element={<Navigate to="/admin/contact-messages?tab=settings" replace />} />
          <Route path="/admin/contact-audit-log" element={<Navigate to="/admin/contact-messages?tab=audit" replace />} />
          <Route path="/admin/contact-sla-dashboard" element={<Navigate to="/admin/contact-messages?tab=sla" replace />} />
          <Route path="/admin/contact-notification-log" element={<Navigate to="/admin/contact-messages?tab=notifications" replace />} />
          <Route path="/admin/lead-requests" element={<ProtectedRoute requireAdmin><AdminLeadRequests /></ProtectedRoute>} />
          <Route path="/admin/provider-leads" element={<ProtectedRoute requireAdmin><AdminProviderLeads /></ProtectedRoute>} />
          <Route path="/admin/quote-requests" element={<ProtectedRoute requireAdmin><AdminQuoteRequests /></ProtectedRoute>} />
          <Route path="/admin/quote-requests/:id" element={<ProtectedRoute requireAdmin><AdminQuoteRequestDetails /></ProtectedRoute>} />
          <Route path="/admin/quote-operations" element={<ProtectedRoute requireAdmin><AdminQuoteOperations /></ProtectedRoute>} />
          <Route path="/admin/provider-subscriptions" element={<ProtectedRoute requireAdmin><Navigate to="/admin/memberships?tab=providers" replace /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 14 — Email hub. */}
          <Route path="/admin/email-center" element={<ProtectedRoute requireAdmin><AdminEmailHub /></ProtectedRoute>} />
          <Route path="/admin/email-deliverability" element={<ProtectedRoute requireAdmin><Navigate to="/admin/email-center?tab=deliverability" replace /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 16 — SEO hub. */}
          <Route path="/admin/site-audit" element={<ProtectedRoute requireAdmin><Navigate to="/admin/sitemap-status?tab=audit" replace /></ProtectedRoute>} />
          <Route path="/admin/performance" element={<ProtectedRoute requireAdmin><AdminPerformance /></ProtectedRoute>} />
          <Route path="/admin/diagnostics" element={<ProtectedRoute requireAdmin><AdminDiagnostics /></ProtectedRoute>} />
          <Route path="/admin/data-enrichment" element={<ProtectedRoute requireAdmin><AdminDataEnrichment /></ProtectedRoute>} />
          <Route path="/admin/data-enrichment-governance" element={<ProtectedRoute requireAdmin><AdminDataEnrichmentGovernance /></ProtectedRoute>} />
          <Route path="/admin/sector-seo" element={<ProtectedRoute requireAdmin><Navigate to="/admin/sitemap-status?tab=sector-seo" replace /></ProtectedRoute>} />
          <Route path="/admin/market-analytics" element={<ProtectedRoute requireAdmin><AdminMarketAnalytics /></ProtectedRoute>} />
          <Route path="/admin/sitemap-status" element={<ProtectedRoute requireAdmin><AdminSeoHub /></ProtectedRoute>} />
          <Route path="/admin/provider-analytics" element={<ProtectedRoute requireAdmin><Navigate to="/admin/provider-review?tab=analytics" replace /></ProtectedRoute>} />
          <Route path="/admin/provider-landing" element={<ProtectedRoute requireAdmin><Navigate to="/admin/provider-review?tab=landing" replace /></ProtectedRoute>} />
          <Route path="/admin/access-management" element={<ProtectedRoute requireSuperAdmin><AdminAccessManagement /></ProtectedRoute>} />
          <Route path="/admin/system-access" element={<ProtectedRoute requireAdmin><AdminSystemAccess /></ProtectedRoute>} />

          <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute requireSuperAdmin><AdminUserDetail /></ProtectedRoute>} />
          <Route path="/admin/identity" element={<ProtectedRoute requireSuperAdmin><AdminIdentity /></ProtectedRoute>} />
          {/* ADMIN-REDESIGN PHASE 2 — Identity Center (unified visual tokens). */}
          <Route path="/admin/system/identity" element={<ProtectedRoute requireSuperAdmin><AdminIdentityCenter /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 17 — System Settings hub.
              Gated by requireAdmin; the System tab's content enforces super-admin internally. */}
          <Route path="/admin/system-settings" element={<ProtectedRoute requireAdmin><AdminSystemSettingsHub /></ProtectedRoute>} />
          <Route path="/admin/cron-runs" element={<ProtectedRoute requireAdmin><AdminCronRuns /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 9 — Operations hub. */}
          <Route path="/admin/operations" element={<ProtectedRoute requireAdmin><AdminOperationsHub /></ProtectedRoute>} />
          <Route path="/admin/operations/console" element={<ProtectedRoute requireAdmin><Navigate to="/admin/operations?tab=console" replace /></ProtectedRoute>} />
          {/* OPERATIONS-CENTER-UNIFICATION-1 — unified read-only routing hub. */}
          <Route path="/admin/operations-center" element={<ProtectedRoute requireAdmin><AdminOperationsCenterUnified /></ProtectedRoute>} />
          {/* MARKETPLACE-CONVERSION-OPTIMIZATION-1 — read-only conversion dashboard. */}
          <Route path="/admin/conversion-optimization" element={<ProtectedRoute requireAdmin><AdminConversionOptimization /></ProtectedRoute>} />
         <Route path="/admin/ref/triage" element={<ProtectedRoute requireAdmin><AdminBulkReferenceTriage /></ProtectedRoute>} />
         <Route path="/admin/ref/:refId" element={<ProtectedRoute requireAdmin><AdminReferenceInspector /></ProtectedRoute>} />
          <Route path="/admin/analytics-settings" element={<ProtectedRoute requireAdmin><Navigate to="/admin/system-settings?tab=analytics" replace /></ProtectedRoute>} />
          <Route path="/admin/branding" element={<ProtectedRoute requireAdmin><Navigate to="/admin/system-settings?tab=branding" replace /></ProtectedRoute>} />
          <Route path="/admin/contract-templates" element={<ProtectedRoute requireAdmin><Navigate to="/admin/contracts?tab=templates" replace /></ProtectedRoute>} />
          <Route path="/admin/pdf-exports" element={<ProtectedRoute requireAdmin><Navigate to="/admin/contracts?tab=exports" replace /></ProtectedRoute>} />
          <Route path="/admin/pdf-visual-qa" element={<ProtectedRoute requireAdmin><AdminPdfVisualQa /></ProtectedRoute>} />
          <Route path="/admin/contracts/analytics" element={<ProtectedRoute requireAdmin><Navigate to="/admin/contracts?tab=analytics" replace /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 11 — Contracts hub. */}
          <Route path="/admin/contracts" element={<ProtectedRoute requireAdmin><AdminContractsHub /></ProtectedRoute>} />
          <Route path="/admin/contracts/create" element={<ProtectedRoute requireAdmin><Navigate to="/admin/contracts?tab=create" replace /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 12 — Reports hub. */}
          <Route path="/admin/reports" element={<ProtectedRoute requireAdmin><AdminReportsHub /></ProtectedRoute>} />
          <Route path="/admin/kpis" element={<ProtectedRoute requireAdmin><Navigate to="/admin/reports?tab=kpis" replace /></ProtectedRoute>} />
          <Route path="/admin/audit-log" element={<ProtectedRoute requireAdmin><AdminAuditLog /></ProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/operations" replace />} />
          {/* NAVIGATION-CONSOLIDATION-1 group 3 — RFQ hub. */}
          <Route path="/dashboard/rfq" element={<ProtectedRoute><DashboardRfqHub /></ProtectedRoute>} />
          <Route path="/dashboard/rfq/inbox" element={<Navigate to="/dashboard/rfq?tab=inbox" replace />} />
          <Route path="/dashboard/rfq/:id" element={<ProtectedRoute><DashboardRfqDetail /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 7 — Loyalty hub. */}
          <Route path="/dashboard/loyalty" element={<ProtectedRoute><DashboardLoyaltyHub /></ProtectedRoute>} />
          <Route path="/dashboard/loyalty/store" element={<Navigate to="/dashboard/loyalty?tab=store" replace />} />

          <Route path="/:username" element={<UsernameResolver />} />
          {/* Nested branch URL: /{business-username}/{branch-slug} */}
          {/* Renders the same BusinessProfile screen but scoped to the
              selected branch (contact, location, services, offers swap
              to branch values; design stays identical). */}
          <Route path="/:username/:branchSlug" element={<BusinessProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <DeferredAppOverlays />
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
              <IdentityTokensApplier />
              <BrandFaviconApplier />
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
