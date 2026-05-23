/**
 * R4A — Domain type re-exports for the businesses module.
 *
 * Single source of truth for downstream pages/components that need the row /
 * insert / update shapes of the `businesses` and `business_staff` tables.
 * No new types — this only re-exports the Supabase-generated types under
 * stable, domain-friendly names so callsites stop reaching into
 * `@/integrations/supabase/types` directly.
 */
import type { Database } from '@/integrations/supabase/types';

export type BusinessRow = Database['public']['Tables']['businesses']['Row'];
export type BusinessInsert = Database['public']['Tables']['businesses']['Insert'];
export type BusinessUpdate = Database['public']['Tables']['businesses']['Update'];

export type BusinessStaffRow = Database['public']['Tables']['business_staff']['Row'];
export type BusinessStaffInsert = Database['public']['Tables']['business_staff']['Insert'];
export type BusinessStaffUpdate = Database['public']['Tables']['business_staff']['Update'];