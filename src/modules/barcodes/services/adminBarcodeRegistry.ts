/**
 * Canonical service wrappers for the admin barcode registry page.
 *
 * All calls go through admin-only RPCs that already enforce role checks and
 * sanitize payloads (no raw token hashes, no PII). The page layer must never
 * touch the underlying `barcodes*` tables directly.
 */
import { supabase } from '@/integrations/supabase/client';

export interface BarcodeRegistryRow {
  barcode_id: string;
  barcode_code: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  owner_label: string | null;
  owner_business_label: string | null;
  status: string;
  visibility: string;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
  linked_entities_count: number;
  events_count: number;
}

export interface BarcodeRegistrySummary {
  total: number;
  active: number;
  frozen: number;
  archived: number;
  revoked: number;
  transferred: number;
  total_scans: number;
  scanned_last_7d: number;
  by_entity_type: Record<string, number>;
  by_visibility: Record<string, number>;
  top_scanned: Array<{
    barcode_code: string;
    entity_type: string;
    scan_count: number;
    last_scanned_at: string | null;
  }>;
}

export interface BarcodeRegistryDetail {
  barcode: BarcodeRegistryRow & {
    permanent_public_code: boolean;
    scan_url_path: string | null;
    archived_at: string | null;
    frozen_at: string | null;
    transferred_at: string | null;
    updated_at: string;
    source: string | null;
  };
  events: Array<{
    id: string;
    event_type: string;
    actor_role: string | null;
    created_at: string;
    metadata_safe: { source?: string; reason?: string; note?: string };
  }>;
  links: Array<{
    id: string;
    linked_entity_type: string;
    linked_entity_id: string;
    relationship_type: string;
    created_at: string;
    label: string | null;
  }>;
  counts: { events_count: number; links_count: number };
}

export interface ListBarcodeRegistryRecordsOptions {
  search?: string | null;
  entityType?: string | null;
  status?: string | null;
  visibility?: string | null;
  limit: number;
  offset: number;
}

export interface ListBarcodeRegistryRecordsResult {
  rows: BarcodeRegistryRow[];
  total: number;
  limit: number;
  offset: number;
}

/** List barcode registry rows via the admin RPC (paginated, filterable). */
export async function listBarcodeRegistryRecords(
  options: ListBarcodeRegistryRecordsOptions,
): Promise<ListBarcodeRegistryRecordsResult> {
  const { data, error } = await supabase.rpc('admin_list_barcodes', {
    _search: options.search ?? null,
    _entity_type: options.entityType ?? null,
    _status: options.status ?? null,
    _visibility: options.visibility ?? null,
    _limit: options.limit,
    _offset: options.offset,
  });
  if (error) throw error;
  return data as unknown as ListBarcodeRegistryRecordsResult;
}

/** Fetch the global barcode registry KPI summary. */
export async function getBarcodeRegistrySummary(): Promise<BarcodeRegistrySummary> {
  const { data, error } = await supabase.rpc('admin_barcode_registry_summary');
  if (error) throw error;
  return data as unknown as BarcodeRegistrySummary;
}

/** Fetch full inline detail for a single barcode (links + recent events). */
export async function getBarcodeRegistryRecordById(
  barcodeId: string,
): Promise<BarcodeRegistryDetail> {
  const { data, error } = await supabase.rpc('admin_get_barcode_detail', {
    _barcode_id: barcodeId,
  });
  if (error) throw error;
  return data as unknown as BarcodeRegistryDetail;
}

// ───────────────────────────────────────────────────────────────────────────
// Lifecycle actions (BARCODE-REGISTRY-LIFECYCLE-1)
//
// All wrappers return the raw Supabase `{ data, error }` envelope so the
// caller can branch on PostgREST errors (e.g. 'forbidden', 'unauthorized')
// AND on in-payload error codes (e.g. { ok:false, error:'invalid_transition' }).
//
// UI for these actions is intentionally NOT wired in this phase — see
// BARCODE-REGISTRY-LIFECYCLE-2 for the inline admin action surface.
// ───────────────────────────────────────────────────────────────────────────

export interface BarcodeLifecycleResult {
  ok: boolean;
  barcode_id?: string;
  previous_status?: string;
  new_status?: string;
  error?:
    | 'not_found'
    | 'invalid_transition'
    | 'entity_already_has_active_barcode'
    | string;
  from?: string;
  to?: string;
  conflict_barcode_id?: string;
}

/** Freeze an active barcode (active → frozen). Audit-logged as 'frozen'. */
export function freezeBarcodeAdmin(barcodeId: string, reason?: string | null) {
  return supabase.rpc('admin_freeze_barcode', {
    _barcode_id: barcodeId,
    _reason: reason ?? null,
  });
}

/** Archive a barcode (active|frozen|revoked → archived). Audit-logged as 'archived'. */
export function archiveBarcodeAdmin(barcodeId: string, reason?: string | null) {
  return supabase.rpc('admin_archive_barcode', {
    _barcode_id: barcodeId,
    _reason: reason ?? null,
  });
}

/**
 * Restore a frozen or archived barcode back to active. Server-side guard
 * rejects the restore if another non-archived barcode already owns the same
 * (entity_type, entity_id) slot (returns `entity_already_has_active_barcode`).
 * Audit-logged as 'unfrozen' or 'reactivated'.
 */
export function restoreBarcodeAdmin(barcodeId: string, reason?: string | null) {
  return supabase.rpc('admin_restore_barcode', {
    _barcode_id: barcodeId,
    _reason: reason ?? null,
  });
}