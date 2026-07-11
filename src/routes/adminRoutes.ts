// Auto-organized route module — grouped admin surface lazy imports.
// Moved from src/App.tsx during route module split (Phase B). No behavior change.
import { lazyRetry } from "@/lib/lazyRetry";

export const AdminHome = lazyRetry(() => import("../pages/admin/AdminHome"));
export const AdminHelpCenter = lazyRetry(() => import("../pages/admin/AdminHelpCenter"));
export const AdminServiceActivations = lazyRetry(() => import("../pages/admin/AdminServiceActivations"));
export const AdminAbExperiments = lazyRetry(() => import("../pages/admin/AdminAbExperiments"));
export const AdminShowcase = lazyRetry(() => import("../pages/admin/AdminShowcase"));
export const AdminPartnerShowcase = lazyRetry(() => import("../pages/admin/AdminPartnerShowcase"));
export const AdminHomeFaq = lazyRetry(() => import("../pages/admin/AdminHomeFaq"));
export const AdminHomeSectors = lazyRetry(() => import("../pages/admin/AdminHomeSectors"));
export const AdminRentals = lazyRetry(() => import("../pages/admin/AdminRentals"));
export const AdminAssets = lazyRetry(() => import("../pages/admin/AdminAssets"));
export const AdminAssetOverrides = lazyRetry(() => import("../pages/admin/AdminAssetOverrides"));
export const AdminPrivateSectors = lazyRetry(() => import("../pages/admin/AdminPrivateSectors"));
export const AdminServiceRequests = lazyRetry(() => import("../pages/admin/AdminServiceRequests"));
export const AdminBrands = lazyRetry(() => import("../pages/admin/AdminBrands"));
export const AdminBrandDetail = lazyRetry(() => import("../pages/admin/AdminBrandDetail"));
export const AdminBrandRequests = lazyRetry(() => import("../pages/admin/AdminBrandRequests"));
export const AdminGoogleServices = lazyRetry(() => import("../pages/admin/AdminGoogleServices"));
export const AdminIntegrations = lazyRetry(() => import("../pages/admin/AdminIntegrations"));
export const AdminApiDocs = lazyRetry(() => import("../pages/admin/AdminApiDocs"));
export const AdminUsers = lazyRetry(() => import("../pages/admin/AdminUsers"));
export const AdminUserDetail = lazyRetry(() => import("../pages/admin/AdminUserDetail"));
export const AdminIdentity = lazyRetry(() => import("../pages/admin/AdminIdentity"));
export const AdminIdentityHub = lazyRetry(() => import("../pages/admin/AdminIdentityHub"));
export const AdminIdentityCenter = lazyRetry(() => import("../pages/admin/AdminIdentityCenter"));
export const AdminCronRuns = lazyRetry(() => import("../pages/admin/AdminCronRuns"));
export const AdminReferenceInspector = lazyRetry(() => import("../pages/admin/AdminReferenceInspector"));
export const AdminBulkReferenceTriage = lazyRetry(() => import("../pages/admin/AdminBulkReferenceTriage"));
export const AdminActivityLog = lazyRetry(() => import("../pages/admin/AdminActivityLog"));
// Historical taxonomy CRUD pages (AdminCategories / AdminTags /
// AdminTaxonomyHub) were retired in favor of /admin/taxonomy. The
// deprecation routes still render a replacement notice for any bookmarked
// URLs. TODO(legacy-sunset): see TODO-C1-01 in `docs/pilot-launch-backlog.md`
// — remove the underlying files once /admin/taxonomy adoption is verified
// at 100%. Identifier kept as `AdminLegacyTaxonomyReplaced` because tests
// and the do-not-remove list reference it by name.
export const AdminLegacyTaxonomyReplaced = lazyRetry(() => import("../pages/admin/AdminLegacyTaxonomyReplaced"));
export const AdminBusinesses = lazyRetry(() => import("../pages/admin/AdminBusinesses"));
export const AdminOwnershipTransferRequests = lazyRetry(() => import("../pages/admin/AdminOwnershipTransferRequests"));
export const AdminEntityAccessRequests = lazyRetry(() => import("../pages/admin/AdminEntityAccessRequests"));
export const AdminApprovalsCenter = lazyRetry(() => import("../pages/admin/AdminApprovalsCenter"));
export const AdminBusinessVisibility = lazyRetry(() => import("../pages/admin/AdminBusinessVisibility"));
export const AdminLocationsHub = lazyRetry(() => import("../pages/admin/locations/AdminLocationsHub"));
export const AdminLocationsCatalog = lazyRetry(() => import("../pages/admin/locations/AdminLocationsCatalog"));
export const AdminBusinessServiceAreas = lazyRetry(() => import("../pages/admin/locations/AdminBusinessServiceAreas"));
export const AdminBusinessCoordinates = lazyRetry(() => import("../pages/admin/locations/AdminBusinessCoordinates"));
export const AdminClientSitesMonitoring = lazyRetry(() => import("../pages/admin/AdminClientSitesMonitoring"));
export const AdminBarcodeRegistry = lazyRetry(() => import("../pages/admin/AdminBarcodeRegistry"));
export const AdminContactCenter = lazyRetry(() => import("../pages/admin/AdminContactCenter"));
export const AdminLeadRequests = lazyRetry(() => import("../pages/admin/AdminLeadRequests"));
export const AdminQuoteRequests = lazyRetry(() => import("../pages/admin/AdminQuoteRequests"));
export const AdminOpportunitiesOperations = lazyRetry(() => import("../pages/admin/AdminOpportunitiesOperations"));
export const AdminQuoteRequestDetails = lazyRetry(() => import("../pages/admin/AdminQuoteRequestDetails"));
export const AdminQuoteOperations = lazyRetry(() => import("../pages/admin/AdminQuoteOperations"));
export const AdminPerformance = lazyRetry(() => import("../pages/admin/AdminPerformance"));
export const AdminDiagnostics = lazyRetry(() => import("../pages/admin/AdminDiagnostics"));
export const AdminDataEnrichment = lazyRetry(() => import("../pages/admin/AdminDataEnrichment"));
export const AdminDataEnrichmentGovernance = lazyRetry(() => import("../pages/admin/AdminDataEnrichmentGovernance"));
export const AdminMarketAnalytics = lazyRetry(() => import("../pages/admin/AdminMarketAnalytics"));
export const AdminAccessManagement = lazyRetry(() => import("../pages/admin/AdminAccessManagement"));
export const AdminSystemAccess = lazyRetry(() => import("../pages/admin/AdminSystemAccess"));
export const AdminProviderGrowth = lazyRetry(() => import("../pages/admin/AdminProviderGrowth"));
export const AdminProviderGrowthQueue = lazyRetry(() => import("../pages/admin/AdminProviderGrowthQueue"));
export const AdminCatalogGovernance = lazyRetry(() => import("../pages/admin/AdminCatalogGovernance"));
export const AdminCatalogGovernanceQueue = lazyRetry(() => import("../pages/admin/AdminCatalogGovernanceQueue"));
export const AdminProviderAnalytics = lazyRetry(() => import("../pages/admin/AdminProviderAnalytics"));
export const AdminAuditLog = lazyRetry(() => import("../pages/admin/AdminAuditLog"));
export const AdminProviderLeads = lazyRetry(() => import("../pages/admin/AdminProviderLeads"));
export const AdminProviderLanding = lazyRetry(() => import("../pages/admin/AdminProviderLanding"));
export const AdminPdfVisualQa = lazyRetry(() => import("../pages/admin/AdminPdfVisualQa"));
export const AdminOperationsHub = lazyRetry(() => import("../pages/admin/AdminOperationsHub"));
export const AdminOperationsCenterUnified = lazyRetry(() => import("../pages/admin/AdminOperationsCenterUnified"));
export const AdminConversionOptimization = lazyRetry(() => import("../pages/admin/AdminConversionOptimization"));
export const AdminReportsHub = lazyRetry(() => import("../pages/admin/AdminReportsHub"));
export const AdminEmailHub = lazyRetry(() => import("../pages/admin/AdminEmailHub"));
export const AdminSeoHub = lazyRetry(() => import("../pages/admin/AdminSeoHub"));
// NAVIGATION-CONSOLIDATION-1 — Phase 3 hubs.
export const AdminProviderReviewHub = lazyRetry(() => import("../pages/admin/AdminProviderReviewHub"));
export const AdminContractsHub = lazyRetry(() => import("../pages/admin/AdminContractsHub"));
export const AdminMembershipsHub = lazyRetry(() => import("../pages/admin/AdminMembershipsHub"));
// AdminTaxonomyHub retired — the deprecation routes /admin/categories and
// /admin/tags now render AdminLegacyTaxonomyReplaced as a
// backward-compatibility notice. TODO(legacy-sunset): see TODO-C1-02 in
// `docs/pilot-launch-backlog.md` — delete the file once verified.
export const AdminSystemSettingsHub = lazyRetry(() => import("../pages/admin/AdminSystemSettingsHub"));
export const AdminNotificationsConfig = lazyRetry(() => import("../pages/admin/AdminNotificationsConfig"));
// Taxonomy & Reference Data Center — Phase 2.
export const AdminTaxonomyCenter = lazyRetry(() => import("../pages/admin/AdminTaxonomyCenter"));
export const AdminProjectCategories = lazyRetry(() => import("../pages/admin/AdminProjectCategories"));
// ADMIN UX RECONSOLIDATION PHASE 2 — canonical center shells.
export const AdminProcurementCenter = lazyRetry(() => import("../pages/admin/AdminProcurementCenter"));
export const AdminContentCenter = lazyRetry(() => import("../pages/admin/AdminContentCenter"));
export const AdminFinanceCenter = lazyRetry(() => import("../pages/admin/AdminFinanceCenter"));
export const AdminSettingsCenter = lazyRetry(() => import("../pages/admin/AdminSettingsCenter"));
// KNOWLEDGE ADMIN MANAGEMENT — Phase 3 (read-only).
export const AdminKnowledgeCenter = lazyRetry(() => import("../pages/admin/AdminKnowledgeCenter"));
