import { supabase } from '@/integrations/supabase/client';
import type { RentalItem, RentalItemStatus, ServiceResult } from '../types';

export async function listProviderItems(providerBusinessId: string): Promise<ServiceResult<RentalItem[]>> {
  const { data, error } = await supabase
    .from('rental_items').select('*')
    .eq('provider_business_id', providerBusinessId)
    .order('created_at', { ascending: false });
  return { data: (data as RentalItem[] | null) ?? [], error: error as Error | null };
}

export async function listPublishedItems(opts: { categoryId?: string; cityId?: string } = {}): Promise<ServiceResult<RentalItem[]>> {
  let q = supabase.from('rental_items').select('*')
    .eq('is_published', true).eq('status', 'approved');
  if (opts.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts.cityId) q = q.eq('city_id', opts.cityId);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(100);
  return { data: (data as RentalItem[] | null) ?? [], error: error as Error | null };
}

export async function getItemById(id: string): Promise<ServiceResult<RentalItem>> {
  const { data, error } = await supabase.from('rental_items').select('*').eq('id', id).maybeSingle();
  return { data: data as RentalItem | null, error: error as Error | null };
}

export async function getPublishedItemBySlug(slug: string): Promise<ServiceResult<RentalItem>> {
  const { data, error } = await supabase
    .from('rental_items').select('*')
    .eq('seo_slug', slug)
    .eq('is_published', true).eq('status', 'approved')
    .maybeSingle();
  return { data: data as RentalItem | null, error: error as Error | null };
}

export interface CreateItemInput {
  category_id: string;
  provider_business_id: string;
  name_ar: string;
  name_en?: string;
  description_ar?: string;
  description_en?: string;
  unit: RentalItem['unit'];
  base_price: number;
  min_duration?: number;
  deposit_amount?: number;
  usage_terms?: string;
  late_terms?: string;
  penalty_terms?: string;
  city_id?: string | null;
  images?: string[];
  cover_image_url?: string | null;
  brand?: string | null;
  country_of_manufacture?: string | null;
  condition?: 'new' | 'like_new' | 'good' | 'medium' | 'used' | null;
  specs?: Record<string, unknown>;
}

export async function createItem(input: CreateItemInput): Promise<ServiceResult<RentalItem>> {
  const { data, error } = await supabase
    .from('rental_items')
    .insert({ ...input, status: 'pending_review', is_published: false })
    .select('*').single();
  return { data: data as RentalItem | null, error: error as Error | null };
}

export async function updateItem(id: string, patch: Partial<CreateItemInput> & { availability_status?: string }): Promise<ServiceResult<RentalItem>> {
  const { data, error } = await supabase
    .from('rental_items').update(patch).eq('id', id).select('*').single();
  return { data: data as RentalItem | null, error: error as Error | null };
}

export async function setItemStatus(id: string, status: RentalItemStatus, opts: { publish?: boolean; rejection_reason?: string } = {}): Promise<ServiceResult<RentalItem>> {
  const patch: { status: RentalItemStatus; is_published?: boolean; rejection_reason?: string } = { status };
  if (typeof opts.publish === 'boolean') patch.is_published = opts.publish;
  if (opts.rejection_reason) patch.rejection_reason = opts.rejection_reason;
  const { data, error } = await supabase
    .from('rental_items').update(patch).eq('id', id).select('*').single();
  return { data: data as RentalItem | null, error: error as Error | null };
}