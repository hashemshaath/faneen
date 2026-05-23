import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listTopPublicProviders } from "@/modules/businesses";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useMultiJsonLd } from "@/hooks/usePageMeta";
import { useProviderTracking } from "@/hooks/useProviderTracking";
import { Star, ArrowLeft, ArrowRight, MapPin, Crown } from "lucide-react";
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

const ProviderSkeleton = () => (
  <div className="card-ds card-pad-md flex flex-col">
    <div className="flex items-start gap-3 mb-4">
      <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="flex items-center justify-between gap-2 mb-4">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="mt-auto h-9 w-full rounded-xl" />
  </div>
);

export const TopProvidersSection = () => {
  const { language, isRTL } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation();
  const { track } = useProviderTracking();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["top-providers-home"],
    queryFn: () => listTopPublicProviders<Biz>({ limit: 8 }),
  });

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

  return (
    <section ref={sectionRef} className="py-8 sm:py-16 bg-background overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-20 end-10 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 start-10 w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="container-app relative">
        {/* Header — matches other sections */}
        <div className="text-center mb-12 sm:mb-20">
          <span className="section-eyebrow font-body mb-4 sm:mb-5">
            {isRTL ? "الأعلى تقييماً" : "Top Rated"}
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-foreground leading-tight">
            {isRTL ? "مزودو خدمة مميزون" : "Featured Providers"}
          </h2>
          <p className="font-body text-muted-foreground mt-4 sm:mt-6 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            {isRTL
              ? "نخبة من أفضل مزودي الخدمة بناءً على تقييمات حقيقية من العملاء."
              : "A curated selection of top providers based on real customer reviews."}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProviderSkeleton key={i} />)
            : providers.map((biz, i) => {
                const name = language === "ar" ? biz.name_ar : biz.name_en || biz.name_ar;
                const cat = biz.categories ? (language === "ar" ? biz.categories.name_ar : biz.categories.name_en) : null;
                const city = biz.cities ? (language === "ar" ? biz.cities.name_ar : biz.cities.name_en) : null;
                const isPremium = biz.membership_tier === "premium" || biz.membership_tier === "enterprise";

                return (
                  <Link
                    key={biz.id}
                    to={`/${biz.username}`}
                    onClick={() => track("card_click", biz.id, biz.username)}
                    className={`card-ds card-interactive card-pad-md group relative flex flex-col hover:shadow-primary/5 hover-lift ${
                      isVisible ? "animate-card-slide-up" : "opacity-0"
                    }`}
                    style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}
                  >
                    {/* Header row */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative shrink-0">
                        <Avatar className="w-14 h-14 rounded-2xl ring-2 ring-border/40 group-hover:ring-primary/30 transition-all">
                          <AvatarImage src={biz.logo_url || undefined} className="object-cover" />
                          <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-lg">
                            {name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {isPremium && (
                          <span className="absolute -bottom-1 -end-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                            <Crown className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-heading font-bold text-[15px] text-foreground truncate group-hover:text-primary transition-colors">
                            {name}
                          </h3>
                          {biz.is_verified && <VerifiedBadge size="sm" iconOnly />}
                        </div>
                        {cat && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{cat}</p>
                        )}
                      </div>
                    </div>

                    {/* Rating + city */}
                    <div className="flex items-center justify-between gap-2 mb-4 text-xs">
                      <div className="inline-flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                        <span className="font-bold text-foreground tabular-nums tech-content">
                          {Number(biz.rating_avg).toFixed(1)}
                        </span>
                        <span className="text-muted-foreground tabular-nums tech-content">
                          ({biz.rating_count})
                        </span>
                      </div>
                      {city && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{city}</span>
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <span className="mt-auto flex items-center justify-center gap-1.5 w-full py-2.5 text-xs rounded-xl font-semibold bg-muted/40 dark:bg-muted/15 text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      {isRTL ? "عرض الملف" : "View Profile"}
                      <ArrowIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
        </div>

        {/* Footer CTA */}
        <div className="mt-10 sm:mt-12 text-center">
          <Link to="/search">
            <Button
              onClick={() => track("view_all_click")}
              variant="outline"
              size="lg"
              className="gap-2 rounded-xl h-12 px-6 hover:border-primary/40 hover:text-primary hover:bg-primary/5"
            >
              {isRTL ? "عرض جميع المزودين" : "View All Providers"}
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
