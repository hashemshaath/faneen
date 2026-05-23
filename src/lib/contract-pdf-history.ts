/**
 * PDF-QA2 — Helper for the contract PDF export history.
 *
 * Wraps the SECURITY DEFINER `record_contract_pdf_export` RPC so callers can
 * fire-and-forget a log entry after building a contract PDF. Logging failures
 * are swallowed so they never block the user-facing download (the RPC itself
 * raises only on auth/role issues).
 *
 * Privacy: the client passes only `contract_id`, `source`, and `locale`.
 * All sensitive metadata (template name, document hash, counts) is resolved
 * server-side and never echoed back beyond the safe summary.
 */
import { recordContractPdfExportRpc } from '@/modules/contracts/services/pdfExports';

export type PdfExportSource =
  | 'contract_detail'
  | 'dashboard_contracts'
  | 'admin'
  | 'unknown';

export interface PdfExportLogResult {
  export_id: string;
  exported_at: string;
  contract_number: string | null;
  document_hash_prefix: string | null;
}

export async function recordContractPdfExport(
  contractId: string,
  source: PdfExportSource = 'unknown',
  locale?: string | null,
): Promise<PdfExportLogResult | null> {
  try {
    const { data, error } = await recordContractPdfExportRpc({
      _contract_id: contractId,
      _source: source,
      _export_locale: locale ?? null,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[pdf-export-log] failed', error.message);
      return null;
    }
    const row = Array.isArray(data) ? (data as unknown[])[0] : data;
    return (row ?? null) as PdfExportLogResult | null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[pdf-export-log] threw', e instanceof Error ? e.message : e);
    return null;
  }
}