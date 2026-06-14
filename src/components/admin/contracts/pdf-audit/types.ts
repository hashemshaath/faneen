export interface PdfExportAuditRowData {
  export_ref: string;
  exported_at: string;
  exporter_display_name: string | null;
  source: string;
  contract_number: string | null;
  contract_status: string | null;
  contract_version: number | null;
  official_version_number: number | null;
  document_hash_prefix: string | null;
  template_version_number: number | null;
  template_name_ar: string | null;
  template_name_en: string | null;
  amendment_count: number;
  line_item_count: number;
  boq_group_count: number;
  export_locale: string | null;
  total_count: number;
}

export interface PdfExportAuditSummary {
  exports_today: number;
  exports_7d: number;
  unique_contracts_30d: number;
  top_source: string | null;
  archived_count: number;
}

export const PDF_AUDIT_SOURCE_LABEL: Record<string, { ar: string; en: string }> = {
  contract_detail:     { ar: 'صفحة العقد',   en: 'Contract page' },
  dashboard_contracts: { ar: 'لوحة العقود',  en: 'Contracts dashboard' },
  admin:               { ar: 'الإدارة',       en: 'Admin' },
  unknown:             { ar: 'غير محدد',     en: 'Unknown' },
};
export const PDF_AUDIT_SOURCE_KEYS = ['contract_detail', 'dashboard_contracts', 'admin', 'unknown'] as const;
export const PDF_AUDIT_STATUS_KEYS = ['draft', 'pending_review', 'active', 'completed', 'cancelled', 'amended'] as const;

const UUID_RX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
export const safePdfAuditText = (s: string | null | undefined): string =>
  !s ? '' : UUID_RX.test(s) ? '' : s;