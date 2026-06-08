import { supabase } from '@/integrations/supabase/client';

export interface RentalOpsCounts {
  active: number;
  expiring_soon: number;
  expired: number;
  pending_extensions: number;
  items_pending_review: number;
  items_missing_images: number;
}

export async function getRentalOpsCounts(): Promise<RentalOpsCounts> {
  const [active, soon, expired, ext, pending, noImg] = await Promise.all([
    supabase.from('rental_orders').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('rental_orders').select('id', { count: 'exact', head: true }).eq('status', 'expiring_soon'),
    supabase.from('rental_orders').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
    supabase.from('rental_extensions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('rental_items').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('rental_items').select('id', { count: 'exact', head: true }).eq('images', '[]'),
  ]);
  return {
    active: active.count ?? 0,
    expiring_soon: soon.count ?? 0,
    expired: expired.count ?? 0,
    pending_extensions: ext.count ?? 0,
    items_pending_review: pending.count ?? 0,
    items_missing_images: noImg.count ?? 0,
  };
}