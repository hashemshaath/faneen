/**
 * BUSINESS-WORKFLOW-PROCUREMENT-3 — RFQ line items service wrappers.
 * Pages MUST import via `@/modules/procurement` and MUST NOT touch the
 * `procurement_rfq_items` table directly.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ProcurementRfqItemRow } from '../types';
import { isValidBrandLock, type BrandLock } from '@/modules/brands/lib/brandSelectionRules';

const SELECT =
  'id, business_id, rfq_id, procurement_request_id, name, description, quantity, unit, target_price, sort_order, requested_brand_id, brand_lock, created_at, updated_at';

export interface CreateRfqItemInput {
  business_id: string;
  rfq_id: string;
  procurement_request_id?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  target_price?: number | null;
  sort_order?: number | null;
  /** RFQ-BRAND-PICKER-1D — optional approved brand requirement. */
  requested_brand_id?: string | null;
  brand_lock?: BrandLock | null;
}

function validateInput(input: Partial<CreateRfqItemInput>): string | null {
  const name = (input.name ?? '').trim();
  if (!name) return 'name_required';
  if (name.length > 200) return 'name_too_long';
  if (typeof input.quantity !== 'number' || !(input.quantity > 0))
    return 'quantity_invalid';
  if (input.target_price != null && !(input.target_price >= 0))
    return 'target_price_invalid';
  return null;
}

export async function createRfqItem(
  input: CreateRfqItemInput,
): Promise<{ data: ProcurementRfqItemRow | null; error: unknown }> {
  const err = validateInput(input);
  if (err) return { data: null, error: new Error(err) };
  if (input.brand_lock != null && !isValidBrandLock(input.brand_lock)) {
    return { data: null, error: new Error('brand_lock_invalid') };
  }
  // Clearing brand → no lock semantics.
  const requested_brand_id = input.requested_brand_id ?? null;
  const brand_lock = requested_brand_id ? (input.brand_lock ?? null) : null;
  const { data, error } = await supabase
    .from('procurement_rfq_items')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      business_id: input.business_id,
      rfq_id: input.rfq_id,
      procurement_request_id: input.procurement_request_id ?? null,
      name: input.name.trim(),
      description: input.description ?? null,
      quantity: input.quantity,
      unit: input.unit ?? null,
      target_price: input.target_price ?? null,
      sort_order: input.sort_order ?? 0,
      requested_brand_id,
      brand_lock,
    } as any)
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementRfqItemRow | null) ?? null, error };
}

export interface UpdateRfqItemPatch {
  name?: string;
  description?: string | null;
  quantity?: number;
  unit?: string | null;
  target_price?: number | null;
  sort_order?: number;
  requested_brand_id?: string | null;
  brand_lock?: BrandLock | null;
}

export async function updateRfqItem(
  id: string,
  patch: UpdateRfqItemPatch,
): Promise<{ data: ProcurementRfqItemRow | null; error: unknown }> {
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return { data: null, error: new Error('name_required') };
    if (n.length > 200) return { data: null, error: new Error('name_too_long') };
    patch.name = n;
  }
  if (patch.quantity !== undefined && !(patch.quantity > 0))
    return { data: null, error: new Error('quantity_invalid') };
  if (
    patch.target_price !== undefined &&
    patch.target_price !== null &&
    !(patch.target_price >= 0)
  )
    return { data: null, error: new Error('target_price_invalid') };
  if (
    patch.brand_lock !== undefined &&
    patch.brand_lock !== null &&
    !isValidBrandLock(patch.brand_lock)
  )
    return { data: null, error: new Error('brand_lock_invalid') };
  // Clearing brand also clears the lock to keep semantics consistent.
  const writePatch: Record<string, unknown> = { ...patch };
  if (patch.requested_brand_id === null) {
    writePatch.brand_lock = null;
  }

  const { data, error } = await supabase
    .from('procurement_rfq_items')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(writePatch as any)
    .eq('id', id)
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementRfqItemRow | null) ?? null, error };
}

export async function deleteRfqItem(
  id: string,
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('procurement_rfq_items')
    .delete()
    .eq('id', id);
  return { error };
}

export async function listRfqItemsByRfq(
  rfqId: string,
): Promise<{ data: ProcurementRfqItemRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_rfq_items')
    .select(SELECT)
    .eq('rfq_id', rfqId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  return { data: (data as ProcurementRfqItemRow[] | null) ?? null, error };
}

export interface ReorderRfqItemEntry {
  id: string;
  sort_order: number;
}

export async function reorderRfqItems(
  entries: ReadonlyArray<ReorderRfqItemEntry>,
): Promise<{ error: unknown }> {
  for (const e of entries) {
    const { error } = await supabase
      .from('procurement_rfq_items')
      .update({ sort_order: e.sort_order })
      .eq('id', e.id);
    if (error) return { error };
  }
  return { error: null };
}