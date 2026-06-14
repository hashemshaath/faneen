import type { AdminStatusTone } from '@/components/admin/AdminStatusBadge';
import type { BrandDetailsDrawerProps } from './BrandDetailsDrawer';

/**
 * Pure adapter — converts a brand row + summary into props for
 * `BrandDetailsDrawer`. No I/O, no Supabase, no side effects.
 * Page owns `open`/`onClose` and passes them separately.
 */

export type BrandStatusKey =
  | 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'archived' | 'merged';

export type BrandVerificationKey =
  | 'unverified' | 'claimed' | 'verified' | 'official';

const STATUS_TONE: Record<BrandStatusKey, AdminStatusTone> = {
  draft: 'muted',
  pending: 'warning',
  in_review: 'info',
  approved: 'success',
  rejected: 'destructive',
  archived: 'muted',
  merged: 'muted',
};

export interface BrandDrawerInput {
  id: string;
  ref_id: string | null;
  name_ar: string;
  name_en: string | null;
  slug: string | null;
  logo_url: string | null;
  website: string | null;
  status: BrandStatusKey;
  verification_status: BrandVerificationKey;
  is_verified: boolean;
  is_local: boolean;
  sector_id: string | null;
  country_of_origin_code: string | null;
  country_of_origin_name_ar: string | null;
  country_of_origin_name_en: string | null;
  brand_owner_company: string | null;
  founded_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface BrandDrawerLinkSummary {
  business_count?: number | null;
  service_count?: number | null;
  sector_ids?: string[];
}

export interface BrandDrawerLabels {
  statusLabel: string;
  officialLabel?: string | null;
  closeLabel: string;
  detailLabel: string;
  localLabel?: string;
  sectorFieldLabel: string;
  originFieldLabel: string;
  ownerFieldLabel: string;
  foundedFieldLabel: string;
  providersFieldLabel: string;
  sectorsFieldLabel: string;
  createdFieldLabel: string;
  updatedFieldLabel: string;
  websiteFieldLabel: string;
}

export interface BuildBrandDrawerOptions {
  brand: BrandDrawerInput;
  summary?: BrandDrawerLinkSummary;
  locale: 'ar' | 'en';
  sectorLabel?: string | null;
  labels: BrandDrawerLabels;
}

export type BrandDrawerDataProps = Omit<BrandDetailsDrawerProps, 'open' | 'onClose'>;

export function buildBrandDetailsDrawerProps(opts: BuildBrandDrawerOptions): BrandDrawerDataProps {
  const { brand, summary, locale, sectorLabel, labels } = opts;
  const name = locale === 'ar' ? brand.name_ar : (brand.name_en ?? brand.name_ar);
  const countryName = locale === 'ar'
    ? brand.country_of_origin_name_ar
    : (brand.country_of_origin_name_en ?? brand.country_of_origin_name_ar);
  const verificationStatus: 'verified' | 'unverified' =
    (brand.is_verified || brand.verification_status === 'verified' || brand.verification_status === 'official')
      ? 'verified' : 'unverified';
  const providerLinkCount = (summary?.business_count ?? 0) + (summary?.service_count ?? 0);
  const sectorLinkCount = summary?.sector_ids?.length ?? 0;
  return {
    name,
    slug: brand.slug,
    refId: brand.ref_id,
    statusLabel: labels.statusLabel,
    statusTone: STATUS_TONE[brand.status],
    verificationStatus,
    officialLabel: brand.verification_status === 'official' ? (labels.officialLabel ?? null) : null,
    logoUrl: brand.logo_url,
    sectorLabel: sectorLabel ?? null,
    countryCode: brand.country_of_origin_code,
    countryName,
    ownerCompany: brand.brand_owner_company,
    foundedYear: brand.founded_year,
    isLocal: brand.is_local,
    website: brand.website,
    providerLinkCount,
    sectorLinkCount,
    createdAt: brand.created_at,
    updatedAt: brand.updated_at,
    detailHref: `/admin/brands/${brand.slug || brand.id}`,
    closeLabel: labels.closeLabel,
    detailLabel: labels.detailLabel,
    localLabel: labels.localLabel,
    sectorFieldLabel: labels.sectorFieldLabel,
    originFieldLabel: labels.originFieldLabel,
    ownerFieldLabel: labels.ownerFieldLabel,
    foundedFieldLabel: labels.foundedFieldLabel,
    providersFieldLabel: labels.providersFieldLabel,
    sectorsFieldLabel: labels.sectorsFieldLabel,
    createdFieldLabel: labels.createdFieldLabel,
    updatedFieldLabel: labels.updatedFieldLabel,
    websiteFieldLabel: labels.websiteFieldLabel,
  };
}

export default buildBrandDetailsDrawerProps;