/**
 * Shared types for contract template UI surfaces.
 *
 * R2B.3b — gallery-specific type for the inline template card in
 * DashboardContracts. Distinct from PublishedTemplateOption (used by the
 * wizard published-version selector), which remains in DashboardContracts.
 */
export interface ContractTemplateGalleryItem {
  id: string;
  category: string;
  name_ar: string;
  name_en: string | null;
  scope_of_work_ar?: string | null;
  warranty_terms_ar?: string | null;
  payment_terms_ar?: string | null;
}