/**
 * Private Sectors microservice — data access layer.
 * Centralized so admin/provider UIs and future surfaces (search, public
 * profile, mobile) all use the same typed entry points.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  PrivateSector, PrivateSectorSpecialization, PrivateSectorDistributor,
  PrivateSectorAuditEntry, PrivateSectorStatus, PrivateSectorLinkStatus,
  PrivateSectorPublic,
} from './types';

const TABLE = 'private_sectors';
const SPEC_TABLE = 'private_sector_specializations';
const DIST_TABLE = 'private_sector_distributors';
const AUDIT_TABLE = 'private_sector_audit_log';

export async function listSectorsForBusiness(businessId: string): Promise<PrivateSector[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PrivateSector[];
}

export async function listAllSectors(filter?: { status?: PrivateSectorStatus | 'all' }): Promise<PrivateSector[]> {
  let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (filter?.status && filter.status !== 'all') q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PrivateSector[];
}

export async function createSector(input: Partial<PrivateSector> & { business_id: string; name_ar: string; parent_sector: string }): Promise<PrivateSector> {
  const { data, error } = await supabase.from(TABLE).insert(input as never).select().single();
  if (error) throw error;
  return data as PrivateSector;
}

export async function updateSector(id: string, patch: Partial<PrivateSector>): Promise<PrivateSector> {
  // Make sure any reason set via setSectorReason() lands on the same RPC connection.
  const { data, error } = await supabase.from(TABLE).update(patch as never).eq('id', id).select().single();
  if (error) throw error;
  return data as PrivateSector;
}

/** Attach a human reason to the next sector mutation in the same session/request. */
export async function setSectorReason(reason: string): Promise<void> {
  if (!reason || !reason.trim()) return;
  const { error } = await supabase.rpc('set_private_sector_reason', { _reason: reason.trim() });
  if (error) throw error;
}

export async function deleteSector(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function submitSector(id: string): Promise<PrivateSector> {
  const { data, error } = await supabase.rpc('submit_private_sector', { _id: id });
  if (error) throw error;
  return data as PrivateSector;
}

export async function reviewSector(id: string, decision: PrivateSectorStatus, reason?: string): Promise<PrivateSector> {
  const { data, error } = await supabase.rpc('review_private_sector', {
    _id: id, _decision: decision, _reason: reason ?? null,
  });
  if (error) throw error;
  return data as PrivateSector;
}

/* Specializations */
export async function listSpecializations(sectorId: string): Promise<PrivateSectorSpecialization[]> {
  const { data, error } = await supabase
    .from(SPEC_TABLE).select('*').eq('sector_id', sectorId).order('sort_order');
  if (error) throw error;
  return (data ?? []) as PrivateSectorSpecialization[];
}

export async function upsertSpecialization(input: Partial<PrivateSectorSpecialization> & { sector_id: string; name_ar: string }): Promise<PrivateSectorSpecialization> {
  const { data, error } = await supabase.from(SPEC_TABLE).upsert(input as never).select().single();
  if (error) throw error;
  return data as PrivateSectorSpecialization;
}

export async function deleteSpecialization(id: string): Promise<void> {
  const { error } = await supabase.from(SPEC_TABLE).delete().eq('id', id);
  if (error) throw error;
}

/* Distributors */
export async function listDistributors(sectorId: string): Promise<PrivateSectorDistributor[]> {
  const { data, error } = await supabase
    .from(DIST_TABLE).select('*').eq('sector_id', sectorId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PrivateSectorDistributor[];
}

export async function addDistributor(input: Partial<PrivateSectorDistributor> & { sector_id: string; business_id: string }): Promise<PrivateSectorDistributor> {
  const { data, error } = await supabase.from(DIST_TABLE).insert(input as never).select().single();
  if (error) throw error;
  return data as PrivateSectorDistributor;
}

export async function reviewDistributor(id: string, decision: PrivateSectorLinkStatus): Promise<PrivateSectorDistributor> {
  const { data, error } = await supabase.rpc('review_private_sector_distributor', { _id: id, _decision: decision });
  if (error) throw error;
  return data as PrivateSectorDistributor;
}

export async function removeDistributor(id: string): Promise<void> {
  const { error } = await supabase.from(DIST_TABLE).delete().eq('id', id);
  if (error) throw error;
}

/* Audit */
export async function listAuditForSector(sectorId: string, limit = 50): Promise<PrivateSectorAuditEntry[]> {
  const { data, error } = await supabase
    .from(AUDIT_TABLE).select('*').eq('sector_id', sectorId)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as PrivateSectorAuditEntry[];
}

export async function listGlobalAudit(limit = 100): Promise<PrivateSectorAuditEntry[]> {
  const { data, error } = await supabase
    .from(AUDIT_TABLE).select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as PrivateSectorAuditEntry[];
}

/* Public catalog */
export interface PublicSectorFilter {
  parent_sector?: string;
  city_id?: string;
  category_id?: string;
  search?: string;
  limit?: number;
}

export async function listPublicSectors(filter: PublicSectorFilter = {}): Promise<PrivateSectorPublic[]> {
   
  let q: any = supabase.from('private_sectors_public').select('*').order('is_featured', { ascending: false }).order('sort_order').order('created_at', { ascending: false });
  if (filter.parent_sector) q = q.eq('parent_sector', filter.parent_sector);
  if (filter.city_id) q = q.eq('city_id', filter.city_id);
  if (filter.category_id) q = q.eq('category_id', filter.category_id);
  if (filter.search?.trim()) {
    const s = filter.search.trim();
    q = q.or(`name_ar.ilike.%${s}%,name_en.ilike.%${s}%,slug.ilike.%${s}%`);
  }
  q = q.limit(filter.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PrivateSectorPublic[];
}

export async function getPublicSectorBySlug(slug: string): Promise<PrivateSectorPublic | null> {
  const { data, error } = await supabase.from('private_sectors_public').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return (data as PrivateSectorPublic | null) ?? null;
}