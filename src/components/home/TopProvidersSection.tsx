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
  Crown,
  TrendingUp,
  Sparkles,
  Filter,
  ShieldCheck,
  ArrowUpRight,
  Award,
  SearchX,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";

/* ── Skeleton ── */
const ProviderSkeleton = () => (
  <div className="rounded-3xl border border-border/40 bg-card overflow-hidden">
    <div className="h-20 bg-gradient-to-br from-muted/50 to-muted/20 dark:from-muted/20 dark:to-muted/5 relative">
      <Skeleton className="absolute -bottom-8 start-5 w-16 h-16 rounded-2xl ring-4 ring-card" />
    </div>
    <div className="px-5 pb-5 pt-10 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-lg" />
        <Skeleton className="h-5 w-14 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
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

/* ── Rank pill (number badge — used for all visible providers) ── */
const RankPill = ({ rank }: { rank: number }) => {
  const isTopThree = rank <= 3;
  const palette = isTopThree
    ? [
        "bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 shadow-amber-400/30",
        "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800 shadow-slate-400/30",
        "bg-gradient-to-br from-orange-400 to-amber-600 text-orange-950 shadow-orange-400/25",
      ][rank - 1]
    : "bg-card/95 backdrop-blur text-muted-foreground border border-border/60 shadow-sm";
  return (
    <span
      className={`absolute top-2.5 start-2.5 z-20 inline-flex items-center gap-1 min-w-[30px] h-7 px-2 rounded-full text-[11px] font-black shadow-lg ${palette}`}
      aria-label={`Rank ${rank}`}
    >
      {isTopThree && <Award className="w-3 h-3" strokeWidth={2.5} />}
      #{rank}
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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8 sm:mb-12">
          <div className="space-y-2.5 sm:space-y-3 max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase text-accent">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-accent/10 ring-1 ring-accent/20">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
              {isRTL ? "الأعلى تقييماً" : "Top Rated"}
              {!isLoading && providers.length > 0 && (
                <span className="ms-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent/10 text-accent text-[10px] font-black tabular-nums tech-content normal-case tracking-normal">
                  {providers.length}
                </span>
              )}
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-foreground tracking-tight leading-[1.15]">
              {isRTL ? "مزودو خدمة مميزون" : "Featured Providers"}
            </h2>
            <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
              {isRTL
                ? "اكتشف أفضل مزودي الخدمة بناءً على تقييمات العملاء الحقيقية والمشاريع المنجزة"
                : "Discover top-rated service providers based on real customer reviews and completed projects"}
            </p>
          </div>
          <Link to="/search" className="self-start sm:self-end shrink-0">
            <Button
              onClick={() => track('view_all_click')}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs sm:text-sm rounded-xl h-10 px-4 border-border/60 hover:border-accent/40 hover:text-accent hover:bg-accent/5 group"
            >
              {isRTL ? "عرض الكل" : "View All"}
              {isRTL ? (
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              )}
            </Button>
          </Link>
        </div>

        {/* Grid */}
        {/* Quick filter chips */}
        {!isLoading && providers.length > 0 && (
          <div className="flex items-center gap-2 mb-6 sm:mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar pb-1">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 me-1 shrink-0">
              <Filter className="w-3 h-3" />
              {isRTL ? "تصفية" : "Filter"}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <FilterChip label={isRTL ? "موثق" : "Verified"} active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)} icon={<ShieldCheck className="w-3 h-3" />} />
              <FilterChip label={isRTL ? "بريميوم" : "Premium"} active={premiumOnly} onClick={() => setPremiumOnly(!premiumOnly)} icon={<Crown className="w-3 h-3" />} />
              {uniqueCategories.length > 0 && <span className="w-px h-5 bg-border/60 mx-0.5" />}
              {uniqueCategories.map((cat) => (
                <FilterChip key={cat.id} label={cat.name} active={activeCategory === cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)} />
              ))}
              {uniqueCities.length > 0 && <span className="w-px h-5 bg-border/60 mx-0.5" />}
              {uniqueCities.map((city) => (
                <FilterChip key={city} label={city} active={activeCity === city} onClick={() => setActiveCity(activeCity === city ? null : city)} icon={<MapPin className="w-2.5 h-2.5" />} />
              ))}
              {hasActiveFilter && (
                <button onClick={() => { setActiveCategory(null); setActiveCity(null); setVerifiedOnly(false); setPremiumOnly(false); }} className="inline-flex items-center text-[11px] font-semibold text-destructive hover:underline underline-offset-2 ms-1 transition-colors shrink-0">
                  {isRTL ? "مسح الكل" : "Clear all"}
                </button>
              )}
            </div>
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
                    aria-label={`${name}${cityName ? ` — ${cityName}` : ''}`}
                    className={`group relative flex flex-col rounded-3xl border bg-card dark:bg-card/60 overflow-hidden transition-all duration-500 hover-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      isPremium
                        ? "border-accent/30 dark:border-accent/20 shadow-md shadow-accent/[0.08] hover:shadow-xl hover:shadow-accent/15 hover:border-accent/50"
                        : isTopThree
                          ? "border-accent/20 dark:border-accent/15 shadow-sm shadow-accent/[0.05] hover:shadow-lg hover:shadow-accent/10 hover:border-accent/35"
                          : "border-border/40 dark:border-border/20 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/25"
                    } ${isVisible ? "animate-card-slide-up" : "opacity-0"}`}
                    style={{
                      animationDelay: `${i * 70}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    {/* Rank pill */}
                    <RankPill rank={rank} />

                    {/* Cover header */}
                    <div className={`relative h-20 overflow-hidden ${
                      isPremium
                        ? "bg-gradient-to-br from-accent/[0.18] via-accent/[0.08] to-transparent dark:from-accent/[0.22] dark:via-accent/[0.10]"
                        : "bg-gradient-to-br from-accent/[0.10] via-accent/[0.04] to-transparent dark:from-accent/[0.14] dark:via-accent/[0.06]"
                    }`}>
                      <div className="absolute inset-0 opacity-[0.35] mix-blend-overlay [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--accent)/0.4)_1px,transparent_0)] [background-size:14px_14px]" />
                      {isPremium && (
                        <Sparkles className="absolute top-3 end-3 w-3.5 h-3.5 text-accent/50 animate-pulse" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                    </div>

                    {/* Body */}
                    <div className="flex flex-col flex-1 px-5 pb-5 pt-0">
                      {/* Overlapping avatar */}
                      <div className="flex items-end justify-between -mt-9 mb-4">
                        <div className="relative">
                          <Avatar className="w-16 h-16 rounded-2xl ring-4 ring-card group-hover:ring-accent/30 transition-all duration-300 shadow-lg group-hover:scale-105">
                            <AvatarImage src={biz.logo_url} className="object-cover" />
                            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-accent/15 to-accent/[0.04] text-accent font-bold text-xl">
                              {name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {isPremium && (
                            <span
                              className="absolute -bottom-1 -end-1 flex items-center justify-center w-5 h-5 rounded-full bg-accent text-accent-foreground shadow-md ring-2 ring-card"
                              title={isRTL ? 'عضوية بريميوم' : 'Premium membership'}
                            >
                              <Crown className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mb-1 px-2 py-1 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/30">
                          <Star className="w-3 h-3 text-accent fill-accent" />
                          <span className="text-xs font-bold text-foreground tabular-nums tech-content leading-none">
                            {Number(biz.rating_avg).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 tabular-nums tech-content leading-none">
                            ({biz.rating_count})
                          </span>
                        </div>
                      </div>

                      {/* Identity */}
                      <div className="mb-3 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-heading font-bold text-[15px] sm:text-base truncate group-hover:text-accent transition-colors">
                            {name}
                          </h3>
                          {biz.is_verified && <VerifiedBadge size="sm" iconOnly />}
                        </div>
                        {catName && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {catName}
                          </p>
                        )}
                      </div>

                      {/* Rating progress */}
                      <div className="mb-4">
                        <RatingBar value={Number(biz.rating_avg)} />
                      </div>

                      {/* Tags row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-4 min-h-[26px] mt-auto">
                        {cityName && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 px-2.5 py-1 rounded-lg border border-border/30">
                            <MapPin className="w-2.5 h-2.5" />
                            {cityName}
                          </span>
                        )}
                        {isPremium && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 h-auto bg-gradient-to-r from-accent/15 to-accent/5 text-accent border border-accent/20 font-semibold gap-1"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            {biz.membership_tier === "enterprise"
                              ? isRTL ? "مؤسسات" : "Enterprise"
                              : isRTL ? "بريميوم" : "Premium"}
                          </Badge>
                        )}
                      </div>

                      {/* CTA */}
                      <span className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-semibold bg-accent/[0.08] text-accent border border-accent/20 group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent group-hover:shadow-md group-hover:shadow-accent/20 transition-all duration-300">
                        {isRTL ? "عرض الملف" : "View Profile"}
                        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
        </div>

        {/* Empty state when filters yield no results */}
        {!isLoading && providers.length > 0 && filtered.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center text-center py-12 px-6 rounded-3xl border border-dashed border-border/60 bg-muted/20">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground mb-3">
              <SearchX className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-base text-foreground mb-1">
              {isRTL ? "لا توجد نتائج مطابقة" : "No matching results"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {isRTL ? "جرّب تعديل عوامل التصفية للعثور على مزودين آخرين." : "Try adjusting the filters to find other providers."}
            </p>
            <button
              onClick={() => { setActiveCategory(null); setActiveCity(null); setVerifiedOnly(false); setPremiumOnly(false); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline underline-offset-2"
            >
              {isRTL ? "مسح كل التصفية" : "Clear all filters"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
