/**
 * Phase 3D — Shared form-state shape for the contract create flow.
 * Mirrors the existing ContractForm interface in DashboardContracts.tsx.
 */
export interface ContractForm {
  title_ar: string; title_en: string; description_ar: string; description_en: string;
  total_amount: string; currency_code: string; start_date: string; end_date: string;
  terms_ar: string; terms_en: string;
  supervisor_name: string; supervisor_phone: string; supervisor_email: string;
  client_email: string;
  vat_inclusive: boolean; vat_rate: string;
}