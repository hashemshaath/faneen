/**
 * Phase 1 + Phase 2 (final-zero) of admin-`any` reduction for
 * AdminBusinesses.tsx.
 *
 * Small, narrow types used only inside the AdminBusinesses screen.
 * They describe shapes we read/write in the admin form so we can
 * stop sprinkling `as any` over join columns, callback parameters,
 * the admin-edit / admin-create form stores, and the two admin
 * Supabase insert payloads (`admin_activity_log`, `portfolio_items`).
 *
 * No runtime behavior; types only.
 */
import type { Database } from '@/integrations/supabase/types';
import type { SaRegionId } from '@/data/sa-regions';

/** Image-pipeline variants persisted on `businesses.{logo,cover}_image_variants`. */
export type AdminBusinessImageVariants = {
  thumbnail?: string;
  card?: string;
  medium?: string;
  hero?: string;
};

/**
 * Phase-2.2 image columns surfaced on the legacy `businesses` row
 * shape. They are written from the admin edit form and read in the
 * cards/table renders for avatar previews.
 */
export type AdminBusinessImageColumns = {
  logo_image_asset_id?: string | null;
  cover_image_asset_id?: string | null;
  logo_image_variants?: AdminBusinessImageVariants | null;
  cover_image_variants?: AdminBusinessImageVariants | null;
};

/** Subset of `businesses` columns consumed by the CSV export helper. */
export type AdminBusinessCsvRow = {
  ref_id?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  membership_tier?: string | null;
  is_verified?: boolean | null;
  is_active?: boolean | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  created_at?: string | null;
};

/** Minimal branch shape used by inline form helpers (main-branch swap). */
export type AdminBusinessBranchLite = {
  id: string;
  is_main?: boolean | null;
  name_ar?: string | null;
};

/** Branch type enum mirrored from the inline create/edit form. */
export type AdminBusinessBranchType =
  | 'main'
  | 'branch'
  | 'warehouse'
  | 'admin_office'
  | 'regional_office'
  | 'head_office';

/** Owner autocomplete row used by the inline owner picker. */
export type AdminBusinessOwnerRow = {
  user_id: string;
  full_name: string | null;
  full_name_ar: string | null;
  full_name_en: string | null;
  email: string | null;
  username: string | null;
  ref_id: string | null;
  avatar_url: string | null;
};

/**
 * Inline create-business form store. Mirrors `emptyCreateForm()` in
 * AdminBusinesses.tsx 1:1 — every field is required because the
 * factory always populates them. Computed-key mutations (`setCField`)
 * still need a single `as AdminCreateBusinessFormState` at the spread
 * boundary because TS widens computed-key object literals.
 */
export interface AdminCreateBusinessFormState {
  owner_mode: 'placeholder' | 'existing' | 'new' | 'invite';
  owner_email: string;
  owner_password: string;
  owner_full_name: string;
  owner_phone: string;
  owner_position: string;
  owner_query: string;
  resolved_user_id: string;
  resolved_owner_label: string;
  resolving_owner: boolean;
  owner_error: string;
  name_ar: string;
  name_en: string;
  username: string;
  username_ok: boolean;
  phone_cc: string;
  phone_national: string;
  email: string;
  city_id: string;
  region_id: SaRegionId | '';
  national_id: string;
  unified_number: string;
  vat_number: string;
  district: string;
  district_en: string;
  street_name: string;
  street_name_en: string;
  building_number: string;
  additional_number: string;
  address: string;
  address_en: string;
}

/**
 * Inline edit-business form store. All fields optional because the
 * store starts empty (`{}`) and is hydrated by `openEdit()` from a
 * `Record<string, unknown>` business row. Field types are kept
 * permissive (string/number/boolean) so Input/Textarea/ImageUpload
 * `value=` bindings stay assignable without per-site coercion.
 */
export interface AdminEditBusinessFormState {
  name_ar?: string;
  name_en?: string;
  short_description_ar?: string;
  short_description_en?: string;
  description_ar?: string;
  description_en?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  country_id?: string;
  city_id?: string;
  logo_url?: string;
  cover_url?: string;
  logo_image_asset_id?: string | null;
  cover_image_asset_id?: string | null;
  logo_image_variants?: AdminBusinessImageVariants | null;
  cover_image_variants?: AdminBusinessImageVariants | null;
  seo_title_ar?: string;
  seo_title_en?: string;
  seo_description_ar?: string;
  seo_description_en?: string;
  seo_keywords?: string;
  og_image?: string;
  national_id?: string;
  additional_number?: string;
  region?: string;
  district?: string;
  street_name?: string;
  building_number?: string;
  region_en?: string;
  district_en?: string;
  street_name_en?: string;
  address_en?: string;
  region_id?: SaRegionId | '';
  latitude?: number | string;
  longitude?: number | string;
  unified_number?: string;
  contact_person?: string;
  mobile?: string;
  customer_service_phone?: string;
  username?: string;
  is_active?: boolean;
  is_verified?: boolean;
  membership_tier?: string;
}

/** Generated Insert row types for the two admin tables this screen writes to. */
export type AdminActivityLogInsert =
  Database['public']['Tables']['admin_activity_log']['Insert'];
export type PortfolioItemInsert =
  Database['public']['Tables']['portfolio_items']['Insert'];

/** Json alias re-export so callers can narrow `details` without re-importing. */
export type AdminJson = Database['public']['Tables']['admin_activity_log']['Row']['details'];