import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useMultiJsonLd } from "@/hooks/usePageMeta";
import { useProviderTracking } from "@/hooks/useProviderTracking";
import {
  Star, ArrowLeft, ArrowRight, MapPin, Crown, Sparkles,
  ShieldCheck, Trophy, Medal, Flame, ChevronRight, Quote,
  Building2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";

type Biz = {
  id: string; username: string; name_ar: string; name_en: string;
  logo_url: string | null; rating_avg: number; rating_count: number;
  membership_tier: string | null; is_verified: boolean; category_id: string | null;
  categories: { name_ar: string; name_en: string } | null;
  cities: { name_ar: string; name_en: string } | null;
};

/* ─────────── Podium card (top 3) ─────────── */
const PodiumCard = ({
  biz, place, isRTL, language, onClick, delay,
}: {
  biz: Biz; place: 1 | 2 | 3; isRTL: boolean; language: "ar" | "en";
  onClick: () => void; delay: number;
}) => {
  const name = language === "ar" ? biz.name_ar : biz.name_en || biz.name_ar;
  const cat = biz.categories ? (language === "ar" ? biz.categories.name_ar : biz.categories.name_en) : null;
  const city = biz.cities ? (language === "ar" ? biz.cities.name_ar : biz.cities.name_en) : null;
  const isPremium = biz.membership_tier === "premium" || biz.membership_tier === "enterprise";

  const config = {
    1: {
      height: "lg:h-[420px]",
      ring: "ring-amber-400/50",
      glow: "shadow-[0_30px_80px_-20px_hsl(45_95%_55%/0.45)]",
      bg: "from-amber-400/15 via-amber-300/5 to-transparent dark:from-amber-400/20",
      crown: "from-amber-400 to-yellow-500 text-amber-950",
      label: isRTL ? "البطل" : "Champion",
      icon: <Trophy className="w-5 h-5" strokeWidth={2.5} />,
      avatarSize: "w-28 h-28",
      ribbon: "h-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500",
    },
    2: {
      height: "lg:h-[380px]",
      ring: "ring-slate-300/50 dark:ring-slate-400/40",
      glow: "shadow-[0_20px_60px_-20px_hsl(220_10%_60%/0.4)]",
      bg: "from-slate-300/15 via-slate-200/5 to-transparent dark:from-slate-500/15",
      crown: "from-slate-300 to-slate-400 text-slate-800",
      label: isRTL ? "الوصيف" : "Runner-up",
      icon: <Medal className="w-4 h-4" strokeWidth={2.5} />,
      avatarSize: "w-24 h-24",
      ribbon: "h-2.5 bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400",
    },
    3: {
      height: "lg:h-[360px]",
      ring: "ring-orange-400/40",
      glow: "shadow-[0_20px_60px_-20px_hsl(25_90%_55%/0.35)]",
      bg: "from-orange-400/12 via-orange-300/5 to-transparent dark:from-orange-500/15",
      crown: "from-orange-400 to-amber-600 text-orange-950",
      label: isRTL ? "الثالث" : "Third",
      icon: <Medal className="w-4 h-4" strokeWidth={2.5} />,
      avatarSize: "w-22 h-22",
      ribbon: "h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500",
    },
  }[place];

  return (
    <Link
      to={`/${biz.username}`}
      onClick={onClick}
      className={`group relative flex flex-col items-center text-center rounded-[2rem] bg-card border border-border/40 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-accent/40 ${config.glow} animate-card-slide-up`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* Top ribbon */}
      <div className={`w-full ${config.ribbon}`} />

      {/* Decorative bg */}
      <div className={`absolute inset-x-0 top-0 h-48 bg-gradient-to-b ${config.bg} pointer-events-none`} />
      <div className="absolute inset-0 opacity-[0.25] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--accent)/0.5)_1px,transparent_0)] [background-size:18px_18px] pointer-events-none" />

      {/* Place badge */}
      <div className={`relative z-10 mt-6 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-br ${config.crown} font-black text-xs shadow-lg`}>
        {config.icon}
        <span className="tabular-nums tech-content">#{place}</span>
        <span className="hidden sm:inline">· {config.label}</span>
      </div>

      {/* Avatar */}
      <div className="relative z-10 mt-5 mb-4">
        <div className={`absolute inset-0 rounded-3xl blur-2xl opacity-40 bg-gradient-to-br ${config.crown}`} />
        <Avatar className={`relative ${config.avatarSize} rounded-3xl ring-4 ${config.ring} shadow-2xl transition-transform duration-500 group-hover:scale-105`}>
          <AvatarImage src={biz.logo_url || undefined} className="object-cover" />
          <AvatarFallback className="rounded-3xl text-3xl font-bold bg-gradient-to-br from-accent/15 to-accent/5 text-accent">
            {name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {isPremium && (
          <span className="absolute -bottom-1 -end-1 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground shadow-lg ring-4 ring-card">
            <Crown className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Name */}
      <div className="relative z-10 px-6 w-full">
        <div className="flex items-center justify-center gap-1.5">
          <h3 className={`font-heading font-bold ${place === 1 ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"} text-foreground truncate group-hover:text-accent transition-colors`}>
            {name}
          </h3>
          {biz.is_verified && <VerifiedBadge size="sm" iconOnly />}
        </div>
        {cat && <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{cat}</p>}

        {/* Stars */}
        <div className="flex items-center justify-center gap-0.5 mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`${place === 1 ? "w-4 h-4" : "w-3.5 h-3.5"} ${i < Math.round(biz.rating_avg) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`}
            />
          ))}
        </div>

        {/* Rating */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/40">
          <span className="text-base font-black text-foreground tabular-nums tech-content">
            {Number(biz.rating_avg).toFixed(1)}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums tech-content">
            ({biz.rating_count} {isRTL ? "تقييم" : "reviews"})
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-auto w-full p-5 pt-4 flex items-center justify-between gap-2">
        {city ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {city}
          </span>
        ) : <span />}
        <span className="inline-flex items-center gap-1 text-xs font-bold text-accent group-hover:gap-2 transition-all">
          {isRTL ? "زيارة" : "Visit"}
          {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </span>
      </div>
    </Link>
  );
};

/* ─────────── Leaderboard row (rank 4+) ─────────── */
const LeaderRow = ({
  biz, rank, isRTL, language, onClick, delay, isMostReviewed,
}: {
  biz: Biz; rank: number; isRTL: boolean; language: "ar" | "en";
  onClick: () => void; delay: number; isMostReviewed: boolean;
}) => {
  const name = language === "ar" ? biz.name_ar : biz.name_en || biz.name_ar;
  const cat = biz.categories ? (language === "ar" ? biz.categories.name_ar : biz.categories.name_en) : null;
  const city = biz.cities ? (language === "ar" ? biz.cities.name_ar : biz.cities.name_en) : null;
  const isPremium = biz.membership_tier === "premium" || biz.membership_tier === "enterprise";

  return (
    <Link
      to={`/${biz.username}`}
      onClick={onClick}
      className="group relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-3.5 rounded-2xl bg-card border border-border/40 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5 transition-all duration-300 animate-card-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* Rank number */}
      <div className="shrink-0 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/40 group-hover:bg-accent/10 group-hover:border-accent/30 group-hover:text-accent transition-colors">
        <span className="text-sm font-black text-muted-foreground group-hover:text-accent tabular-nums tech-content">
          {rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ring-2 ring-border/40 group-hover:ring-accent/30 transition-all">
          <AvatarImage src={biz.logo_url || undefined} className="object-cover" />
          <AvatarFallback className="rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 text-accent font-bold">
            {name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {isPremium && (
          <span className="absolute -bottom-1 -end-1 flex items-center justify-center w-4 h-4 rounded-full bg-accent text-accent-foreground ring-2 ring-card">
            <Crown className="w-2 h-2" />
          </span>
        )}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="font-heading font-bold text-sm sm:text-[15px] text-foreground truncate group-hover:text-accent transition-colors">
            {name}
          </h4>
          {biz.is_verified && <VerifiedBadge size="sm" iconOnly />}
          {isMostReviewed && (
            <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold border border-orange-500/20 shrink-0">
              <Flame className="w-2.5 h-2.5" />
              {isRTL ? "نشط" : "Hot"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground mt-0.5 min-w-0">
          {cat && <span className="truncate">{cat}</span>}
          {cat && city && <span className="text-muted-foreground/40">·</span>}
          {city && (
            <span className="inline-flex items-center gap-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              {city}
            </span>
          )}
        </div>
      </div>

      {/* Rating */}
      <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
        <span className="text-xs font-bold text-foreground tabular-nums tech-content leading-none">
          {Number(biz.rating_avg).toFixed(1)}
        </span>
        <span className="hidden sm:inline text-[10px] text-muted-foreground tabular-nums tech-content leading-none">
          ({biz.rating_count})
        </span>
      </div>

      <ChevronRight className={`w-4 h-4 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all shrink-0 ${isRTL ? "rotate-180" : ""}`} />
    </Link>
  );
};

/* ─────────── Skeletons ─────────── */
const PodiumSkeleton = ({ h }: { h: string }) => (
  <div className={`rounded-[2rem] bg-card border border-border/40 ${h} flex flex-col items-center p-6`}>
    <Skeleton className="h-7 w-24 rounded-full mb-4" />
    <Skeleton className="w-24 h-24 rounded-3xl mb-4" />
    <Skeleton className="h-5 w-3/4 mb-2" />
    <Skeleton className="h-3 w-1/2 mb-3" />
    <Skeleton className="h-4 w-32 rounded-xl" />
  </div>
);
const RowSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40">
    <Skeleton className="w-11 h-11 rounded-xl" />
    <Skeleton className="w-12 h-12 rounded-2xl" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-2 w-1/2" />
    </div>
    <Skeleton className="h-7 w-14 rounded-lg" />
  </div>
);

/* ═══════════════════════════════════════════ MAIN ═══════════════════════════════════════════ */
export const TopProvidersSection = () => {
  const { language, isRTL } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation();
  const { track } = useProviderTracking();
  const [scope, setScope] = useState<"all" | "verified" | "premium">("all");

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
        .limit(10);
      return (data || []) as unknown as Biz[];
    },
  });

  const filtered = useMemo(() => {
    if (scope === "verified") return providers.filter((p) => p.is_verified);
    if (scope === "premium") return providers.filter((p) => p.membership_tier === "premium" || p.membership_tier === "enterprise");
    return providers;
  }, [providers, scope]);

  const mostReviewedId = useMemo(() => {
    if (!providers.length) return null;
    return [...providers].sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0))[0]?.id;
  }, [providers]);

  const stats = useMemo(() => {
    if (!providers.length) return { avg: 0, total: 0, verified: 0 };
    const total = providers.reduce((s, b) => s + (b.rating_count || 0), 0);
    const avg = providers.reduce((s, b) => s + (Number(b.rating_avg) || 0), 0) / providers.length;
    const verified = providers.filter((b) => b.is_verified).length;
    return { avg, total, verified };
  }, [providers]);

  /* JSON-LD */
  const jsonLdArray = useMemo(() => {
    if (!providers.length) return null;
    const BASE = "https://qitaat.com";
    return [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "مزودو خدمة مميزون — قِطاعات",
      url: `${BASE}/`,
      numberOfItems: providers.length,
      itemListElement: providers.map((biz, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${BASE}/${biz.username}`,
        item: {
          "@type": "LocalBusiness",
          "@id": `${BASE}/${biz.username}#business`,
          name: biz.name_ar || biz.name_en,
          url: `${BASE}/${biz.username}`,
          ...(biz.logo_url && { image: biz.logo_url }),
          ...(biz.categories && { serviceType: biz.categories.name_ar }),
          ...(biz.cities && {
            address: { "@type": "PostalAddress", addressLocality: biz.cities.name_ar, addressCountry: "SA" },
          }),
          ...(biz.rating_count > 0 && {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: Number(biz.rating_avg).toFixed(1),
              reviewCount: biz.rating_count,
              bestRating: 5, worstRating: 1,
            },
          }),
          priceRange: "$$",
        },
      })),
    }];
  }, [providers]);
  useMultiJsonLd(jsonLdArray);

  useEffect(() => {
    if (isVisible && providers.length > 0) track("section_view");
  }, [isVisible, providers.length, track]);

  if (!isLoading && providers.length === 0) return null;

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  // RTL podium order: #2 #1 #3 → rendered visually centered with #1 raised
  // We use grid order utilities: place #2 first col, #1 second (taller), #3 third
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]   // [2,1,3] visually
    : top3;

  return (
    <section ref={sectionRef} className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-background via-muted/[0.15] to-background">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 start-1/4 w-[600px] h-[600px] bg-amber-400/[0.04] rounded-full blur-[160px]" />
        <div className="absolute bottom-0 end-1/4 w-[500px] h-[500px] bg-accent/[0.05] rounded-full blur-[140px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>

      <div className="container px-4 sm:px-6 relative">
        {/* ═══════ HEADER ═══════ */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 via-accent/10 to-amber-500/10 border border-accent/20 backdrop-blur-sm mb-5">
            <Trophy className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
            <span className="text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-amber-600 to-accent bg-clip-text text-transparent">
              {isRTL ? "قاعة المتميزين" : "Hall of Excellence"}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl text-foreground tracking-tight leading-[1.1] mb-4">
            {isRTL ? (
              <>
                مزودو خدمة <span className="bg-gradient-to-r from-amber-500 via-accent to-amber-600 bg-clip-text text-transparent">مميزون</span>
              </>
            ) : (
              <>
                Featured <span className="bg-gradient-to-r from-amber-500 via-accent to-amber-600 bg-clip-text text-transparent">Providers</span>
              </>
            )}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            {isRTL
              ? "أفضل مزودي الخدمة في المملكة، اختيار حقيقي بناءً على تقييمات العملاء ومشاريع منجزة."
              : "The best providers, selected based on real customer reviews and completed projects."}
          </p>

          {/* Quick stats inline */}
          {!isLoading && providers.length > 0 && (
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold tabular-nums tech-content">{stats.avg.toFixed(1)}</span>
                <span className="text-muted-foreground text-xs">{isRTL ? "متوسط" : "avg"}</span>
              </div>
              <div className="w-px h-4 bg-border/60" />
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-accent" />
                <span className="font-bold tabular-nums tech-content">{stats.total.toLocaleString(isRTL ? "ar-SA" : "en-US")}</span>
                <span className="text-muted-foreground text-xs">{isRTL ? "تقييم" : "reviews"}</span>
              </div>
              <div className="w-px h-4 bg-border/60" />
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-bold tabular-nums tech-content">{stats.verified}/{providers.length}</span>
                <span className="text-muted-foreground text-xs">{isRTL ? "موثق" : "verified"}</span>
              </div>
            </div>
          )}

          {/* Scope tabs */}
          {!isLoading && providers.length > 0 && (
            <div className="mt-7 inline-flex items-center bg-muted/50 dark:bg-muted/20 rounded-2xl border border-border/40 p-1 backdrop-blur-sm">
              {([
                { id: "all", label: isRTL ? "الكل" : "All", icon: <Building2 className="w-3.5 h-3.5" /> },
                { id: "verified", label: isRTL ? "موثق" : "Verified", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                { id: "premium", label: isRTL ? "بريميوم" : "Premium", icon: <Crown className="w-3.5 h-3.5" /> },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setScope(opt.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    scope === opt.id
                      ? "bg-card text-accent shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ═══════ PODIUM ═══════ */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:items-end mb-8">
            <PodiumSkeleton h="lg:h-[380px]" />
            <PodiumSkeleton h="lg:h-[420px]" />
            <PodiumSkeleton h="lg:h-[360px]" />
          </div>
        ) : top3.length >= 3 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:items-end mb-10">
            {podiumOrder.map((biz, idx) => {
              // visual idx → real place
              const place = (idx === 0 ? 2 : idx === 1 ? 1 : 3) as 1 | 2 | 3;
              return (
                <PodiumCard
                  key={biz.id}
                  biz={biz}
                  place={place}
                  isRTL={isRTL}
                  language={language as "ar" | "en"}
                  onClick={() => track("card_click", biz.id, biz.username)}
                  delay={place * 100}
                />
              );
            })}
          </div>
        ) : (
          // Fewer than 3: simple row of what we have
          <div className={`grid grid-cols-1 ${top3.length === 2 ? "md:grid-cols-2" : ""} gap-5 mb-10 max-w-4xl mx-auto`}>
            {top3.map((biz, i) => (
              <PodiumCard
                key={biz.id}
                biz={biz}
                place={(i + 1) as 1 | 2 | 3}
                isRTL={isRTL}
                language={language as "ar" | "en"}
                onClick={() => track("card_click", biz.id, biz.username)}
                delay={i * 100}
              />
            ))}
          </div>
        )}

        {/* ═══════ LEADERBOARD (rest) ═══════ */}
        {(isLoading || rest.length > 0) && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {isRTL ? "المراكز التالية" : "Next Rankings"}
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
                : rest.map((biz, i) => (
                    <LeaderRow
                      key={biz.id}
                      biz={biz}
                      rank={i + 4}
                      isRTL={isRTL}
                      language={language as "ar" | "en"}
                      onClick={() => track("card_click", biz.id, biz.username)}
                      delay={i * 60}
                      isMostReviewed={biz.id === mostReviewedId && (biz.rating_count || 0) >= 5}
                    />
                  ))}
            </div>
          </div>
        )}

        {/* Empty filtered state */}
        {!isLoading && providers.length > 0 && filtered.length === 0 && (
          <div className="max-w-md mx-auto mt-10 text-center py-10 px-6 rounded-3xl border border-dashed border-border/60 bg-muted/20">
            <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-base text-foreground mb-1">
              {isRTL ? "لا توجد نتائج" : "No results"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isRTL ? "جرّب تبديل عامل التصفية أعلاه." : "Try switching the filter above."}
            </p>
            <button
              onClick={() => setScope("all")}
              className="text-xs font-bold text-accent hover:underline underline-offset-2"
            >
              {isRTL ? "عرض الكل" : "Show all"}
            </button>
          </div>
        )}

        {/* ═══════ CTA ═══════ */}
        <div className="mt-12 sm:mt-14 text-center">
          <Link to="/search">
            <Button
              onClick={() => track("view_all_click")}
              size="lg"
              className="gap-2 rounded-2xl h-12 px-8 bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-accent-foreground shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 transition-all group"
            >
              {isRTL ? "استكشف جميع المزودين" : "Explore All Providers"}
              {isRTL ? (
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              ) : (
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              )}
            </Button>
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            {isRTL ? "آلاف المزودين بانتظارك في كل قطاع" : "Thousands of providers across every sector"}
          </p>
        </div>
      </div>
    </section>
  );
};
