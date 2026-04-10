import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const tierConfig: Record<string, { label: string; labelAr: string; color: string }> = {
  enterprise: { label: "Enterprise", labelAr: "مؤسسي", color: "bg-accent text-accent-foreground" },
  premium: { label: "Premium", labelAr: "مميز", color: "bg-accent/80 text-accent-foreground" },
};

export const useBusinessByUsername = (username: string) =>
  useQuery({
    queryKey: ["business", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*, categories(*), cities(*), countries(*)")
        .eq("username", username)
        .eq("is_active", true)
        .maybeSingle();

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
      const { data } = await supabase
        .from("business_services")
        .select("*")
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("sort_order");

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
      const { data } = await supabase
        .from("reviews")
        .select("*, profiles(full_name, avatar_url)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });

      return data ?? [];
    },
    enabled: !!businessId,
  });

export const useBranches = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["branches", businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_branches")
        .select("*, cities(name_ar, name_en), countries(name_ar, name_en)")
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("is_main", { ascending: false })
        .order("sort_order");

      return data ?? [];
    },
    enabled: !!businessId,
  });
