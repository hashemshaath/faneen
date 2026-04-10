import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Star, ArrowLeft, ArrowRight, MapPin, CheckCircle2, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ProviderSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 min-w-[240px]">
    <div className="flex items-center gap-3 mb-3">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-3 w-full mb-2" />
    <div className="flex gap-2">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-12 rounded-full" />
    </div>
  </div>
);

export const TopProvidersSection = () => {
  const { language, isRTL } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['top-providers-home'],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, username, name_ar, name_en, logo_url, rating_avg, rating_count, membership_tier, is_verified, category_id, categories(name_ar, name_en), cities(name_ar, name_en)')
        .eq('is_active', true)
        .gt('rating_count', 0)
        .order('rating_avg', { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  if (!isLoading && providers.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/3 end-0 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
      </div>
      <div className="container px-4 sm:px-6 relative">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <div>
            <span className="text-xs sm:text-sm font-body text-accent font-semibold">
              {isRTL ? 'الأعلى تقييماً' : 'Top Rated'}
            </span>
            <h2 className="font-heading font-bold text-xl sm:text-3xl md:text-4xl text-foreground mt-1 sm:mt-2">
              {isRTL ? 'مزودو خدمة مميزون' : 'Featured Providers'}
            </h2>
          </div>
          <Link to="/search">
            <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm">
              {isRTL ? 'عرض الكل' : 'View All'}
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <ProviderSkeleton key={i} />)
          ) : (
            providers.map((biz: any, i: number) => {
              const name = language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar);
              const catName = biz.categories ? (language === 'ar' ? biz.categories.name_ar : biz.categories.name_en) : null;
              const cityName = biz.cities ? (language === 'ar' ? biz.cities.name_ar : biz.cities.name_en) : null;
              const isPremium = biz.membership_tier === 'premium' || biz.membership_tier === 'enterprise';

              return (
                <Link
                  key={biz.id}
                  to={`/business/${biz.username}`}
                  className={`group block rounded-2xl border border-border/50 dark:border-border/30 bg-card dark:bg-card/60 p-4 sm:p-5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 sm:hover:-translate-y-1 transition-all duration-500 ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-12 h-12 rounded-xl ring-2 ring-border/20 group-hover:ring-accent/30 transition-all">
                      <AvatarImage src={biz.logo_url} className="object-cover" />
                      <AvatarFallback className="rounded-xl bg-accent/10 text-accent font-bold text-lg">
                        {name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-heading font-bold text-sm truncate group-hover:text-accent transition-colors">
                          {name}
                        </h3>
                        {biz.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />}
                      </div>
                      {catName && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{catName}</p>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className={`w-3 h-3 ${si < Math.round(biz.rating_avg) ? 'text-accent fill-accent' : 'text-muted-foreground/20'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-foreground">{Number(biz.rating_avg).toFixed(1)}</span>
                    <span className="text-[10px] text-muted-foreground">({biz.rating_count})</span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cityName && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/50 dark:bg-muted/30 px-2 py-0.5 rounded-full">
                        <MapPin className="w-2.5 h-2.5" />{cityName}
                      </span>
                    )}
                    {isPremium && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-accent/10 text-accent border-0">
                        {biz.membership_tier === 'enterprise' ? (isRTL ? 'مؤسسات' : 'Enterprise') : (isRTL ? 'بريميوم' : 'Premium')}
                      </Badge>
                    )}
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
