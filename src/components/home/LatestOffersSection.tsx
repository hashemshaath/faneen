import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Percent, Tag, Clock, Eye } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Skeleton } from "@/components/ui/skeleton";

const OfferSkeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-border bg-card">
    <Skeleton className="aspect-video w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-6 w-24" />
    </div>
  </div>
);

export const LatestOffersSection = () => {
  const { language, isRTL } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation();

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["latest-offers-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promotions")
        .select("*, businesses(username, name_ar, name_en, logo_url)")
        .eq("is_active", true)
        .in("promotion_type", ["offer", "ad"])
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  if (!isLoading && offers.length === 0) return null;

  const formatPrice = (n: number) => n?.toLocaleString();

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 bg-background">
      <div className="container px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <div>
            <span className="text-xs sm:text-sm font-body text-gold font-semibold">
              {isRTL ? "عروض حصرية" : "Exclusive Deals"}
            </span>
            <h2 className="font-heading font-bold text-xl sm:text-3xl md:text-4xl text-foreground mt-1 sm:mt-2">
              {isRTL ? "أحدث العروض والخصومات" : "Latest Offers & Discounts"}
            </h2>
          </div>
          <Link to="/offers">
            <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm">
              {isRTL ? "عرض الكل" : "View All"}
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <OfferSkeleton key={i} />)
          ) : (
            offers.map((offer: any, i: number) => {
              const hasDiscount = offer.discount_percentage || offer.discount_amount;
              const endDate = offer.end_date ? new Date(offer.end_date) : null;
              const isExpiringSoon = endDate && (endDate.getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000;

              return (
                <Link
                  key={offer.id}
                  to={`/offers`}
                  className={`group block ${isVisible ? "animate-fade-in" : ""}`}
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                >
                  <div className="rounded-2xl overflow-hidden border border-border hover:border-gold/40 bg-card transition-all duration-500 hover:shadow-lg hover-scale h-full relative">
                    {hasDiscount && (
                      <div className="absolute top-3 start-3 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <Percent className="w-3 h-3" />
                        {offer.discount_percentage
                          ? `${offer.discount_percentage}%`
                          : `${formatPrice(offer.discount_amount)} ${offer.currency_code}`}
                      </div>
                    )}
                    {isExpiringSoon && (
                      <div className="absolute top-3 end-3 z-10 bg-gold text-secondary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isRTL ? "ينتهي قريباً" : "Ending soon"}
                      </div>
                    )}
                    <div className="aspect-video bg-muted overflow-hidden">
                      {offer.image_url ? (
                        <img
                          src={offer.image_url}
                          alt={language === "ar" ? offer.title_ar : offer.title_en || offer.title_ar}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold/10 to-gold/5 dark:from-gold/5 dark:to-gold/[0.02]">
                          <Tag className="w-10 h-10 text-gold/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 space-y-2">
                      <span className="text-[10px] font-bold text-gold bg-gold/10 dark:bg-gold/15 px-2 py-0.5 rounded-full">
                        {offer.promotion_type === "offer"
                          ? isRTL ? "عرض خاص" : "Special Offer"
                          : isRTL ? "إعلان" : "Ad"}
                      </span>
                      <h3 className="font-heading font-bold text-sm sm:text-base line-clamp-2 group-hover:text-gold transition-colors">
                        {language === "ar" ? offer.title_ar : offer.title_en || offer.title_ar}
                      </h3>
                      {(offer.description_ar || offer.description_en) && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {language === "ar"
                            ? offer.description_ar
                            : offer.description_en || offer.description_ar}
                        </p>
                      )}
                      {(offer.original_price || offer.offer_price) && (
                        <div className="flex items-center gap-2 pt-1">
                          {offer.offer_price && (
                            <span className="text-base sm:text-lg font-bold text-gold">
                              {formatPrice(offer.offer_price)} {offer.currency_code}
                            </span>
                          )}
                          {offer.original_price && (
                            <span className="text-xs sm:text-sm text-muted-foreground line-through">
                              {formatPrice(offer.original_price)}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        {offer.businesses && (
                          <Link
                            to={`/${offer.businesses.username}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs sm:text-sm text-gold font-medium hover:underline"
                          >
                            {offer.businesses.logo_url ? (
                              <img src={offer.businesses.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gold/10 flex items-center justify-center">
                                <Tag className="w-2.5 h-2.5 text-gold" />
                              </div>
                            )}
                            <span className="truncate max-w-[100px] sm:max-w-[120px]">
                              {language === "ar" ? offer.businesses.name_ar : offer.businesses.name_en || offer.businesses.name_ar}
                            </span>
                          </Link>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {offer.views_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
