/**
 * CT-3 — Thin wrappers over the contract PDF export listing RPCs.
 * Provider list + admin list/summary. Raw `{ data, error }` pass-through.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ListContractPdfExportsArgs {
  _contract_id: string;
  _search: string | null;
  _source: string | null;
  _contract_version: number | null;
  _template_version_number: number | null;
  _limit: number;
  _offset: number;
}

export async function listContractPdfExports(args: ListContractPdfExportsArgs) {
  return await supabase.rpc('list_contract_pdf_exports', args);
}

export interface AdminListContractPdfExportsArgs {
  _search: string | null;
  _source: string | null;
  _contract_status: string | null;
  _template_version_number: number | null;
  _date_from: string | null;
  _date_to: string | null;
  _limit: number;
  _offset: number;
}

export async function adminListContractPdfExports(args: AdminListContractPdfExportsArgs) {
  return await supabase.rpc('admin_list_contract_pdf_exports', args);
}

export async function adminContractPdfExportsSummary() {
  return await supabase.rpc('admin_contract_pdf_exports_summary');
}