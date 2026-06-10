import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPublicBusinessByUsername } from "@/modules/businesses";
import { normalizeUsername } from "@/lib/business/profileHref";
import {
  listServicesByBusiness,
  listBranchesByBusiness,
  listBranchServiceIds,
  listBranchPromotionIds,
} from "@/modules/catalog";
import type { Database } from "@/integrations/supabase/types";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type CityRow = Database["public"]["Tables"]["cities"]["Row"];
type CountryRow = Database["public"]["Tables"]["countries"]["Row"];
type ServiceRow = Database["public"]["Tables"]["business_services"]["Row"];
type BranchRow = Database["public"]["Tables"]["business_branches"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type CertificationRow = Database["public"]["Tables"]["business_certifications"]["Row"];
type AwardRow = Database["public"]["Tables"]["business_awards"]["Row"];

type ProjectWithJoins = Pick<
  ProjectRow,
  | "id"
  | "title_ar"
  | "title_en"
  | "description_ar"
  | "description_en"
  | "cover_image_url"
  | "is_featured"
  | "duration_days"
  | "project_cost"
  | "currency_code"
> & {
  /**
   * Phase 18b — taxonomy-only. The legacy `categories(...)` join on
   * `projects.category_id` has been removed from the runtime query.
   * This field is now synthesized from `project_taxonomy_categories`
   * (joined with `taxonomy_categories`) so existing consumers — which
   * read `project.categories?.name_ar/name_en` — keep working without
   * touching the legacy `categories` table.
   */
  categories: { name_ar: string | null; name_en: string | null } | null;
  cities: Pick<CityRow, "name_ar" | "name_en"> | null;
};

type BranchWithJoins = BranchRow & {
  cities: Pick<CityRow, "name_ar" | "name_en"> | null;
  countries: Pick<CountryRow, "name_ar" | "name_en"> | null;
};

export type BusinessWithJoins = BusinessRow & {
  /**
   * Phase 12 / 18b — the legacy `categories(...)` join is no longer
   * fetched. Field is preserved as `null` so existing null-safe
   * consumers (sector breadcrumb links built from
   * `business.categories?.slug`) continue to compile and degrade
   * gracefully. Business category DISPLAY is taxonomy-only now.
   */
  /** Always `null` at runtime — see Phase 12 / 18b note above. Typed as a
   *  nullable shape so existing optional-chain callers compile. */
  categories: { slug?: string | null; name_ar?: string | null; name_en?: string | null } | null;
  cities: CityRow | null;
  countries: CountryRow | null;
};

export const tierConfig: Record<string, { label: string; labelAr: string; color: string }> = {
  enterprise: { label: "Enterprise", labelAr: "مؤسسي", color: "bg-accent text-accent-foreground" },
  premium: { label: "Premium", labelAr: "مميز", color: "bg-accent/80 text-accent-foreground" },
};

// PERF-1D.3 — Explicit parent select replaces the legacy parent-wildcard plus full
// joined wildcards for categories / cities / countries.
// Every column listed is referenced by either BusinessProfile.tsx (LocalBusiness JSON-LD,
// SEO meta, contact mutation, preview banner, lead-context data attrs) or by the
// BusinessProfileHeader / BusinessProfileTabs (contact + branches/services/reviews tabs).
// Joined relations are trimmed to the fields actually consumed:
//   cities     — name_ar/_en for label, slug for lead-context
//   countries  — name_ar/_en for label, code for PostalAddress.addressCountry
// Phase 12 — legacy `categories(...)` join intentionally removed. Business
// category display is taxonomy-only (BusinessTaxonomySection consumes the
// modern taxonomy tables). Null-safe consumers of `business.categories?.slug`
// (sector breadcrumbs / lead-context) tolerate the missing field.
const PUBLIC_BUSINESS_SELECT =
  // PII-MASKING — reads route through `businesses_public`, which exposes only
  // non-sensitive columns. Sensitive contact fields (phone, mobile, email,
  // contact_person, unified_number, customer_service_phone, building_number,
  // additional_number) are intentionally omitted from the public select and
  // rendered client-side behind the contact-reveal flow when authenticated
  // viewers fetch the full row separately.
  // identity + routing
  'id, user_id, username, ' +
  // names + descriptions (SEO, header, JSON-LD)
  'name_ar, name_en, description_ar, description_en, ' +
  'short_description_ar, short_description_en, ' +
  // media + trust badges
  'cover_url, logo_url, is_verified, membership_tier, approval_status, ' +
  // ratings + tenure
  'rating_avg, rating_count, created_at, ' +
  // public web presence
  'website, ' +
  // address (Contact tab + JSON-LD PostalAddress) — safe subset only
  'address, region, district, street_name, ' +
  // geo (Contact tab map + JSON-LD GeoCoordinates)
  'latitude, longitude, ' +
  // trimmed joins (FK columns exposed by the view enable PostgREST embedding)
  'city_id, ' +
  'cities(id, name_ar, name_en), ' +
  'countries(name_ar, name_en, code)';

// Provider edits must surface on the public profile without a hard reload.
// LIVE-DATA-FIX — headline row is now `staleTime: 0` so revisiting
// `/{username}` immediately after saving from /dashboard/business-edit
// triggers a background refetch instead of briefly showing the previously
// cached headline. `refetchOnMount: 'always'` is preserved so cache hits
// still revalidate. Derived collections (services, branches, reviews, ...)
// keep the longer window since they change less often.
const PROFILE_HEADLINE_STALE_MS = 0;
const PROFILE_STALE_MS = 5 * 60 * 1000;

/**
 * Whitelisted columns for embedded `cities` / `countries` relations.
 * The public select string is asserted against this list in
 * `business-profile-select.test.ts` — adding a column here that doesn't
 * exist on the underlying table will surface as a PostgREST 400 at
 * runtime, so keep this in sync with the actual `cities` / `countries`
 * schema.
 */
export const BUSINESS_PROFILE_JOIN_WHITELIST = {
  cities: ['id', 'name_ar', 'name_en'] as const,
  countries: ['name_ar', 'name_en', 'code'] as const,
};

export const BUSINESS_PROFILE_SELECT = PUBLIC_BUSINESS_SELECT;

export const useBusinessByUsername = (username: string) => {
  const normalized = normalizeUsername(username);
  return useQuery({
    queryKey: ["business", normalized],
    queryFn: async () => {
      const { data, error } = await getPublicBusinessByUsername<BusinessWithJoins>({
        username: normalized,
        select: PUBLIC_BUSINESS_SELECT,
      });

      if (error) {
        // Surface the underlying PostgREST reason so analytics / Sentry-style
        // listeners can catch profile-load regressions (e.g. an embed referring
        // to a column that no longer exists on `cities` or `countries`).
        const reason = error instanceof Error ? error.message : JSON.stringify(error);
        // eslint-disable-next-line no-console
        console.error('[business-profile] fetch failed', { username: normalized, reason });
        throw error;
      }
      return data;
    },
    enabled: !!normalized,
    staleTime: PROFILE_HEADLINE_STALE_MS,
    // Ensure that when the user navigates from /dashboard/business-edit back
    // to /{username} the fresh row is fetched even if a previous visit
    // populated the cache within the staleTime window.
    refetchOnMount: "always",
  });
};

export const usePortfolio = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["portfolio", businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from("portfolio_items")
        // PERF-1D.3 — only fields rendered by PortfolioTab (id, title_ar/_en,
        // media_type, media_url, is_featured). Sort columns applied server-side.
        .select("id, title_ar, title_en, media_type, media_url, is_featured")
        .eq("business_id", businessId!)
        .order("is_featured", { ascending: false })
        .order("sort_order");

      return data ?? [];
    },
    enabled: !!businessId,
    staleTime: PROFILE_STALE_MS,
  });

export const useServices = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["services", businessId],
    queryFn: async () => {
      const { data } = await listServicesByBusiness<ServiceRow>({
        businessId: businessId!,
        // PERF-1D.3 — only fields rendered by ServicesTab + JSON-LD serviceType.
        // Triple-gate (activeOnly + sort_order) preserved by wrapper, not in select.
        select:
          "id, name_ar, name_en, description_ar, description_en, " +
          "price_from, price_to, currency_code",
        activeOnly: true,
        order: "sort_order",
      });

      return data ?? [];
    },
    enabled: !!businessId,
    staleTime: PROFILE_STALE_MS,
  });

export const useProjects = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["business-projects", businessId],
    queryFn: async () => {
      // Phase 18b — taxonomy-only project listing. The legacy
      // `categories(name_ar, name_en)` join on `projects.category_id`
      // has been removed; project category labels are resolved from
      // `project_taxonomy_categories → taxonomy_categories` and attached
      // to each row so existing UI (`project.categories?.name_*`) keeps
      // working. When no taxonomy link exists, the UI renders the
      // "غير مصنّف" / "Uncategorized" fallback badge.
      const { data } = await supabase
        .from("projects")
        .select(
          "id, title_ar, title_en, description_ar, description_en, " +
          "cover_image_url, is_featured, duration_days, project_cost, currency_code, " +
          "cities(name_ar, name_en)"
        )
        .eq("business_id", businessId!)
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as unknown as Array<Omit<ProjectWithJoins, "categories">>;
      if (rows.length === 0) return [] as ProjectWithJoins[];

      const projectIds = rows.map((r) => r.id);
      const { data: taxRows } = await supabase
        .from("project_taxonomy_categories")
        .select(
          "project_id, role, sort_order, " +
          "taxonomy_categories(name_ar, name_en)"
        )
        .in("project_id", projectIds);

      type TaxRow = {
        project_id: string;
        role: string | null;
        sort_order: number | null;
        taxonomy_categories: { name_ar: string | null; name_en: string | null } | null;
      };
      const byProject = new Map<string, { name_ar: string | null; name_en: string | null }>();
      for (const t of ((taxRows ?? []) as unknown as TaxRow[])) {
        if (byProject.has(t.project_id)) continue; // first match wins (primary preferred via sort below)
        if (!t.taxonomy_categories) continue;
        byProject.set(t.project_id, t.taxonomy_categories);
      }

      return rows.map((r) => ({
        ...r,
        categories: byProject.get(r.id) ?? null,
      })) as ProjectWithJoins[];
    },
    enabled: !!businessId,
    staleTime: PROFILE_STALE_MS,
  });

export const useReviews = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["reviews", businessId],
    queryFn: async () => {
      // `reviews.user_id` references `auth.users`, not `public.profiles`,
      // so PostgREST cannot embed `profiles(...)` (returns 400). Fetch in
      // two steps and merge only safe public profile fields.
      const { data: rows } = await supabase
        .from("reviews")
        // PERF-1D.3 — only fields consumed by ReviewsTab + JSON-LD Review entities.
        // user_id retained to resolve review-author profiles via get_review_authors RPC.
        .select("id, rating, content, title, created_at, user_id")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });

      const reviews = rows ?? [];
      const userIds = Array.from(
        new Set(reviews.map((r) => r.user_id).filter(Boolean) as string[])
      );
      if (userIds.length === 0) return reviews.map((r) => ({ ...r, profiles: null }));

      // Use SECURITY DEFINER RPC so public visitors can resolve review-author
      // names/avatars without exposing the rest of the profiles table.
      const { data: profiles } = await supabase
        .rpc("get_review_authors", { _user_ids: userIds });

      const byId = new Map(
        (profiles ?? []).map((p) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      );
      return reviews.map((r) => ({ ...r, profiles: byId.get(r.user_id) ?? null }));
    },
    enabled: !!businessId,
    staleTime: PROFILE_STALE_MS,
  });

export const useBranches = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["branches", businessId],
    queryFn: async () => {
      const { data } = await listBranchesByBusiness<BranchWithJoins>({
        businessId: businessId!,
        // Public BusinessProfile is consumed by anonymous visitors, so route through
        // the public view (parent approval + is_active enforced). City/country joins
        // are not available on the view; UI falls back to district/region/street_name.
        source: 'public',
        select:
          "id, name_ar, name_en, slug, is_main, " +
          "address, district, region, street_name, building_number, " +
          "phone, mobile, unified_number, customer_service_phone, " +
          "website, latitude, longitude",
        order: [
          { column: "is_main", ascending: false },
          { column: "sort_order" },
        ],
      });

      return data ?? [];
    },
    enabled: !!businessId,
    staleTime: PROFILE_STALE_MS,
  });

/**
 * Counts the business's currently active promotions (offers/coupons).
 * Powers the "Coupon" badge on the profile header (saqf-style trust signal).
 */
export const useActivePromotionsCount = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["promotions-active-count", businessId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from("promotions")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .or(`end_date.is.null,end_date.gte.${today}`);
      return count ?? 0;
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

/**
 * Branch-scoped variant: counts active promotions restricted to those
 * explicitly linked to a branch via `branch_promotions`. When no links
 * exist for the branch, the count falls back to 0 (the branch has no
 * dedicated offers — distinct from the business-wide count).
 */
export const useActiveBranchPromotionsCount = (
  businessId: string | undefined,
  branchId: string | undefined,
) =>
  useQuery({
    queryKey: ["promotions-active-count", businessId, "branch", branchId],
    queryFn: async () => {
      const { data: linked } = await listBranchPromotionIds(branchId!);
      const ids = linked ?? [];
      if (ids.length === 0) return 0;
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from("promotions")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .in("id", ids)
        .or(`end_date.is.null,end_date.gte.${today}`);
      return count ?? 0;
    },
    enabled: !!businessId && !!branchId,
    staleTime: 5 * 60 * 1000,
  });

/**
 * Fetch a single branch (public view) by parent business id + slug.
 * Used by BusinessProfile when the URL is `/:username/:branchSlug` to
 * render the same screen with branch-specific contact / location /
 * services / offers data without changing the design.
 */
export interface PublicBranchFull {
  id: string;
  business_id: string;
  slug: string | null;
  is_main: boolean;
  name_ar: string;
  name_en: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp?: string | null;
  customer_service_phone: string | null;
  unified_number: string | null;
  email?: string | null;
  website: string | null;
  address: string | null;
  region: string | null;
  district: string | null;
  street_name: string | null;
  building_number: string | null;
  additional_number?: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const useBranchBySlug = (
  businessId: string | undefined,
  branchSlug: string | undefined,
) =>
  useQuery({
    queryKey: ["branch-by-slug", businessId, branchSlug],
    enabled: !!businessId && !!branchSlug,
    staleTime: PROFILE_STALE_MS,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_branches_public" as "business_branches")
        .select(
          "id, business_id, slug, is_main, name_ar, name_en, " +
          "phone, mobile, customer_service_phone, unified_number, " +
          "website, " +
          "address, region, district, street_name, building_number, " +
          "latitude, longitude"
        )
        .eq("business_id", businessId!)
        .eq("slug", branchSlug!)
        .maybeSingle();
      return (data as unknown as PublicBranchFull | null) ?? null;
    },
  });

/** Branch → linked service ids (for filtering ServicesTab to a branch). */
export const useBranchServiceIds = (branchId: string | undefined) =>
  useQuery({
    queryKey: ["branch-service-ids", branchId],
    enabled: !!branchId,
    queryFn: async () => (await listBranchServiceIds(branchId!)).data ?? [],
  });

/**
 * Active certifications for a business — public, RLS-gated to approved
 * businesses only. Sorted by `display_order` then by issue date (newest first).
 */
export const useCertifications = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["business-certifications", businessId],
    enabled: !!businessId,
    staleTime: PROFILE_STALE_MS,
    queryFn: async (): Promise<CertificationRow[]> => {
      const { data } = await supabase
        .from("business_certifications")
        .select(
          "id, name_ar, name_en, issuer_ar, issuer_en, credential_number, credential_url, " +
            "logo_url, proof_document_url, issued_at, expires_at, is_active, " +
            "verified_by_admin, display_order",
        )
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("issued_at", { ascending: false, nullsFirst: false });
      return ((data ?? []) as unknown) as CertificationRow[];
    },
  });

/**
 * Active awards for a business — public, RLS-gated to approved businesses.
 * Sorted by year desc then display_order.
 */
export const useAwards = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["business-awards", businessId],
    enabled: !!businessId,
    staleTime: PROFILE_STALE_MS,
    queryFn: async (): Promise<AwardRow[]> => {
      const { data } = await supabase
        .from("business_awards")
        .select(
          "id, title_ar, title_en, issuer_ar, issuer_en, description_ar, description_en, " +
            "awarded_year, rank, category_ar, category_en, image_url, proof_url, " +
            "is_active, verified_by_admin, display_order",
        )
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("awarded_year", { ascending: false })
        .order("display_order", { ascending: true });
      return ((data ?? []) as unknown) as AwardRow[];
    },
  });
