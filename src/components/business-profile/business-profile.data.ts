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

export type BusinessWithJoins = BusinessRow & {
  categories: CategoryRow | null;
  cities: CityRow | null;
  countries: CountryRow | null;
};

export const tierConfig: Record<string, { label: string; labelAr: string; color: string }> = {
  enterprise: { label: "Enterprise", labelAr: "مؤسسي", color: "bg-accent text-accent-foreground" },
  premium: { label: "Premium", labelAr: "مميز", color: "bg-accent/80 text-accent-foreground" },
};

export const useBusinessByUsername = (username: string) =>
  useQuery({
    queryKey: ["business", username],
    queryFn: async () => {
      const { data, error } = await getPublicBusinessByUsername<BusinessWithJoins>({
        username,
        select: "*, categories(*), cities(*), countries(*)",
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
        .select("*")
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
      const { data } = await listServicesByBusiness({
        businessId: businessId!,
        select: "*",
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
        .select("*, categories(name_ar, name_en), cities(name_ar, name_en)")
        .eq("business_id", businessId!)
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

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
        .select("*")
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
      const { data } = await listBranchesByBusiness({
        businessId: businessId!,
        select: "*, cities(name_ar, name_en), countries(name_ar, name_en)",
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
