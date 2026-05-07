import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useMultiJsonLd } from "@/hooks/usePageMeta";
import { useProviderTracking } from "@/hooks/useProviderTracking";
import { useEffect } from "react";
import {
  Star,
  ArrowLeft,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Crown,
  TrendingUp,
  Sparkles,
  Filter,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

/* ── Skeleton ── */
const ProviderSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="w-14 h-14 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
  </div>
);

/* ── Rating bar fill ── */
const RatingBar = ({ value }: { value: number }) => (
  <div className="h-1.5 w-full rounded-full bg-muted/60 dark:bg-muted/30 overflow-hidden">
    <div
      className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-700"
      style={{ width: `${(value / 5) * 100}%` }}
    />
  </div>
);

/* ── Rank badge for top 3 ── */
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank > 3) return null;
  const styles = [
    "from-amber-400 to-yellow-500 shadow-amber-400/30 text-amber-950",
    "from-slate-300 to-slate-400 shadow-slate-400/30 text-slate-800",
    "from-orange-400 to-amber-600 shadow-orange-400/25 text-orange-950",
  ];
  return (
    <span
      className={`absolute -top-2 -start-2 z-10 flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br ${styles[rank - 1]} text-[11px] font-black shadow-lg`}
    >
      {rank}
    </span>
  );
};

/* ── Filter chip ── */
const FilterChip = ({
  label, active, onClick, icon,
}: {
  label: string; active: boolean; onClick: () => void; icon?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
      active
        ? "bg-accent/15 text-accent border-accent/30 shadow-sm shadow-accent/10"
        : "bg-muted/30 dark:bg-muted/15 text-muted-foreground border-border/30 dark:border-border/15 hover:bg-muted/50 hover:text-foreground"
    }`}
  >
    {icon}
    {label}
  </button>
);

export const TopProvidersSection = () => {
  const { language, isRTL } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation();
  const { track } = useProviderTracking();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["top-providers-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses_public")
        .select(
          "id, username, name_ar, name_en, logo_url, rating_avg, rating_count, membership_tier, is_verified, category_id, categories(name_ar, name_en), cities(name_ar, name_en)"
        )
        .eq("is_active", true)
        .gt("rating_count", 0)
        .order("rating_avg", { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  /* ── Derive unique categories & cities from loaded data ── */
  const uniqueCategories = useMemo(() => {
    const map = new Map<string, string>();
    providers.forEach((b: any) => {
      if (b.categories && b.category_id) {
        const n = language === "ar" ? b.categories.name_ar : b.categories.name_en;
        if (n) map.set(b.category_id, n);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [providers, language]);

  const uniqueCities = useMemo(() => {
    const map = new Map<string, string>();
    providers.forEach((b: any) => {
      if (b.cities) {
        const n = language === "ar" ? b.cities.name_ar : b.cities.name_en;
        if (n && !map.has(n)) map.set(n, n);
      }
    });
    return Array.from(map.keys());
  }, [providers, language]);

  const filtered = useMemo(() => {
    return providers.filter((b: any) => {
      if (activeCategory && b.category_id !== activeCategory) return false;
      if (activeCity) {
        const cn = b.cities ? (language === "ar" ? b.cities.name_ar : b.cities.name_en) : null;
        if (cn !== activeCity) return false;
      }
      if (verifiedOnly && !b.is_verified) return false;
      if (premiumOnly && !(b.membership_tier === "premium" || b.membership_tier === "enterprise")) return false;
      return true;
    });
  }, [providers, activeCategory, activeCity, verifiedOnly, premiumOnly, language]);

  const hasActiveFilter = !!(activeCategory || activeCity || verifiedOnly || premiumOnly);

  /* ── Structured Data: ItemList + LocalBusiness entries ── */
  const jsonLdArray = useMemo(() => {
    if (!providers.length) return null;
    const BASE = 'https://qitaat.com';
    const itemList: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'مزودو خدمة مميزون — قِطاعات',
      description: 'أفضل مزودي خدمات الألمنيوم والحديد والزجاج بناءً على تقييمات العملاء',
      url: `${BASE}/`,
      numberOfItems: providers.length,
      itemListElement: providers.map((biz: any, idx: number) => {
        const bizName = biz.name_ar || biz.name_en;
        const cityName = biz.cities ? biz.cities.name_ar : undefined;
        const catName = biz.categories ? biz.categories.name_ar : undefined;
        const entry: Record<string, any> = {
          '@type': 'ListItem',
          position: idx + 1,
          url: `${BASE}/${biz.username}`,
          item: {
            '@type': 'LocalBusiness',
            '@id': `${BASE}/${biz.username}#business`,
            name: bizName,
            url: `${BASE}/${biz.username}`,
            ...(biz.logo_url && { image: biz.logo_url }),
            ...(catName && { serviceType: catName }),
            ...(cityName && {
              address: {
                '@type': 'PostalAddress',
                addressLocality: cityName,
                addressCountry: 'SA',
              },
              areaServed: { '@type': 'City', name: cityName },
            }),
            ...(biz.rating_count > 0 && {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: Number(biz.rating_avg).toFixed(1),
                reviewCount: biz.rating_count,
                bestRating: 5,
                worstRating: 1,
              },
            }),
            ...(biz.is_verified && { 'isVerified': true }),
            ...(biz.membership_tier && biz.membership_tier !== 'free' && {
              memberOf: {
                '@type': 'ProgramMembership',
                programName: biz.membership_tier === 'enterprise' ? 'Enterprise' : 'Premium',
              },
            }),
            priceRange: '$$',
          },
        };
        return entry;
      }),
    };
    return [itemList];
  }, [providers]);

  useMultiJsonLd(jsonLdArray);

  // Track section view once visible
  useEffect(() => {
    if (isVisible && providers.length > 0) {
      track('section_view');
    }
  }, [isVisible, providers.length, track]);

  if (!isLoading && providers.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="py-16 sm:py-24 bg-background relative overflow-hidden"
    >
      {/* Decorative blurs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 end-0 w-[500px] h-[500px] bg-accent/[0.04] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-accent/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="container px-4 sm:px-6 relative">
        {/* Header */}
        <div className="flex items-end justify-between mb-10 sm:mb-14">
          <div className="space-y-2 sm:space-y-3">
            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-accent">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-accent/10">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
              {isRTL ? "الأعلى تقييماً" : "Top Rated"}
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-foreground tracking-tight leading-tight">
              {isRTL ? "مزودو خدمة مميزون" : "Featured Providers"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {isRTL
                ? "اكتشف أفضل مزودي الخدمة بناءً على تقييمات العملاء الحقيقية"
                : "Discover top-rated service providers based on real customer reviews"}
            </p>
          </div>
          <Link to="/search">
            <Button
              onClick={() => track('view_all_click')}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs sm:text-sm rounded-xl border-border/60 hover:border-accent/40 hover:text-accent hover:bg-accent/5"
            >
              {isRTL ? "عرض الكل" : "View All"}
              {isRTL ? (
                <ArrowLeft className="w-3.5 h-3.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </Button>
          </Link>
        </div>

        {/* Grid */}
        {/* Quick filter chips */}
        {!isLoading && providers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground me-1">
              <Filter className="w-3 h-3" />
              {isRTL ? "تصفية:" : "Filter:"}
            </span>
            {uniqueCategories.map((cat) => (
              <FilterChip key={cat.id} label={cat.name} active={activeCategory === cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)} />
            ))}
            {uniqueCities.map((city) => (
              <FilterChip key={city} label={city} active={activeCity === city} onClick={() => setActiveCity(activeCity === city ? null : city)} icon={<MapPin className="w-2.5 h-2.5" />} />
            ))}
            <FilterChip label={isRTL ? "موثق" : "Verified"} active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)} icon={<ShieldCheck className="w-3 h-3" />} />
            <FilterChip label={isRTL ? "بريميوم" : "Premium"} active={premiumOnly} onClick={() => setPremiumOnly(!premiumOnly)} icon={<Crown className="w-3 h-3" />} />
            {hasActiveFilter && (
              <button onClick={() => { setActiveCategory(null); setActiveCity(null); setVerifiedOnly(false); setPremiumOnly(false); }} className="text-[11px] text-destructive hover:underline underline-offset-2 ms-1 transition-colors">
                {isRTL ? "مسح الكل" : "Clear all"}
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <ProviderSkeleton key={i} />
              ))
            : filtered.map((biz, i: number) => {
                const name =
                  language === "ar"
                    ? biz.name_ar
                    : biz.name_en || biz.name_ar;
                const catName = biz.categories
                  ? language === "ar"
                    ? biz.categories.name_ar
                    : biz.categories.name_en
                  : null;
                const cityName = biz.cities
                  ? language === "ar"
                    ? biz.cities.name_ar
                    : biz.cities.name_en
                  : null;
                const isPremium =
                  biz.membership_tier === "premium" ||
                  biz.membership_tier === "enterprise";
                const rank = i + 1;
                const isTopThree = rank <= 3;

                return (
                  <Link
                    key={biz.id}
                    to={`/${biz.username}`}
                    onClick={() => track('card_click', biz.id, biz.username)}
                    className={`group relative block rounded-2xl border bg-card dark:bg-card/60 p-5 sm:p-6 transition-all duration-500 sm:hover:-translate-y-2 ${
                      isTopThree
                        ? "border-accent/20 dark:border-accent/15 shadow-sm shadow-accent/[0.04] hover:shadow-xl hover:shadow-accent/10 hover:border-accent/40"
                        : "border-border/40 dark:border-border/20 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/30"
                    } ${isVisible ? "animate-card-slide-up" : "opacity-0"}`}
                    style={{
                      animationDelay: `${i * 70}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    {/* Rank badge */}
                    <RankBadge rank={rank} />

                    {/* Top-3 glow accent line */}
                    {isTopThree && (
                      <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
                    )}

                    {/* Provider identity */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="relative">
                        <Avatar className="w-14 h-14 rounded-2xl ring-2 ring-border/10 group-hover:ring-accent/30 transition-all shadow-sm">
                          <AvatarImage
                            src={biz.logo_url}
                            className="object-cover"
                          />
                          <AvatarFallback className="rounded-2xl bg-gradient-to-br from-accent/10 to-accent/[0.04] text-accent font-bold text-lg">
                            {name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {isPremium && (
                          <span className="absolute -bottom-1 -end-1 flex items-center justify-center w-5 h-5 rounded-full bg-accent text-accent-foreground shadow-md">
                            <Crown className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-heading font-bold text-sm sm:text-[15px] truncate group-hover:text-accent transition-colors">
                            {name}
                          </h3>
                          {biz.is_verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0 fill-accent/10" />
                          )}
                        </div>
                        {catName && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                            {catName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Rating section */}
                    <div className="space-y-2.5 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <Star
                              key={si}
                              className={`w-3.5 h-3.5 transition-colors ${
                                si < Math.round(biz.rating_avg)
                                  ? "text-accent fill-accent"
                                  : "text-muted-foreground/15"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {Number(biz.rating_avg).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            ({biz.rating_count})
                          </span>
                        </div>
                      </div>
                      <RatingBar value={Number(biz.rating_avg)} />
                    </div>

                    {/* Tags footer */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {cityName && (
                        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground bg-muted/40 dark:bg-muted/25 px-2.5 py-1 rounded-lg">
                          <MapPin className="w-2.5 h-2.5" />
                          {cityName}
                        </span>
                      )}
                      {isPremium && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5 h-auto bg-gradient-to-r from-accent/15 to-accent/5 text-accent border-accent/20 font-semibold gap-1"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          {biz.membership_tier === "enterprise"
                            ? isRTL
                              ? "مؤسسات"
                              : "Enterprise"
                            : isRTL
                              ? "بريميوم"
                              : "Premium"}
                        </Badge>
                      )}
                    </div>

                    {/* View profile CTA */}
                    <span className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold bg-accent/10 text-accent border border-accent/20 group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300">
                      <ExternalLink className="w-3 h-3" />
                      {isRTL ? "عرض الملف" : "View Profile"}
                    </span>
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
};
