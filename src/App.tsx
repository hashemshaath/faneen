import { Suspense } from "react";
import "@/lib/accent-colors";
import { QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { queryClient } from "@/lib/queryClient";
import {
  createQueryPersister,
  shouldPersistQuery,
  PERSIST_MAX_AGE_MS,
  PERSIST_BUSTER,
} from "@/lib/queryPersist";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/components/ThemeToggle";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import { AppDirectionShell } from "@/components/ui/app-direction-shell";
import { RouteScrollToTop } from "@/components/RouteScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalLinkTracker } from "@/components/GlobalLinkTracker";
import { GlobalShortcuts } from "@/components/GlobalShortcuts";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ThemeApplier } from "@/components/ThemeApplier";
import { IdentityTokensApplier } from "@/components/IdentityTokensApplier";
import { BrandFaviconApplier } from "@/components/BrandFaviconApplier";
import {
  Index,
  DeferredAppOverlays,
  Auth,
  AuthVerified,
  HelpCenterHome,
  KnowledgeCenter,
  HelpCategoryPage,
  HelpArticlePage,
  ReportIssuePage,
  FeatureRequestPage,
  EmailNotArrivingHelp,
  PublicSiteScan,
  PublicBarcodeResolve,
  ReferenceResolver,
  ResetPassword,
  QuotationViewer,
  CustomerProjectPortal,
  QSlugDispatcher,
  BusinessProfile,
  BranchDetail,
  UsernameResolver,
  ClaimBusiness,
  Search,
  Quote,
  Showcase,
  Contracts,
  ContractDetail,
  RequestContractPage,
  RentalsCatalog,
  RentalItemPublic,
  BrandsCatalog,
  BrandDetail,
  PrivateSectorsCatalog,
  PrivateSectorDetail,
  Offers,
  Compare,
  CompareProfiles,
  Projects,
  ProjectDetail,
  Blog,
  Guides,
  ContractTemplates,
  ContractTemplateDetail,
  HeavyEquipmentRentalSaudiArabia,
  BlogPost,
  ProfileSystems,
  ProfileSystemDetail,
  Notifications,
  Membership,
  MembershipInvoice,
  MembershipPaymentReturn,
  NotFound,
  Onboarding,
  Start,
  RegisterEntity,
  Categories,
  SectorLanding,
  SectorsIndex,
  SectorCity,
  SectorsHub,
  SectorSeoLanding,
  SectorBrief,
  Services,
  ServiceDetail,
  About,
  Contact,
  Privacy,
  Terms,
  Forbidden,
  Unsubscribe,
  VerifyContract,
  VerifyBusiness,
  InviteAccept,
  StaffInviteAccept,
  Diagnostics,
  ForProviders,
  DashboardHelpCenter,
  ProviderLeads,
  ProviderLeadDetails,
  ProviderServiceAreas,
  ProviderMembership,
  DashboardMembership,
  DashboardShowcase,
  DashboardOverview,
  DashboardServices,
  DashboardPortfolio,
  DashboardSites,
  DashboardRentals,
  DashboardRentalsCalendar,
  DashboardRentalsAnalytics,
  DashboardAssets,
  DashboardSitePrint,
  DashboardSiteDetail,
  DashboardReviews,
  DashboardContractReview,
  DashboardWorkOrders,
  ProductionBoardPage,
  DashboardWorkOrderDetail,
  DashboardProcurement,
  DashboardProcurementDetail,
  DashboardWarranties,
  DashboardInstallments,
  DashboardSettings,
  DashboardNoAccess,
  DashboardProfile,
  DashboardPromotions,
  DashboardPrivateSectors,
  DashboardBrands,
  DashboardProjects,
  DashboardWorkspaces,
  DashboardWorkspaceDetail,
  DashboardBlog,
  DashboardProfileSystems,
  DashboardMessages,
  DashboardBookmarks,
  DashboardBookings,
  DashboardAnalytics,
  DashboardNotifications,
  DashboardInquiries,
  QuoteRequestDetails,
  DashboardRfqDetail,
  DashboardOperations,
  DashboardOperationsFeed,
  DashboardOperationsCenter,
  DashboardAiCenter,
  DashboardClients,
  DashboardBadge,
  DashboardMyRequests,
  DashboardNewRfq,
  DashboardAccountDiagnostics,
  ProviderJoin,
  ProviderJoinEdit,
  DashboardCommunicationPreferences,
  DashboardBusinessCompletion,
  DashboardBusinessDraft,
  DashboardBusinessEdit,
  DashboardEntities,
  DashboardEntityDetail,
  DashboardBusinessProfileHub,
  DashboardBranches,
  DashboardRequestsHub,
  DashboardContractsHub,
  DashboardLoyaltyHub,
  DashboardStaffHub,
  AdminHome,
  AdminHelpCenter,
  AdminServiceActivations,
  AdminAbExperiments,
  AdminShowcase,
  AdminPartnerShowcase,
  AdminHomeFaq,
  AdminHomeSectors,
  AdminRentals,
  AdminAssets,
  AdminAssetOverrides,
  AdminPrivateSectors,
  AdminServiceRequests,
  AdminBrands,
  AdminBrandDetail,
  AdminBrandRequests,
  AdminGoogleServices,
  AdminIntegrations,
  AdminApiDocs,
  AdminUsers,
  AdminUserDetail,
  AdminIdentity,
  AdminIdentityHub,
  AdminIdentityCenter,
  AdminCronRuns,
  AdminReferenceInspector,
  AdminBulkReferenceTriage,
  AdminActivityLog,
  AdminLegacyTaxonomyReplaced,
  AdminBusinesses,
  AdminOwnershipTransferRequests,
  AdminEntityAccessRequests,
  AdminApprovalsCenter,
  AdminBusinessVisibility,
  AdminLocationsHub,
  AdminLocationsCatalog,
  AdminBusinessServiceAreas,
  AdminBusinessCoordinates,
  AdminClientSitesMonitoring,
  AdminBarcodeRegistry,
  AdminContactCenter,
  AdminLeadRequests,
  AdminQuoteRequests,
  AdminOpportunitiesOperations,
  AdminQuoteRequestDetails,
  AdminQuoteOperations,
  AdminPerformance,
  AdminDiagnostics,
  AdminDataEnrichment,
  AdminDataEnrichmentGovernance,
  AdminMarketAnalytics,
  AdminAccessManagement,
  AdminSystemAccess,
  AdminProviderGrowth,
  AdminProviderGrowthQueue,
  AdminCatalogGovernance,
  AdminCatalogGovernanceQueue,
  AdminProviderAnalytics,
  AdminAuditLog,
  AdminProviderLeads,
  AdminProviderLanding,
  AdminPdfVisualQa,
  AdminOperationsHub,
  AdminOperationsCenterUnified,
  AdminConversionOptimization,
  AdminReportsHub,
  AdminEmailHub,
  AdminSeoHub,
  AdminProviderReviewHub,
  AdminContractsHub,
  AdminMembershipsHub,
  AdminSystemSettingsHub,
  AdminNotificationsConfig,
  AdminTaxonomyCenter,
  AdminProjectCategories,
  AdminProcurementCenter,
  AdminContentCenter,
  AdminFinanceCenter,
  AdminSettingsCenter,
  AdminKnowledgeCenter,
} from "@/routes";

const PageLoader = () => (
  // P1.4 — slim, non-blocking route loader. Renders a top progress bar plus
  // a subtle centered brand pulse on a plain background instead of the old
  // full-screen dvh-height spinner, so the next route's shell feels lighter.
  <div className="min-h-[40vh] bg-background">
    <div
      role="progressbar"
      aria-label="Loading"
      className="fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden bg-transparent"
    >
      <div className="h-full w-1/3 animate-[progress-indeterminate_1.1s_ease-in-out_infinite] bg-primary/70" />
    </div>
    <div className="flex items-center justify-center pt-24 pb-12 opacity-70">
      <div className="animate-pulse">
        <BrandLogo variant="mark" tone="auto" size="loader" priority alt="قِطاعات" />
      </div>
    </div>
  </div>
);

/**
 * LEGACY CLEANUP L08 — Forwards the legacy admin detail route
 * `/admin/quote-requests/:id` to the canonical
 * `/admin/opportunities/:id` while preserving the `:id` path param.
 * No component is removed; the legacy route path remains registered
 * so deep-links and bookmarks keep working.
 */
const LegacyAdminQuoteRequestDetailRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/admin/opportunities/${id ?? ''}`} replace />;
};

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
          <Route path="/auth/verified" element={<AuthVerified />} />
          <Route path="/onboarding" element={<ProtectedRoute skipOnboarding><Onboarding /></ProtectedRoute>} />
          {/* AUTH SIMPLIFICATION UX — post-login context selection */}
          <Route path="/start" element={<ProtectedRoute skipOnboarding><Start /></ProtectedRoute>} />
          {/* ENTITY REGISTRATION SIMPLIFICATION — basic entity + account manager.
              INTENTIONALLY PUBLIC (Phase C audit): RegisterEntity handles inline
              signup via authService.signUp for anonymous visitors as part of the
              flow. Wrapping in <ProtectedRoute> would block first-time signups. */}
          <Route path="/register-entity" element={<RegisterEntity />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/quote" element={<Quote />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/contract-templates" element={<ContractTemplates />} />
          <Route path="/contract-templates/:slug" element={<ContractTemplateDetail />} />
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
          <Route path="/knowledge" element={<KnowledgeCenter />} />
          <Route path="/faq" element={<KnowledgeCenter />} />
          <Route path="/help/category/:slug" element={<HelpCategoryPage />} />
          <Route path="/help/article/:slug" element={<HelpArticlePage />} />
          <Route path="/help/report-issue" element={<ProtectedRoute><ReportIssuePage /></ProtectedRoute>} />
          <Route path="/help/feature-request" element={<ProtectedRoute><FeatureRequestPage /></ProtectedRoute>} />
          <Route path="/help/email-not-arriving" element={<EmailNotArrivingHelp />} />
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
          <Route path="/contracts/request" element={<ProtectedRoute><RequestContractPage /></ProtectedRoute>} />
          <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />
          <Route path="/dashboard/diagnostics" element={<ProtectedRoute><DashboardAccountDiagnostics /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 4 — Contracts hub. */}
          <Route path="/dashboard/contracts" element={<ProtectedRoute><DashboardContractsHub /></ProtectedRoute>} />
          <Route path="/dashboard/contracts/:id/review" element={<ProtectedRoute><DashboardContractReview /></ProtectedRoute>} />
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
          {/* Phase C audit — INTENTIONAL plain-auth guards (no requireProvider).
              Both pages serve the pre-provider state: a user with a business
              draft (approval_status='draft' | 'pending') who is BECOMING a
              provider. Adding requireProvider would lock draft owners out of
              the very pages that let them finish the application, creating a
              dead redirect loop. */}
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
          <Route path="/dashboard/projects" element={<ProtectedRoute><DashboardProjects /></ProtectedRoute>} />
          {/* CLIENT WORKSPACE UNIFICATION P1 — unified read-only view
              that merges the user's projects + client_sites. No DB/RPC
              changes; contract creation from here is intentionally
              disabled and gated behind a Phase-4 RPC approval. */}
          <Route path="/dashboard/workspaces" element={<ProtectedRoute><DashboardWorkspaces /></ProtectedRoute>} />
          <Route path="/dashboard/workspaces/:kind/:id" element={<ProtectedRoute><DashboardWorkspaceDetail /></ProtectedRoute>} />
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
          <Route path="/dashboard/my-requests/new" element={<ProtectedRoute><DashboardNewRfq /></ProtectedRoute>} />
          <Route path="/dashboard/my-requests/:id" element={<ProtectedRoute><QuoteRequestDetails /></ProtectedRoute>} />
          {/* OPPORTUNITIES PHASE 2 — UI-only route aliases. Internal naming
              (`quote_requests`, `provider_leads`) is preserved; old routes
              remain registered above. No DB / edge / RPC changes. */}
          <Route path="/dashboard/opportunities" element={<ProtectedRoute><DashboardMyRequests /></ProtectedRoute>} />
          <Route path="/dashboard/opportunities/assigned" element={<ProtectedRoute requireProvider><DashboardRequestsHub /></ProtectedRoute>} />
          <Route path="/dashboard/opportunities/:id" element={<ProtectedRoute><QuoteRequestDetails /></ProtectedRoute>} />
          {/* OPPORTUNITIES PHASE 4 — provider lead list collapses into the
              canonical assigned-opportunities surface (no UI duplication). */}
          <Route path="/dashboard/provider/leads" element={<Navigate to="/dashboard/opportunities/assigned" replace />} />
          <Route path="/dashboard/provider/leads/:id" element={<ProtectedRoute requireProvider><ProviderLeadDetails /></ProtectedRoute>} />
          <Route path="/dashboard/provider/membership" element={<ProtectedRoute requireProvider><ProviderMembership /></ProtectedRoute>} />
          <Route path="/dashboard/membership" element={<ProtectedRoute><DashboardMembership /></ProtectedRoute>} />
          <Route path="/dashboard/provider/service-areas" element={<ProtectedRoute requireProvider><ProviderServiceAreas /></ProtectedRoute>} />
          {/* Phase C audit — NAMING DEBT (rename deferred to Phase D):
              /admin/ai-center mounts DashboardAiCenter. The component is a
              generic AI writing/chat surface with no provider-only mutations,
              so mounting it behind requireAdmin is safe. The `Dashboard*` file
              name is legacy; renaming to AdminAiCenter is deferred to Phase D
              to keep this pass zero-behavior-change. */}
          <Route path="/admin/ai-center" element={<ProtectedRoute requireAdmin><DashboardAiCenter /></ProtectedRoute>} />

          <Route path="/dashboard/blog" element={<ProtectedRoute requireAdmin><DashboardBlog /></ProtectedRoute>} />
          <Route path="/dashboard/profile-systems" element={<ProtectedRoute requireAdmin><DashboardProfileSystems /></ProtectedRoute>} />
          <Route path="/admin/api-settings" element={<Navigate to="/admin/system-settings?tab=api" replace />} />
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
          {/* DEFERRED CLEANUP L17/L18 pilot — uses the shared <AdminRoute>
              wrapper (= <ProtectedRoute requireAdmin> + <DashboardLayout>).
              The page itself no longer wraps its content in
              <DashboardLayout>, so the sidebar renders exactly once. */}
          <Route path="/admin/taxonomy" element={<AdminRoute><AdminTaxonomyCenter /></AdminRoute>} />
          <Route path="/admin/project-categories" element={<ProtectedRoute requireAdmin><AdminProjectCategories /></ProtectedRoute>} />
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
          <Route path="/admin/membership-rejections" element={<Navigate to="/admin/memberships?tab=rejections" replace />} />
          <Route path="/admin/membership-events" element={<Navigate to="/admin/memberships?tab=events" replace />} />
          <Route path="/admin/membership-payments" element={<Navigate to="/admin/memberships?tab=payments" replace />} />
          {/* Phase B — Unified Contact Center. Old routes redirect to the matching tab. */}
          <Route path="/admin/contact-messages" element={<ProtectedRoute requireAdmin><AdminContactCenter /></ProtectedRoute>} />
          <Route path="/admin/contact-inbox-settings" element={<Navigate to="/admin/contact-messages?tab=settings" replace />} />
          <Route path="/admin/contact-audit-log" element={<Navigate to="/admin/contact-messages?tab=audit" replace />} />
          <Route path="/admin/contact-sla-dashboard" element={<Navigate to="/admin/contact-messages?tab=sla" replace />} />
          <Route path="/admin/contact-notification-log" element={<Navigate to="/admin/contact-messages?tab=notifications" replace />} />
          <Route path="/admin/lead-requests" element={<ProtectedRoute requireAdmin><AdminLeadRequests /></ProtectedRoute>} />
          <Route path="/admin/provider-leads" element={<ProtectedRoute requireAdmin><AdminProviderLeads /></ProtectedRoute>} />
          {/* LEGACY CLEANUP L08 — `/admin/quote-requests*` redirects to
              the canonical `/admin/opportunities/*` surface. Routes stay
              registered (no deletion) so deep-links, email links, and
              sidebar bookmarks continue to resolve. Components
              `AdminQuoteRequests` / `AdminQuoteRequestDetails` remain
              mounted on the canonical paths below. */}
          <Route path="/admin/quote-requests" element={<Navigate to="/admin/opportunities/list" replace />} />
          <Route path="/admin/quote-requests/:id" element={<ProtectedRoute requireAdmin><LegacyAdminQuoteRequestDetailRedirect /></ProtectedRoute>} />
          {/* OPPORTUNITIES PHASE 2 — admin alias. */}
          {/* OPPORTUNITIES PHASE 8 — operations center (KPIs / funnel / table). */}
          <Route path="/admin/opportunities" element={<ProtectedRoute requireAdmin><AdminOpportunitiesOperations /></ProtectedRoute>} />
          <Route path="/admin/opportunities/list" element={<ProtectedRoute requireAdmin><AdminQuoteRequests /></ProtectedRoute>} />
          <Route path="/admin/opportunities/:id" element={<ProtectedRoute requireAdmin><AdminQuoteRequestDetails /></ProtectedRoute>} />
          <Route path="/admin/quote-operations" element={<ProtectedRoute requireAdmin><AdminQuoteOperations /></ProtectedRoute>} />
          <Route path="/admin/provider-subscriptions" element={<Navigate to="/admin/memberships?tab=providers" replace />} />
          {/* NAVIGATION-CONSOLIDATION-1 group 14 — Email hub. */}
          <Route path="/admin/email-center" element={<ProtectedRoute requireAdmin><AdminEmailHub /></ProtectedRoute>} />
          <Route path="/admin/email-deliverability" element={<Navigate to="/admin/email-center?tab=deliverability" replace />} />
          {/* NAVIGATION-CONSOLIDATION-1 group 16 — SEO hub. */}
          <Route path="/admin/site-audit" element={<Navigate to="/admin/sitemap-status?tab=audit" replace />} />
          <Route path="/admin/performance" element={<ProtectedRoute requireAdmin><AdminPerformance /></ProtectedRoute>} />
          <Route path="/admin/diagnostics" element={<ProtectedRoute requireAdmin><AdminDiagnostics /></ProtectedRoute>} />
          <Route path="/admin/data-enrichment" element={<ProtectedRoute requireAdmin><AdminDataEnrichment /></ProtectedRoute>} />
          <Route path="/admin/data-enrichment-governance" element={<ProtectedRoute requireAdmin><AdminDataEnrichmentGovernance /></ProtectedRoute>} />
          <Route path="/admin/sector-seo" element={<Navigate to="/admin/sitemap-status?tab=sector-seo" replace />} />
          <Route path="/admin/market-analytics" element={<ProtectedRoute requireAdmin><AdminMarketAnalytics /></ProtectedRoute>} />
          <Route path="/admin/sitemap-status" element={<ProtectedRoute requireAdmin><AdminSeoHub /></ProtectedRoute>} />
          <Route path="/admin/provider-analytics" element={<Navigate to="/admin/provider-review?tab=analytics" replace />} />
          <Route path="/admin/provider-landing" element={<Navigate to="/admin/provider-review?tab=landing" replace />} />
          <Route path="/admin/access-management" element={<ProtectedRoute requireSuperAdmin><AdminAccessManagement /></ProtectedRoute>} />
          <Route path="/admin/system-access" element={<ProtectedRoute requireAdmin><AdminSystemAccess /></ProtectedRoute>} />

          <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute requireSuperAdmin><AdminUserDetail /></ProtectedRoute>} />
          {/* ADMIN UX RECONSOLIDATION PHASE 4 — Identity & Access center hub. */}
          <Route path="/admin/identity" element={<ProtectedRoute requireSuperAdmin><AdminIdentityHub /></ProtectedRoute>} />
          <Route path="/admin/identity/dashboard" element={<ProtectedRoute requireSuperAdmin><AdminIdentity /></ProtectedRoute>} />
          {/* ADMIN-REDESIGN PHASE 2 — Identity Center (unified visual tokens). */}
          <Route path="/admin/system/identity" element={<ProtectedRoute requireSuperAdmin><AdminIdentityCenter /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 17 — System Settings hub.
              Gated by requireAdmin; the System tab's content enforces super-admin internally. */}
          <Route path="/admin/system-settings" element={<ProtectedRoute requireAdmin><AdminSystemSettingsHub /></ProtectedRoute>} />
          <Route path="/admin/notifications-config" element={<ProtectedRoute requireAdmin><AdminNotificationsConfig /></ProtectedRoute>} />
          <Route path="/admin/cron-runs" element={<ProtectedRoute requireAdmin><AdminCronRuns /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 9 — Operations hub. */}
          <Route path="/admin/operations" element={<ProtectedRoute requireAdmin><AdminOperationsHub /></ProtectedRoute>} />
          <Route path="/admin/operations/console" element={<Navigate to="/admin/operations?tab=console" replace />} />
          {/* OPERATIONS-CENTER-UNIFICATION-1 — unified read-only routing hub. */}
          <Route path="/admin/operations-center" element={<ProtectedRoute requireAdmin><AdminOperationsCenterUnified /></ProtectedRoute>} />
          {/* MARKETPLACE-CONVERSION-OPTIMIZATION-1 — read-only conversion dashboard. */}
          <Route path="/admin/conversion-optimization" element={<ProtectedRoute requireAdmin><AdminConversionOptimization /></ProtectedRoute>} />
         <Route path="/admin/ref/triage" element={<ProtectedRoute requireAdmin><AdminBulkReferenceTriage /></ProtectedRoute>} />
         <Route path="/admin/ref/:refId" element={<ProtectedRoute requireAdmin><AdminReferenceInspector /></ProtectedRoute>} />
          <Route path="/admin/analytics-settings" element={<Navigate to="/admin/system-settings?tab=analytics" replace />} />
          <Route path="/admin/branding" element={<Navigate to="/admin/system-settings?tab=branding" replace />} />
          <Route path="/admin/contract-templates" element={<Navigate to="/admin/contracts?tab=templates" replace />} />
          <Route path="/admin/pdf-exports" element={<Navigate to="/admin/contracts?tab=exports" replace />} />
          <Route path="/admin/pdf-visual-qa" element={<ProtectedRoute requireAdmin><AdminPdfVisualQa /></ProtectedRoute>} />
          <Route path="/admin/contracts/analytics" element={<Navigate to="/admin/contracts?tab=analytics" replace />} />
          {/* NAVIGATION-CONSOLIDATION-1 group 11 — Contracts hub. */}
          <Route path="/admin/contracts" element={<ProtectedRoute requireAdmin><AdminContractsHub /></ProtectedRoute>} />
          <Route path="/admin/contracts/create" element={<Navigate to="/admin/contracts?tab=create" replace />} />
          {/* NAVIGATION-CONSOLIDATION-1 group 12 — Reports hub. */}
          <Route path="/admin/reports" element={<ProtectedRoute requireAdmin><AdminReportsHub /></ProtectedRoute>} />
          <Route path="/admin/kpis" element={<Navigate to="/admin/reports?tab=kpis" replace />} />
          <Route path="/admin/audit-log" element={<ProtectedRoute requireAdmin><AdminAuditLog /></ProtectedRoute>} />
          {/* ADMIN UX RECONSOLIDATION PHASE 2 — new canonical center shells.
              Legacy URLs continue to work unchanged; these add unified
              entry points without moving any queries or mutations. */}
          <Route path="/admin/procurement" element={<ProtectedRoute requireAdmin><AdminProcurementCenter /></ProtectedRoute>} />
          <Route path="/admin/content" element={<ProtectedRoute requireAdmin><AdminContentCenter /></ProtectedRoute>} />
          {/* KNOWLEDGE ADMIN MANAGEMENT — Phase 3 (read-only). */}
          <Route path="/admin/knowledge" element={<ProtectedRoute requireAdmin><AdminKnowledgeCenter /></ProtectedRoute>} />
          <Route path="/admin/finance" element={<ProtectedRoute requireAdmin><AdminFinanceCenter /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettingsCenter /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminHome /></ProtectedRoute>} />
          {/* NAVIGATION-CONSOLIDATION-1 group 3 — RFQ hub.
              OPPORTUNITIES PHASE 4 — list surfaces redirect to the canonical
              `/dashboard/opportunities/assigned`. The detail route stays
              wired to `DashboardRfqDetail` (unchanged data fetching). */}
          <Route path="/dashboard/rfq" element={<Navigate to="/dashboard/opportunities/assigned" replace />} />
          <Route path="/dashboard/rfq/inbox" element={<Navigate to="/dashboard/opportunities/assigned" replace />} />
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

// P1.2 — persist public directory queries once at module scope.
// Runs before React mounts so cached data is available on the very first render.
(() => {
  const persister = createQueryPersister();
  if (!persister) return;
  try {
    persistQueryClient({
      queryClient,
      persister,
      maxAge: PERSIST_MAX_AGE_MS,
      buster: PERSIST_BUSTER,
      dehydrateOptions: {
        shouldDehydrateQuery: (q) => q.state.status === 'success' && shouldPersistQuery(q),
      },
    });
  } catch {
    /* persistence is best-effort — never break boot */
  }
})();

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
