/**
 * Phase 1 of admin-`any` reduction for AdminBusinesses.tsx.
 *
 * Small, narrow types used only inside the AdminBusinesses screen.
 * These describe shapes we read/write in the admin form so we can
 * stop sprinkling `as any` over a handful of join columns and
 * callback parameters. No runtime behavior; types only.
 */

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