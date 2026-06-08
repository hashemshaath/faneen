/**
 * RENTAL-ASSET-INTEGRATION-1 — pure availability checker wrapper.
 * Delegates to the SECURITY DEFINER RPC `asset_rental_check_availability`
 * which validates against asset status, retirement, maintenance, inspection
 * and overlapping reserved/active rental assignments.
 */
import { supabase } from '@/integrations/supabase/client';

export interface AssetRentalAvailability {
  available: boolean;
  reason?:
    | 'asset_not_found'
    | 'asset_retired'
    | 'asset_in_maintenance'
    | 'asset_in_inspection'
    | 'asset_inactive'
    | 'overlap_conflict';
  asset_ref?: string;
  conflicting_rental_ref?: string;
  next_available_date?: string | null;
}

export interface CheckAvailabilityInput {
  assetId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  /** When updating an existing assignment, pass its id to exclude self. */
  ignoreAssignmentId?: string | null;
}

export async function checkAssetRentalAvailability(
  input: CheckAvailabilityInput,
): Promise<AssetRentalAvailability> {
  if (!input.assetId || !input.startDate || !input.endDate) {
    return { available: false, reason: 'asset_not_found' };
  }
  const { data, error } = await supabase.rpc('asset_rental_check_availability' as never, {
    _asset_id: input.assetId,
    _start: input.startDate,
    _end: input.endDate,
    _ignore_assignment: input.ignoreAssignmentId ?? null,
  } as never);
  if (error || !data) {
    return { available: false, reason: 'asset_not_found' };
  }
  return data as AssetRentalAvailability;
}

/** Convenience guard used by tests + UI: returns blocking reason or null. */
export function describeBlock(result: AssetRentalAvailability): string | null {
  if (result.available) return null;
  switch (result.reason) {
    case 'asset_retired': return 'الأصل مُسحوب من الخدمة';
    case 'asset_in_maintenance': return 'الأصل تحت الصيانة';
    case 'asset_in_inspection': return 'الأصل تحت الفحص';
    case 'asset_inactive': return 'الأصل غير نشط';
    case 'overlap_conflict': return `تعارض مع تأجير ${result.conflicting_rental_ref ?? ''}`.trim();
    case 'asset_not_found': return 'لم يتم العثور على الأصل';
    default: return 'غير متاح';
  }
}
