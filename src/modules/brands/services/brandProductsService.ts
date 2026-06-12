/**
 * Brand Products — central catalog with admin approval workflow.
 * Pages must import from `@/modules/brands` only.
 */
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/modules/identity/services/session';
import type {
  BrandProduct, BrandProductStatus,
  BrandProductRequest, BrandProductRequestStatus,
} from '../types';

// Generated Supabase types lag behind this migration — narrow cast.
type Loose = any;
const sb: Loose = supabase;

// ---------------------------- PUBLIC READS -----------------------------

export async function listApprovedBrandProducts(brandId: string) {
  const { data, error } = await sb
    .from('brand_products')
    .select('*')
    .eq('brand_id', brandId)
    .eq('status', 'approved')
    .order('is_featured', { ascending: false })
    .order('name_ar', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BrandProduct[];
}

// ----------------------------- ADMIN READS -----------------------------

export async function adminListBrandProducts(
  brandId: string,
  filters?: { status?: BrandProductStatus | 'all'; q?: string },
) {
  let q = sb.from('brand_products').select('*').eq('brand_id', brandId)
    .order('created_at', { ascending: false });
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters?.q?.trim()) {
    const term = filters.q.trim();
    q = q.or(`name_ar.ilike.%${term}%,name_en.ilike.%${term}%,model_number.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BrandProduct[];
}

export interface CreateBrandProductPayload {
  brand_id: string;
  name_ar: string;
  name_en?: string | null;
  model_number?: string | null;
  sku?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  category_id?: string | null;
  image_url?: string | null;
  image_asset_id?: string | null;
  image_variants?: Record<string, string>;
  gallery?: Array<{ url: string; alt?: string }>;
  specs?: Record<string, unknown>;
  status?: BrandProductStatus;
  is_featured?: boolean;
}

export async function adminCreateBrandProduct(payload: CreateBrandProductPayload) {
  const { data, error } = await sb.from('brand_products').insert({
    ...payload,
    status: payload.status ?? 'approved',
    gallery: payload.gallery ?? [],
    specs: payload.specs ?? {},
    image_variants: payload.image_variants ?? {},
    source: 'admin',
    approved_at: (payload.status ?? 'approved') === 'approved' ? new Date().toISOString() : null,
  }).select('*').single();
  if (error) throw error;
  return data as BrandProduct;
}

export async function adminUpdateBrandProduct(
  id: string,
  patch: Partial<Omit<BrandProduct, 'id' | 'brand_id' | 'created_at' | 'updated_at'>>,
) {
  const { data, error } = await sb.from('brand_products').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as BrandProduct;
}

export async function adminDeleteBrandProduct(id: string) {
  const { error } = await sb.from('brand_products').delete().eq('id', id);
  if (error) throw error;
}

export async function adminArchiveBrandProduct(id: string) {
  return adminUpdateBrandProduct(id, { status: 'archived' });
}

// -------------------------- PRODUCT REQUESTS ---------------------------

export async function listBrandProductRequests(filters?: {
  brandId?: string; status?: BrandProductRequestStatus | 'all'; businessId?: string;
}) {
  let q = sb.from('brand_product_requests').select('*')
    .order('created_at', { ascending: false });
  if (filters?.brandId) q = q.eq('brand_id', filters.brandId);
  if (filters?.businessId) q = q.eq('business_id', filters.businessId);
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BrandProductRequest[];
}

export interface SubmitBrandProductRequestPayload {
  brand_id: string;
  business_id?: string | null;
  name_ar: string;
  name_en?: string | null;
  model_number?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  category_id?: string | null;
  image_url?: string | null;
  gallery?: Array<{ url: string; alt?: string }>;
  specs?: Record<string, unknown>;
}

export async function submitBrandProductRequest(payload: SubmitBrandProductRequestPayload) {
  const { data: auth } = await getCurrentUser();
  if (!auth?.user?.id) throw new Error('not authenticated');
  const { data, error } = await sb.from('brand_product_requests').insert({
    ...payload,
    requested_by: auth.user.id,
    gallery: payload.gallery ?? [],
    specs: payload.specs ?? {},
    status: 'pending',
  }).select('*').single();
  if (error) throw error;
  return data as BrandProductRequest;
}

export async function adminApproveBrandProductRequest(reqId: string) {
  const { data, error } = await supabase.rpc('admin_approve_brand_product_request', { _req_id: reqId });
  if (error) throw error;
  return data as string;
}

export async function adminRejectBrandProductRequest(reqId: string, reason: string) {
  const { error } = await supabase.rpc('admin_reject_brand_product_request', {
    _req_id: reqId, _reason: reason,
  });
  if (error) throw error;
}

// ------------------------------- LABELS --------------------------------

export const brandProductStatusLabel: Record<BrandProductStatus, { ar: string; en: string }> = {
  draft:    { ar: 'مسودة', en: 'Draft' },
  pending:  { ar: 'قيد المراجعة', en: 'Pending' },
  approved: { ar: 'معتمد', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  archived: { ar: 'مؤرشف', en: 'Archived' },
};

export const brandProductRequestStatusLabel: Record<BrandProductRequestStatus, { ar: string; en: string }> = {
  pending:         { ar: 'قيد الانتظار', en: 'Pending' },
  in_review:       { ar: 'قيد المراجعة', en: 'In review' },
  approved:        { ar: 'معتمد', en: 'Approved' },
  rejected:        { ar: 'مرفوض', en: 'Rejected' },
  needs_more_info: { ar: 'يحتاج معلومات', en: 'Needs info' },
};