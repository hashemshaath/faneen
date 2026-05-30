/**
 * BRANDS-GOVERNANCE-1 — single Supabase access point for brands.
 * Pages/components must import from `@/modules/brands` only.
 */
import { supabase } from '@/integrations/supabase/client';
import { createNotificationFireAndForget } from '@/modules/notifications';
import type {
  Brand, BrandStatus, BrandRequest, BrandRequestType,
  BrandManufacturingCountry, BrandSectorLink,
  ProviderBrandRelationship, ProviderBrandLink, BrandAuditLogRow,
  BrandRequestStatus,
} from '../types';
import { normalizeArabicBrandName, normalizeEnglishBrandName, generateBrandSlugCandidate } from '../helpers/labels';

// Generated Supabase types lag behind the brands governance migration —
// we cast through `unknown` for the new columns until types refresh.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
const sb: Loose = supabase;

// ------------------------- PUBLIC / PROVIDER READ ------------------------

export async function listApprovedBrands(filters?: {
  sectorId?: string; countryCode?: string; q?: string; limit?: number;
}) {
  let q = sb.from('brands_public').select('*').order('name_ar', { ascending: true });
  if (filters?.sectorId)    q = q.eq('sector_id', filters.sectorId);
  if (filters?.countryCode) q = q.eq('country_of_origin_code', filters.countryCode);
  if (filters?.q) {
    const term = filters.q.trim();
    if (term) q = q.or(`name_ar.ilike.%${term}%,name_en.ilike.%${term}%,slug.ilike.%${term}%`);
  }
  if (filters?.limit) q = q.limit(filters.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Brand[];
}

export async function getBrandBySlug(slug: string) {
  const { data, error } = await sb
    .from('brands_public').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data as Brand | null;
}

// ------------------------------ ADMIN READ -------------------------------

export async function adminListBrands(filters?: {
  status?: BrandStatus | 'all'; sectorId?: string; q?: string;
}) {
  let q = sb.from('brand_catalog').select('*').order('created_at', { ascending: false });
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters?.sectorId) q = q.eq('sector_id', filters.sectorId);
  if (filters?.q) {
    const t = filters.q.trim();
    if (t) q = q.or(`name_ar.ilike.%${t}%,name_en.ilike.%${t}%,slug.ilike.%${t}%,ref_id.ilike.%${t}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Brand[];
}

export async function adminGetBrand(id: string) {
  const { data, error } = await sb
    .from('brand_catalog').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Brand | null;
}

// ----------------------------- ADMIN WRITE -------------------------------

export async function adminCreateBrand(payload: Partial<Brand> & { name_ar: string }) {
  const slug = payload.slug || generateBrandSlugCandidate(payload.name_en ?? null, payload.name_ar);
  const { data, error } = await sb
    .from('brand_catalog')
    .insert({ ...payload, slug, status: payload.status ?? 'approved', source: payload.source ?? 'admin' })
    .select('*').single();
  if (error) throw error;
  return data as Brand;
}

export async function adminUpdateBrand(id: string, patch: Partial<Brand>) {
  const { data, error } = await sb
    .from('brand_catalog').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Brand;
}

export async function adminApproveBrand(id: string) {
  const { data, error } = await supabase.rpc('admin_approve_brand', { _brand_id: id });
  if (error) throw error;
  return data as Brand;
}
export async function adminRejectBrand(id: string, reason: string) {
  const { data, error } = await supabase.rpc('admin_reject_brand', { _brand_id: id, _reason: reason });
  if (error) throw error;
  return data as Brand;
}
export async function adminArchiveBrand(id: string) {
  const { data, error } = await supabase.rpc('admin_archive_brand', { _brand_id: id });
  if (error) throw error;
  return data as Brand;
}
export async function adminMergeBrands(sourceId: string, targetId: string) {
  const { data, error } = await supabase.rpc('admin_merge_brands', {
    _source_id: sourceId, _target_id: targetId,
  });
  if (error) throw error;
  return data as Brand;
}

// ------------------------- MANUFACTURING COUNTRIES -----------------------

export async function listBrandManufacturingCountries(brandId: string) {
  const { data, error } = await sb
    .from('brand_manufacturing_countries').select('*').eq('brand_id', brandId);
  if (error) throw error;
  return (data ?? []) as BrandManufacturingCountry[];
}

export async function setBrandManufacturingCountries(
  brandId: string,
  countries: Array<Omit<BrandManufacturingCountry, 'id' | 'brand_id'>>,
) {
  await sb.from('brand_manufacturing_countries').delete().eq('brand_id', brandId);
  if (countries.length === 0) return;
  const { error } = await sb
    .from('brand_manufacturing_countries')
    .insert(countries.map((c) => ({ ...c, brand_id: brandId })));
  if (error) throw error;
}

// ----------------------------- SECTOR LINKS -----------------------------

export async function listBrandSectors(brandId: string) {
  const { data, error } = await sb
    .from('brand_sector_links').select('*').eq('brand_id', brandId);
  if (error) throw error;
  return (data ?? []) as BrandSectorLink[];
}

export async function setBrandSectors(brandId: string, sectorIds: string[], primary?: string) {
  await sb.from('brand_sector_links').delete().eq('brand_id', brandId);
  if (sectorIds.length === 0) return;
  const rows = sectorIds.map((sid) => ({
    brand_id: brandId, sector_id: sid, is_primary: sid === primary,
  }));
  const { error } = await sb.from('brand_sector_links').insert(rows);
  if (error) throw error;
}

// ------------------------------ REQUESTS --------------------------------

export async function createBrandRequest(payload: {
  request_type: BrandRequestType;
  business_id?: string | null;
  user_id: string;
  name_ar: string;
  name_en?: string | null;
  brand_id?: string | null;
  proposed_country_of_origin_code?: string | null;
  proposed_sector_ids?: string[];
  proposed_service_ids?: string[];
  relationship_type?: ProviderBrandRelationship | null;
  documents?: Array<{ url: string; name?: string }>;
  notes?: string | null;
  sector_id?: string | null;
}) {
  const { data, error } = await sb
    .from('brand_addition_requests')
    .insert({
      request_type: payload.request_type,
      business_id: payload.business_id ?? null,
      user_id: payload.user_id,
      brand_id: payload.brand_id ?? null,
      name_ar: payload.name_ar,
      name_en: payload.name_en ?? null,
      sector_id: payload.sector_id ?? null,
      proposed_country_of_origin_code: payload.proposed_country_of_origin_code ?? null,
      proposed_sector_ids: payload.proposed_sector_ids ?? [],
      proposed_service_ids: payload.proposed_service_ids ?? [],
      relationship_type: payload.relationship_type ?? null,
      documents: payload.documents ?? [],
      notes: payload.notes ?? null,
      status: 'pending',
    })
    .select('*').single();
  if (error) throw error;
  return data as BrandRequest;
}

export async function listMyBrandRequests(userId: string) {
  const { data, error } = await sb
    .from('brand_addition_requests')
    .select('*').eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrandRequest[];
}

export async function adminListBrandRequests(filters?: {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  request_type?: BrandRequestType | 'all';
}) {
  let q = sb
    .from('brand_addition_requests').select('*').order('created_at', { ascending: false });
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters?.request_type && filters.request_type !== 'all') q = q.eq('request_type', filters.request_type);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BrandRequest[];
}

export async function adminApproveBrandRequest(requestId: string) {
  // Resolve request and either create the brand or attach to an existing one.
  const { data: req, error: e1 } = await sb
    .from('brand_addition_requests').select('*').eq('id', requestId).single();
  if (e1) throw e1;

  let brandId: string | null = (req as BrandRequest).brand_id;

  if (!brandId && (req as BrandRequest).request_type === 'create_brand') {
    const created = await adminCreateBrand({
      name_ar: req.name_ar,
      name_en: req.name_en,
      country_of_origin_code: req.proposed_country_of_origin_code,
      sector_id: req.sector_id,
      status: 'approved',
      source: 'provider_request',
    });
    brandId = created.id;
    if ((req as BrandRequest).proposed_sector_ids?.length) {
      await setBrandSectors(brandId, (req as BrandRequest).proposed_sector_ids,
                            (req as BrandRequest).proposed_sector_ids[0]);
    }
  }

  const { error: e2 } = await sb
    .from('brand_addition_requests')
    .update({
      status: 'approved',
      approved_brand_id: brandId,
      brand_id: brandId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (e2) throw e2;

  // Notify requester
  if ((req as BrandRequest).user_id) {
    createNotificationFireAndForget({
      user_id: (req as BrandRequest).user_id,
      title_ar: 'تمت الموافقة على طلب العلامة التجارية',
      title_en: 'Brand request approved',
      body_ar: `طلبك ${req.ref_id ?? ''} لإضافة العلامة "${req.name_ar}" تمت الموافقة عليه.`,
      body_en: `Your request ${req.ref_id ?? ''} for brand "${req.name_ar}" has been approved.`,
      notification_type: 'brand_request_approved',
      reference_type: 'brand_addition_request',
      reference_id: requestId,
    }, '[brand_request_approved]');
  }
  return brandId;
}

export async function adminRejectBrandRequest(requestId: string, reason: string) {
  const { data: req, error: e1 } = await sb
    .from('brand_addition_requests').select('user_id, name_ar, ref_id').eq('id', requestId).single();
  if (e1) throw e1;

  const { error } = await sb
    .from('brand_addition_requests')
    .update({ status: 'rejected', reject_reason: reason, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;

  if (req?.user_id) {
    createNotificationFireAndForget({
      user_id: req.user_id,
      title_ar: 'تم رفض طلب العلامة التجارية',
      title_en: 'Brand request rejected',
      body_ar: `طلبك ${req.ref_id ?? ''} للعلامة "${req.name_ar}" تم رفضه. السبب: ${reason}`,
      body_en: `Your request ${req.ref_id ?? ''} for brand "${req.name_ar}" was rejected. Reason: ${reason}`,
      notification_type: 'brand_request_rejected',
      reference_type: 'brand_addition_request',
      reference_id: requestId,
    }, '[brand_request_rejected]');
  }
}

// ------------------------ DUPLICATE DETECTION ---------------------------

export async function findPossibleDuplicateBrands(payload: {
  name_ar: string; name_en?: string | null;
}) {
  const nAr = normalizeArabicBrandName(payload.name_ar);
  const nEn = payload.name_en ? normalizeEnglishBrandName(payload.name_en) : '';
  const term = nAr.split(' ')[0] || payload.name_ar;
  const enTerm = nEn || (payload.name_en ?? '');
  let or = `name_ar.ilike.%${term}%`;
  if (enTerm) or += `,name_en.ilike.%${enTerm}%`;

  const { data, error } = await sb
    .from('brand_catalog').select('id, ref_id, name_ar, name_en, slug, status')
    .or(or).limit(20);
  if (error) throw error;

  return ((data ?? []) as Array<Pick<Brand, 'id' | 'ref_id' | 'name_ar' | 'name_en' | 'slug' | 'status'>>).filter((row) => {
    const a = normalizeArabicBrandName(row.name_ar ?? '');
    const e = normalizeEnglishBrandName(row.name_en ?? '');
    return a.includes(nAr) || nAr.includes(a) || (!!nEn && (e.includes(nEn) || nEn.includes(e)));
  });
}

// ----------------------- PROVIDER ⇄ SERVICE LINKS -----------------------

/**
 * Links between a business_service and a brand. Used by ServiceBrandsPicker.
 */
export async function listServiceBrandLinks(businessServiceId: string) {
  const { data, error } = await sb
    .from('business_service_brands')
    .select(
      'id, brand_id, brand:brand_catalog!business_service_brands_brand_id_fkey(id, ref_id, name_ar, name_en, logo_url, website, sector_id, is_active, status)',
    )
    .eq('business_service_id', businessServiceId);
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    brand_id: string;
    brand: (Pick<Brand, 'id' | 'ref_id' | 'name_ar' | 'name_en' | 'logo_url' | 'website' | 'sector_id' | 'status'> & { is_active: boolean }) | null;
  }>;
}

/**
 * Search approved brands only (uses brands_public view). Optional sector filter.
 */
export async function searchApprovedBrandsForPicker(args: {
  sectorId: string | null;
  q: string;
  limit?: number;
}) {
  let q = sb
    .from('brands_public')
    .select('id, ref_id, name_ar, name_en, logo_url, website, sector_id')
    .order('name_ar', { ascending: true })
    .limit(args.limit ?? 40);
  if (args.sectorId) q = q.or(`sector_id.eq.${args.sectorId},sector_id.is.null`);
  const term = args.q.trim();
  if (term) q = q.or(`name_ar.ilike.%${term}%,name_en.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Array<
    Pick<Brand, 'id' | 'ref_id' | 'name_ar' | 'name_en' | 'logo_url' | 'website' | 'sector_id'>
  >;
}

export async function linkBrandToService(args: {
  businessServiceId: string;
  businessId: string;
  brandId: string;
}) {
  const { error } = await sb
    .from('business_service_brands')
    .insert({
      business_service_id: args.businessServiceId,
      business_id: args.businessId,
      brand_id: args.brandId,
    });
  if (error) throw error;
}

export async function unlinkBrandFromService(linkId: string) {
  const { error } = await sb.from('business_service_brands').delete().eq('id', linkId);
  if (error) throw error;
}

/**
 * Provider quick-request from the inline ServiceBrandsPicker.
 * Creates a brand_addition_request bound to the business_service and returns the row.
 * The caller may then create a support ticket and call attachTicketRefToBrandRequest.
 */
export async function createServiceBrandRequest(payload: {
  businessId: string;
  userId: string;
  businessServiceId: string;
  sectorId: string | null;
  name_ar: string;
  name_en?: string | null;
  website?: string | null;
}) {
  const { data, error } = await sb
    .from('brand_addition_requests')
    .insert({
      request_type: 'create_brand',
      business_id: payload.businessId,
      user_id: payload.userId,
      business_service_id: payload.businessServiceId,
      sector_id: payload.sectorId,
      name_ar: payload.name_ar,
      name_en: payload.name_en ?? null,
      website: payload.website ?? null,
      status: 'pending',
    })
    .select('id, ref_id')
    .single();
  if (error) throw error;
  return data as { id: string; ref_id: string | null };
}

export async function attachTicketRefToBrandRequest(requestId: string, ticketRefId: string) {
  const { error } = await sb
    .from('brand_addition_requests')
    .update({ ticket_ref_id: ticketRefId })
    .eq('id', requestId);
  if (error) throw error;
}

// ------------------------ ADMIN: SECTORS (read-only) ---------------------

export async function listSectorsLite() {
  const { data, error } = await sb
    .from('sectors')
    .select('id, name_ar, name_en, icon, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string; name_ar: string; name_en: string | null;
    icon: string | null; is_active: boolean;
  }>;
}

// ------------------------ ADMIN: BRAND DETAIL DATA -----------------------

export async function listProviderBrandLinksForBrand(brandId: string) {
  const { data, error } = await sb
    .from('business_service_brands')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProviderBrandLink[];
}

export async function listBrandRequestsForBrand(brandId: string) {
  const { data, error } = await sb
    .from('brand_addition_requests')
    .select('*')
    .or(`brand_id.eq.${brandId},approved_brand_id.eq.${brandId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrandRequest[];
}

export async function listBrandAuditLog(args: {
  brandId?: string; brandRequestId?: string; providerBrandLinkId?: string;
}) {
  let q = sb.from('brand_audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (args.brandId) q = q.eq('brand_id', args.brandId);
  if (args.brandRequestId) q = q.eq('brand_request_id', args.brandRequestId);
  if (args.providerBrandLinkId) q = q.eq('provider_brand_link_id', args.providerBrandLinkId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BrandAuditLogRow[];
}

async function writeBrandAuditLog(payload: {
  brand_id?: string | null;
  brand_request_id?: string | null;
  provider_brand_link_id?: string | null;
  action: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await sb.from('brand_audit_logs').insert({
      brand_id: payload.brand_id ?? null,
      brand_request_id: payload.brand_request_id ?? null,
      provider_brand_link_id: payload.provider_brand_link_id ?? null,
      actor_id: user?.id ?? null,
      action: payload.action,
      old_values: payload.old_values ?? null,
      new_values: payload.new_values ?? null,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[writeBrandAuditLog]', e);
  }
}

// ------------------------ ADMIN: REQUEST DETAIL/STATE --------------------

export async function adminGetBrandRequest(id: string) {
  const { data, error } = await sb
    .from('brand_addition_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as BrandRequest | null;
}

/**
 * Lightweight status transitions used by the admin review queue.
 * Allowed transitions are constrained by the UI to: pending → in_review,
 * any → needs_more_info. Approval/rejection go through the dedicated
 * RPCs / wrappers below so they remain auditable.
 */
export async function adminSetBrandRequestStatus(args: {
  requestId: string;
  status: Extract<BrandRequestStatus, 'in_review' | 'needs_more_info'>;
  adminNote?: string | null;
}) {
  const { data: prev } = await sb
    .from('brand_addition_requests')
    .select('status, user_id, name_ar, name_en, ref_id, brand_id, approved_brand_id')
    .eq('id', args.requestId).maybeSingle();

  const { error } = await sb
    .from('brand_addition_requests')
    .update({
      status: args.status,
      admin_notes: args.adminNote ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', args.requestId);
  if (error) throw error;

  await writeBrandAuditLog({
    brand_request_id: args.requestId,
    brand_id: prev?.brand_id ?? prev?.approved_brand_id ?? null,
    action: `brand_request_${args.status}`,
    old_values: prev ? { status: (prev as { status?: string }).status } : null,
    new_values: { status: args.status, admin_note: args.adminNote ?? null },
  });

  if (prev?.user_id) {
    const isInReview = args.status === 'in_review';
    createNotificationFireAndForget({
      user_id: prev.user_id,
      title_ar: isInReview ? 'طلب علامتك قيد المراجعة' : 'طلب علامتك يحتاج معلومات إضافية',
      title_en: isInReview ? 'Your brand request is in review' : 'Your brand request needs more info',
      body_ar: isInReview
        ? `طلبك ${prev.ref_id ?? ''} للعلامة "${prev.name_ar}" قيد المراجعة الآن.`
        : `طلبك ${prev.ref_id ?? ''} للعلامة "${prev.name_ar}" يحتاج معلومات إضافية. ${args.adminNote ?? ''}`,
      body_en: isInReview
        ? `Your request ${prev.ref_id ?? ''} for brand "${prev.name_ar}" is now in review.`
        : `Your request ${prev.ref_id ?? ''} for brand "${prev.name_ar}" needs more info. ${args.adminNote ?? ''}`,
      notification_type: isInReview ? 'brand_request_in_review' : 'brand_request_needs_more_info',
      reference_type: 'brand_addition_request',
      reference_id: args.requestId,
      action_url: '/admin/brand-requests',
    }, `[brand_request_${args.status}]`);
  }
}

/**
 * Approve a brand_addition_request via the SECURITY DEFINER RPC.
 * Handles brand creation, sector links, optional provider-link, audit log
 * and requester notification. Replaces the legacy JS-side flow that did
 * partial work.
 */
export async function adminApproveBrandRequestRpc(args: {
  requestId: string; adminNote?: string | null;
}) {
  const { data: req, error: e1 } = await sb
    .from('brand_addition_requests').select('*').eq('id', args.requestId).maybeSingle();
  if (e1) throw e1;
  if (!req) throw new Error('request_not_found');

  // Use the SECURITY DEFINER RPC for create_brand requests (it already
  // handles brand insertion + business_service link + ticket update).
  // For other types (claim_brand, link_provider, update_brand, report_duplicate)
  // we update the row directly so admins can resolve them from the queue.
  const isCreateLike = req.request_type === 'create_brand' && req.status === 'pending';
  let approvedBrandId: string | null = (req as BrandRequest).brand_id ?? null;

  if (isCreateLike) {
    const { data, error } = await supabase.rpc('approve_brand_addition_request', {
      p_request_id: args.requestId,
      p_admin_note: args.adminNote ?? null,
    });
    if (error) throw error;
    const row = data as BrandRequest;
    approvedBrandId = row?.brand_id ?? row?.approved_brand_id ?? null;

    // Optional: attach sector links if the requester listed them
    if (approvedBrandId && (req as BrandRequest).proposed_sector_ids?.length) {
      try {
        await setBrandSectors(
          approvedBrandId,
          (req as BrandRequest).proposed_sector_ids,
          (req as BrandRequest).proposed_sector_ids[0],
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[adminApproveBrandRequestRpc setBrandSectors]', e);
      }
    }
  } else {
    // Non-create requests: mark as approved directly and ensure brand_id
    // resolves to either provided brand or the requester's chosen target.
    const { error: e2 } = await sb
      .from('brand_addition_requests')
      .update({
        status: 'approved',
        admin_notes: args.adminNote ?? null,
        reviewed_at: new Date().toISOString(),
        approved_brand_id: approvedBrandId,
      })
      .eq('id', args.requestId);
    if (e2) throw e2;

    // For link_provider, materialise the provider link on the business_service.
    if (req.request_type === 'link_provider' && approvedBrandId
        && req.business_id && req.business_service_id) {
      await sb.from('business_service_brands')
        .insert({
          business_service_id: req.business_service_id,
          business_id: req.business_id,
          brand_id: approvedBrandId,
          relationship_type: req.relationship_type ?? null,
          authorization_status: 'pending',
          submitted_by: req.user_id,
        });
    }
  }

  await writeBrandAuditLog({
    brand_request_id: args.requestId,
    brand_id: approvedBrandId,
    action: 'brand_request_approved',
    old_values: { status: req.status, request_type: req.request_type },
    new_values: { status: 'approved', approved_brand_id: approvedBrandId, admin_note: args.adminNote ?? null },
  });

  if (req.user_id) {
    createNotificationFireAndForget({
      user_id: req.user_id,
      title_ar: 'تمت الموافقة على طلب العلامة التجارية',
      title_en: 'Brand request approved',
      body_ar: `طلبك ${req.ref_id ?? ''} لإضافة العلامة "${req.name_ar}" تمت الموافقة عليه.`,
      body_en: `Your request ${req.ref_id ?? ''} for brand "${req.name_ar}" has been approved.`,
      notification_type: 'brand_request_approved',
      reference_type: 'brand_addition_request',
      reference_id: args.requestId,
      action_url: approvedBrandId ? `/admin/brands/${approvedBrandId}` : '/admin/brand-requests',
    }, '[brand_request_approved]');
  }

  return approvedBrandId;
}

/**
 * Reject a brand_addition_request. Uses RPC for pending rows; falls back
 * to a direct status update for in_review/needs_more_info workflow rows.
 */
export async function adminRejectBrandRequestRpc(args: {
  requestId: string; reason: string;
}) {
  const { data: req, error: e1 } = await sb
    .from('brand_addition_requests')
    .select('id, user_id, name_ar, ref_id, status, brand_id, approved_brand_id')
    .eq('id', args.requestId).maybeSingle();
  if (e1) throw e1;
  if (!req) throw new Error('request_not_found');

  if (req.status === 'pending') {
    const { error } = await supabase.rpc('reject_brand_addition_request', {
      p_request_id: args.requestId, p_reason: args.reason,
    });
    if (error) throw error;
  } else {
    const { error } = await sb
      .from('brand_addition_requests')
      .update({
        status: 'rejected',
        reject_reason: args.reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', args.requestId);
    if (error) throw error;
  }

  await writeBrandAuditLog({
    brand_request_id: args.requestId,
    brand_id: req.brand_id ?? req.approved_brand_id ?? null,
    action: 'brand_request_rejected',
    old_values: { status: req.status },
    new_values: { status: 'rejected', reason: args.reason },
  });

  if (req.user_id) {
    createNotificationFireAndForget({
      user_id: req.user_id,
      title_ar: 'تم رفض طلب العلامة التجارية',
      title_en: 'Brand request rejected',
      body_ar: `طلبك ${req.ref_id ?? ''} للعلامة "${req.name_ar}" تم رفضه. السبب: ${args.reason}`,
      body_en: `Your request ${req.ref_id ?? ''} for brand "${req.name_ar}" was rejected. Reason: ${args.reason}`,
      notification_type: 'brand_request_rejected',
      reference_type: 'brand_addition_request',
      reference_id: args.requestId,
      action_url: '/admin/brand-requests',
    }, '[brand_request_rejected]');
  }
}

// --------------------- PROVIDER BRAND LINK MODERATION --------------------

export async function adminApproveProviderBrandLink(linkId: string) {
  const { data: prev } = await sb
    .from('business_service_brands')
    .select('id, brand_id, business_id, submitted_by')
    .eq('id', linkId).maybeSingle();

  const { error } = await supabase.rpc('admin_approve_provider_brand_link', { _link_id: linkId });
  if (error) throw error;

  await writeBrandAuditLog({
    brand_id: prev?.brand_id ?? null,
    provider_brand_link_id: linkId,
    action: 'provider_brand_link_approved',
    new_values: { link_id: linkId },
  });

  if (prev?.submitted_by) {
    createNotificationFireAndForget({
      user_id: prev.submitted_by,
      title_ar: 'تم اعتماد ربط علامتك التجارية',
      title_en: 'Your brand authorization was approved',
      body_ar: 'تم اعتماد طلب ربط منشأتك بالعلامة التجارية.',
      body_en: 'Your provider–brand authorization request has been approved.',
      notification_type: 'provider_brand_link_approved',
      reference_type: 'business_service_brand',
      reference_id: linkId,
      action_url: '/dashboard/brands',
    }, '[provider_brand_link_approved]');
  }
}

export async function adminRejectProviderBrandLink(linkId: string, reason: string) {
  const { data: prev } = await sb
    .from('business_service_brands')
    .select('id, brand_id, submitted_by')
    .eq('id', linkId).maybeSingle();

  const { error } = await supabase.rpc('admin_reject_provider_brand_link', {
    _link_id: linkId, _reason: reason,
  });
  if (error) throw error;

  await writeBrandAuditLog({
    brand_id: prev?.brand_id ?? null,
    provider_brand_link_id: linkId,
    action: 'provider_brand_link_rejected',
    new_values: { reason },
  });

  if (prev?.submitted_by) {
    createNotificationFireAndForget({
      user_id: prev.submitted_by,
      title_ar: 'تم رفض ربط علامتك التجارية',
      title_en: 'Your brand authorization was rejected',
      body_ar: `تم رفض طلب الربط. السبب: ${reason}`,
      body_en: `Your provider–brand authorization request was rejected. Reason: ${reason}`,
      notification_type: 'provider_brand_link_rejected',
      reference_type: 'business_service_brand',
      reference_id: linkId,
      action_url: '/dashboard/brands',
    }, '[provider_brand_link_rejected]');
  }
}

// ----------------------------- OPS COUNTS --------------------------------

export async function getBrandOpsCounts() {
  const [pendingReq, inReviewReq, needsInfoReq, pendingLinks, duplicateReports] = await Promise.all([
    sb.from('brand_addition_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('brand_addition_requests').select('id', { count: 'exact', head: true }).eq('status', 'in_review'),
    sb.from('brand_addition_requests').select('id', { count: 'exact', head: true }).eq('status', 'needs_more_info'),
    sb.from('business_service_brands').select('id', { count: 'exact', head: true }).eq('authorization_status', 'pending'),
    sb.from('brand_addition_requests').select('id', { count: 'exact', head: true })
      .eq('request_type', 'report_duplicate').eq('status', 'pending'),
  ]);
  return {
    pendingBrandRequests: pendingReq.count ?? 0,
    inReviewBrandRequests: inReviewReq.count ?? 0,
    needsInfoBrandRequests: needsInfoReq.count ?? 0,
    pendingProviderBrandLinks: pendingLinks.count ?? 0,
    pendingDuplicateReports: duplicateReports.count ?? 0,
  };
}

// ----------------------------- BUSINESSES (lookup) -----------------------

export async function lookupBusinessesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await sb
    .from('businesses')
    .select('id, ref_id, name_ar, name_en, username')
    .in('id', ids);
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string; ref_id: string | null;
    name_ar: string | null; name_en: string | null; username: string | null;
  }>;
}
