/**
 * Private Sectors microservice — shared types.
 * A "private sector" is a brand/sub-sector owned by a provider business
 * (e.g. "Saraya Aluminum", "Royal Kitchens", an exclusive agency, etc.)
 * that lives under one of the platform's parent industrial sectors and
 * can carry its own specializations and authorized distributors.
 */
export type PrivateSectorStatus =
  | 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';

export type PrivateSectorBrandType =
  | 'own_brand' | 'exclusive_agency' | 'authorized_dealer'
  | 'distributor' | 'manufacturer';

export type PrivateSectorDistributorRole =
  | 'authorized_dealer' | 'distributor' | 'reseller' | 'agent' | 'showroom';

export type PrivateSectorLinkStatus =
  | 'pending' | 'approved' | 'rejected' | 'revoked';

export interface PrivateSector {
  id: string;
  ref_id: string;
  business_id: string;
  parent_sector: string;
  brand_type: PrivateSectorBrandType;
  name_ar: string;
  name_en: string | null;
  slug: string;
  short_description_ar: string | null;
  short_description_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  logo_url: string | null;
  cover_url: string | null;
  website: string | null;
  country_id: string | null;
  city_id: string | null;
  category_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  established_year: number | null;
  status: PrivateSectorStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  is_featured: boolean;
  sort_order: number;
  seo_title_ar: string | null;
  seo_title_en: string | null;
  seo_description_ar: string | null;
  seo_description_en: string | null;
  seo_keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface PrivateSectorSpecialization {
  id: string;
  ref_id: string;
  sector_id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface PrivateSectorDistributor {
  id: string;
  ref_id: string;
  sector_id: string;
  business_id: string;
  role: PrivateSectorDistributorRole;
  territory_ar: string | null;
  territory_en: string | null;
  since_date: string | null;
  notes: string | null;
  status: PrivateSectorLinkStatus;
  reviewed_at: string | null;
}

export interface PrivateSectorAuditEntry {
  id: string;
  sector_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  actor_user_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface PrivateSectorPublic extends PrivateSector {
  city_name_ar: string | null;
  city_name_en: string | null;
  category_name_ar: string | null;
  category_name_en: string | null;
  category_slug: string | null;
  business_name_ar: string | null;
  business_name_en: string | null;
  business_username: string | null;
}

export const PS_STATUS_META: Record<PrivateSectorStatus, { ar: string; en: string; tone: string }> = {
  draft:     { ar: 'مسودة',         en: 'Draft',     tone: 'bg-muted text-muted-foreground' },
  pending:   { ar: 'قيد المراجعة',  en: 'Pending',   tone: 'bg-warning/15 text-warning border-warning/30' },
  approved:  { ar: 'معتمد',         en: 'Approved',  tone: 'bg-success/15 text-success border-success/30' },
  rejected:  { ar: 'مرفوض',         en: 'Rejected',  tone: 'bg-destructive/15 text-destructive border-destructive/30' },
  suspended: { ar: 'موقوف',         en: 'Suspended', tone: 'bg-muted text-muted-foreground border-border' },
};

export const PS_BRAND_TYPE_META: Record<PrivateSectorBrandType, { ar: string; en: string }> = {
  own_brand:         { ar: 'علامة خاصة',          en: 'Own brand' },
  exclusive_agency:  { ar: 'وكالة حصرية',         en: 'Exclusive agency' },
  authorized_dealer: { ar: 'وكيل معتمد',          en: 'Authorized dealer' },
  distributor:       { ar: 'موزّع',               en: 'Distributor' },
  manufacturer:      { ar: 'مُصنّع',              en: 'Manufacturer' },
};

export const PS_DIST_ROLE_META: Record<PrivateSectorDistributorRole, { ar: string; en: string }> = {
  authorized_dealer: { ar: 'وكيل معتمد', en: 'Authorized dealer' },
  distributor:       { ar: 'موزّع',      en: 'Distributor' },
  reseller:          { ar: 'تاجر تجزئة', en: 'Reseller' },
  agent:             { ar: 'وكيل',       en: 'Agent' },
  showroom:          { ar: 'صالة عرض',   en: 'Showroom' },
};

export const PS_LINK_STATUS_META: Record<PrivateSectorLinkStatus, { ar: string; en: string; tone: string }> = {
  pending:  { ar: 'قيد المراجعة', en: 'Pending',  tone: 'bg-warning/15 text-warning' },
  approved: { ar: 'معتمد',        en: 'Approved', tone: 'bg-success/15 text-success' },
  rejected: { ar: 'مرفوض',        en: 'Rejected', tone: 'bg-destructive/15 text-destructive' },
  revoked:  { ar: 'مُلغى',         en: 'Revoked',  tone: 'bg-muted text-muted-foreground' },
};