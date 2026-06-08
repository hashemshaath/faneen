import { supabase } from '@/integrations/supabase/client';

export interface RentalOpsCounts {
  active: number;
  expiring_soon: number;
  expired: number;
  overdue: number;
  pending_extensions: number;
  items_pending_review: number;
  items_missing_images: number;
  items_missing_category: number;
  items_low_seo: number;
}

export async function getRentalOpsCounts(): Promise<RentalOpsCounts> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [active, soon, expired, overdue, ext, pending, missing] = await Promise.all([
    supabase.from('rental_orders').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('rental_orders').select('id', { count: 'exact', head: true }).eq('status', 'expiring_soon'),
    supabase.from('rental_orders').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
    supabase.from('rental_orders').select('id', { count: 'exact', head: true })
      .eq('status', 'expired').lt('end_date', todayIso),
    supabase.from('rental_extensions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('rental_items').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.rpc('rental_items_missing_data'),
  ]);
  const m = (missing.data ?? {}) as Record<string, number>;
  return {
    active: active.count ?? 0,
    expiring_soon: soon.count ?? 0,
    expired: expired.count ?? 0,
    overdue: overdue.count ?? 0,
    pending_extensions: ext.count ?? 0,
    items_pending_review: pending.count ?? 0,
    items_missing_images: Number(m.missing_images ?? 0),
    items_missing_category: Number(m.missing_category ?? 0),
    items_low_seo: Number(m.low_seo ?? 0),
  };
}

/**
 * Manual admin trigger for the expiry scan edge function.
 * Returns the function's JSON payload so the admin UI can display counts.
 */
export async function triggerExpiryScan(): Promise<{ ok: boolean; payload: unknown }> {
  try {
    const { data, error } = await supabase.functions.invoke('rental-expiry-scan', { body: {} });
    if (error) return { ok: false, payload: { error: error.message } };
    return { ok: true, payload: data };
  } catch (e) {
    return { ok: false, payload: { error: e instanceof Error ? e.message : 'unknown' } };
  }
}