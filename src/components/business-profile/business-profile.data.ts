import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPublicBusinessByUsername } from "@/modules/businesses";
import {
  listServicesByBusiness,
  listBranchesByBusiness,
} from "@/modules/catalog";
import type { Database } from "@/integrations/supabase/types";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type CityRow = Database["public"]["Tables"]["cities"]["Row"];
type CountryRow = Database["public"]["Tables"]["countries"]["Row"];
type ServiceRow = Database["public"]["Tables"]["business_services"]["Row"];
type BranchRow = Database["public"]["Tables"]["business_branches"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type PortfolioItemRow = Database["public"]["Tables"]["portfolio_items"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

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
  categories: Pick<CategoryRow, "name_ar" | "name_en"> | null;
  cities: Pick<CityRow, "name_ar" | "name_en"> | null;
};

type BranchWithJoins = BranchRow & {
  cities: Pick<CityRow, "name_ar" | "name_en"> | null;
  countries: Pick<CountryRow, "name_ar" | "name_en"> | null;
};

export type BusinessWithJoins = BusinessRow & {
  categories: CategoryRow | null;
  cities: CityRow | null;
  countries: CountryRow | null;
};

export const tierConfig: Record<string, { label: string; labelAr: string; color: string }> = {
  enterprise: { label: "Enterprise", labelAr: "مؤسسي", color: "bg-accent text-accent-foreground" },
  premium: { label: "Premium", labelAr: "مميز", color: "bg-accent/80 text-accent-foreground" },
};

// PERF-1D.3 — Explicit parent select replaces `*, categories(*), cities(*), countries(*)`.
// Every column listed is referenced by either BusinessProfile.tsx (LocalBusiness JSON-LD,
// SEO meta, contact mutation, preview banner, lead-context data attrs) or by the
// BusinessProfileHeader / BusinessProfileTabs (contact + branches/services/reviews tabs).
// Joined relations are trimmed to the fields actually consumed:
//   categories — name_ar/_en for label, slug for breadcrumb + lead-context
//   cities     — name_ar/_en for label, slug for lead-context
//   countries  — name_ar/_en for label, code for PostalAddress.addressCountry
const PUBLIC_BUSINESS_SELECT =
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
  // address (Contact tab + JSON-LD PostalAddress)
  'address, region, district, street_name, building_number, additional_number, ' +
  // geo (Contact tab map + JSON-LD GeoCoordinates)
  'latitude, longitude, ' +
  // contact channels (Contact tab; phone/email intentionally omitted from JSON-LD
  // but still rendered client-side behind the reveal flow)
  'contact_person, phone, mobile, unified_number, customer_service_phone, email, ' +
  // trimmed joins
  'categories(name_ar, name_en, slug), ' +
  'cities(name_ar, name_en, slug), ' +
  'countries(name_ar, name_en, code)';

export const useBusinessByUsername = (username: string) =>
  useQuery({
    queryKey: ["business", username],
    queryFn: async () => {
      const { data, error } = await getPublicBusinessByUsername<BusinessWithJoins>({
        username,
        select: PUBLIC_BUSINESS_SELECT,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });

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
  });

export const useProjects = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["business-projects", businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        // PERF-1D.3 — explicit parent select; joins were already trimmed.
        // Fields cover everything ProjectsTab renders (cover, title, description,
        // featured badge, duration, cost + currency, city/category labels).
        .select(
          "id, title_ar, title_en, description_ar, description_en, " +
          "cover_image_url, is_featured, duration_days, project_cost, currency_code, " +
          "categories(name_ar, name_en), cities(name_ar, name_en)"
        )
        .eq("business_id", businessId!)
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<ProjectWithJoins[]>();

      return data ?? [];
    },
    enabled: !!businessId,
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
  });

export const useBranches = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["branches", businessId],
    queryFn: async () => {
      const { data } = await listBranchesByBusiness<BranchWithJoins>({
        businessId: businessId!,
        // PERF-1D.3 — explicit branch fields used by BranchesTab. Joins unchanged.
        // sort_order/is_main filters/order applied server-side by wrapper.
        select:
          "id, name_ar, name_en, is_main, " +
          "district, street_name, building_number, " +
          "contact_person, phone, mobile, unified_number, customer_service_phone, " +
          "email, website, latitude, longitude, " +
          "cities(name_ar, name_en), countries(name_ar, name_en)",
        activeOnly: true,
        order: [
          { column: "is_main", ascending: false },
          { column: "sort_order" },
        ],
      });

      return data ?? [];
    },
    enabled: !!businessId,
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
