import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Star, MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

interface SimilarBusinessesProps {
  currentBusinessId: string;
  cityId?: string | null;
  categorySlug?: string | null;
  cityName?: string;
  categoryName?: string;
}

interface SimilarRow {
  id: string;
  username: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean | null;
  cities: { name_ar: string | null; name_en: string | null } | null;
}

/**
 * SEO + cross-linking: surface up to 6 nearby providers in the same city
 * (falls back to top-rated providers when no city is set). Public data only —
 * reads through `businesses_public`.
 */
export const SimilarBusinesses = ({
  currentBusinessId,
  cityId,
  cityName,
  categoryName,
}: SimilarBusinessesProps) => {
  const { isRTL, language } = useLanguage();

  const { data } = useQuery({
    queryKey: ["business:similar", currentBusinessId, cityId],
    queryFn: async (): Promise<SimilarRow[]> => {
      let query = supabase
        .from("businesses_public")
        .select(
          "id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, cities(name_ar, name_en)"
        )
        .neq("id", currentBusinessId)
        .eq("is_active", true)
        .order("rating_avg", { ascending: false })
        .limit(6);
      if (cityId) query = query.eq("city_id", cityId);
      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as unknown as SimilarRow[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (!data || data.length === 0) return null;

  const heading = isRTL
    ? `منشآت مشابهة${cityName ? ` في ${cityName}` : ""}${categoryName ? ` — ${categoryName}` : ""}`
    : `Similar businesses${cityName ? ` in ${cityName}` : ""}${categoryName ? ` — ${categoryName}` : ""}`;

  return (
    <section
      aria-label={isRTL ? "منشآت مشابهة" : "Similar businesses"}
      className="container mx-auto px-4 mt-6 mb-6"
    >
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-base font-bold mb-4">{heading}</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((b) => {
            const name = (language === "ar" ? b.name_ar : b.name_en || b.name_ar) || "";
            const cn = b.cities ? (language === "ar" ? b.cities.name_ar : b.cities.name_en) : "";
            return (
              <li key={b.id}>
                <Link
                  to={`/${b.username ?? b.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background hover:border-accent/40 hover-lift transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{name.slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{name}</span>
                      {b.is_verified && <VerifiedBadge size="xs" />}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      {typeof b.rating_avg === "number" && b.rating_avg > 0 && (
                        <span className="inline-flex items-center gap-0.5 tech-content">
                          <Star className="w-3 h-3 fill-current text-amber-500" />
                          {Number(b.rating_avg).toFixed(1)}
                          {b.rating_count ? ` (${b.rating_count})` : ""}
                        </span>
                      )}
                      {cn && (
                        <span className="inline-flex items-center gap-0.5 truncate">
                          <MapPin className="w-3 h-3" />
                          {cn}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default SimilarBusinesses;