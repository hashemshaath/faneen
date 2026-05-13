/**
 * Private Sectors microservice — data access layer.
 * Centralized so admin/provider UIs and future surfaces (search, public
 * profile, mobile) all use the same typed entry points.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  PrivateSector, PrivateSectorSpecialization, PrivateSectorDistributor,
  PrivateSectorAuditEntry, PrivateSectorStatus, PrivateSectorLinkStatus,
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
  const { data, error } = await supabase.from(TABLE).update(patch as never).eq('id', id).select().single();
  if (error) throw error;
  return data as PrivateSector;
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