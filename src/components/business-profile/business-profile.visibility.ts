import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VisibilityLevel = "public" | "members_only" | "after_request" | "hidden";

export const PROFILE_SECTIONS = [
  "overview",
  "services",
  "projects",
  "portfolio",
  "branches",
  "reviews",
  "contact",
  "phone",
  "email",
  "address",
  "map",
  "requests_as_beneficiary",
  "requests_as_provider",
  "ratings",
  "social",
] as const;

export type ProfileSectionKey = (typeof PROFILE_SECTIONS)[number];

export const SECTION_LABELS: Record<ProfileSectionKey, { ar: string; en: string }> = {
  overview: { ar: "نظرة عامة", en: "Overview" },
  services: { ar: "الخدمات", en: "Services" },
  projects: { ar: "المشاريع", en: "Projects" },
  portfolio: { ar: "معرض الأعمال", en: "Portfolio" },
  branches: { ar: "الفروع", en: "Branches" },
  reviews: { ar: "التقييمات", en: "Reviews" },
  contact: { ar: "التواصل", en: "Contact" },
  phone: { ar: "رقم الهاتف", en: "Phone" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  address: { ar: "العنوان", en: "Address" },
  map: { ar: "الخريطة", en: "Map" },
  requests_as_beneficiary: { ar: "طلبات كمستفيد", en: "Requests (Beneficiary)" },
  requests_as_provider: { ar: "أعمال كمزود", en: "Works (Provider)" },
  ratings: { ar: "متوسط التقييم", en: "Aggregate ratings" },
  social: { ar: "روابط اجتماعية", en: "Social links" },
};

export const LEVEL_LABELS: Record<VisibilityLevel, { ar: string; en: string }> = {
  public: { ar: "ظاهر للعامة", en: "Public" },
  members_only: { ar: "للمسجلين فقط", en: "Members only" },
  after_request: { ar: "بعد طلب التواصل", en: "After contact request" },
  hidden: { ar: "مخفي", en: "Hidden" },
};

export interface VisibilityMap {
  levels: Record<ProfileSectionKey, VisibilityLevel>;
  locks: Partial<Record<ProfileSectionKey, boolean>>;
}

const DEFAULT_LEVELS = PROFILE_SECTIONS.reduce<Record<ProfileSectionKey, VisibilityLevel>>(
  (acc, k) => ({ ...acc, [k]: "public" }),
  {} as Record<ProfileSectionKey, VisibilityLevel>,
);

export const DEFAULT_VISIBILITY: VisibilityMap = { levels: { ...DEFAULT_LEVELS }, locks: {} };

export const useBusinessVisibility = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["business-visibility", businessId],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async (): Promise<VisibilityMap> => {
      const { data, error } = await supabase.rpc("get_business_visibility", {
        _business_id: businessId!,
      });
      if (error) throw error;
      const raw = (data ?? {}) as Partial<VisibilityMap>;
      return {
        levels: { ...DEFAULT_LEVELS, ...(raw.levels ?? {}) } as Record<ProfileSectionKey, VisibilityLevel>,
        locks: (raw.locks ?? {}) as Partial<Record<ProfileSectionKey, boolean>>,
      };
    },
  });

export const useUpdateVisibility = (businessId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      section: ProfileSectionKey;
      level: VisibilityLevel;
      lockedByAdmin?: boolean;
      adminNote?: string | null;
    }) => {
      if (!businessId) throw new Error("missing business");
      const payload: Record<string, unknown> = {
        business_id: businessId,
        section_key: input.section,
        visibility_level: input.level,
      };
      if (typeof input.lockedByAdmin === "boolean") payload.locked_by_admin = input.lockedByAdmin;
      if (typeof input.adminNote !== "undefined") payload.admin_note = input.adminNote;
      const { error } = await supabase
        .from("business_profile_visibility")
        .upsert(payload, { onConflict: "business_id,section_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-visibility", businessId] });
    },
  });
};

export interface PublicRfqRow {
  id: string;
  ref_id: string | null;
  title: string;
  industry: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  deadline: string | null;
  status: string;
  created_at: string;
}

export const useBusinessPublicRfqs = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["business-public-rfqs", businessId],
    enabled: !!businessId,
    staleTime: 30_000,
    queryFn: async (): Promise<PublicRfqRow[]> => {
      const { data, error } = await supabase.rpc("list_business_public_rfqs", {
        _business_id: businessId!,
      });
      if (error) throw error;
      return (data ?? []) as PublicRfqRow[];
    },
  });

/** Helper: determines whether a section should render for the current viewer. */
export const canViewSection = (
  level: VisibilityLevel,
  ctx: { isAuthenticated: boolean; isOwner: boolean; isAdmin: boolean; hasRequested?: boolean },
): boolean => {
  if (ctx.isOwner || ctx.isAdmin) return true;
  switch (level) {
    case "public":
      return true;
    case "members_only":
      return ctx.isAuthenticated;
    case "after_request":
      return !!ctx.hasRequested;
    case "hidden":
    default:
      return false;
  }
};