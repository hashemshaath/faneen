import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Check, Sparkles, Crown, Building2, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listActiveMembershipPlans } from "@/modules/memberships";
import { Skeleton } from "@/components/ui/skeleton";

const tierIcons: Record<string, React.ElementType> = {
  free: Zap, basic: Check, premium: Crown, enterprise: Building2,
};

export const MembershipSection = () => {
  const { t, language } = useLanguage();
  const { ref: visRef, isVisible } = useScrollAnimation();
  const isRTL = language === 'ar';

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['home-membership-plans'],
    queryFn: async () => {
      type HomePlan = {
        id: string;
        name_ar: string;
        name_en: string;
        description_ar: string | null;
        description_en: string | null;
        tier: string;
        features: unknown;
        price_monthly: number | null;
        sort_order: number | null;
      };
      const { data } = await listActiveMembershipPlans<HomePlan>({
        select:
          'id, name_ar, name_en, description_ar, description_en, tier, features, price_monthly, sort_order',
        limit: 3,
      });
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <section className="py-8 sm:py-16 bg-background overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>
      <div className="container-app relative">
        <div className="text-center mb-12 sm:mb-20">
          <span className="section-eyebrow font-body mb-4 sm:mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            {isRTL ? 'لمزوّدي الخدمات الصناعية' : 'For industrial service providers'}
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-foreground leading-tight">
            {isRTL ? 'باقات عضوية تنمو مع منشأتك' : 'Membership plans that grow with your business'}
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {isRTL
              ? 'مخصّصة لمنشآت الألمنيوم والزجاج والأخشاب والحديد لتعزيز ظهورها واستلام طلبات العملاء. المستخدمون يتصفّحون الدليل ويطلبون عروض الأسعار مجاناً.'
              : 'Tailored for Aluminum, Glass, Wood, and Steel businesses to boost visibility and receive customer requests. Regular users browse and request quotes for free.'}
          </p>
        </div>
        <div ref={visRef} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 max-w-5xl mx-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))
          ) : plans.map((plan, idx) => {
            const isFeatured = plan.tier === 'premium';
            const Icon = tierIcons[plan.tier] || Zap;
            const features: string[] = Array.isArray(plan.features) ? plan.features as string[] : [];
            const name = isRTL ? plan.name_ar : plan.name_en;
            const desc = isRTL ? (plan.description_ar || '') : (plan.description_en || plan.description_ar || '');

            return (
              <div
                key={plan.id}
                className={`group relative p-7 sm:p-10 rounded-2xl sm:rounded-3xl border transition-all duration-500 ${
                  isFeatured
                    ? "bg-[#142D52] border-primary/40 md:scale-105 shadow-2xl hover:shadow-[0_20px_60px_-10px_rgba(14,158,111,0.35)] md:hover:scale-[1.08]"
                    : "bg-card dark:bg-card/60 border-border/50 dark:border-border/30 hover:border-primary/40 active:scale-[0.97] sm:hover:-translate-y-3 hover:shadow-xl hover:shadow-primary/5"
                } ${isVisible ? 'animate-card-slide-up' : ''}`}
                style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
              >
                {isFeatured && (
                  <>
                    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none">
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                    <div className="absolute -top-4 end-1/2 translate-x-1/2 px-5 py-1.5 rounded-full bg-primary text-xs font-heading font-bold text-white shadow-lg">
                      <Sparkles className="w-3 h-3 inline me-1" />
                      {t('membership.popular')}
                    </div>
                  </>
                )}

                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-5 sm:mb-6 ${
                  isFeatured ? 'bg-primary/20' : 'bg-primary-light dark:bg-primary/15 group-hover:bg-primary'
                } transition-all duration-300`}>
                  <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${isFeatured ? 'text-white' : 'text-primary group-hover:text-white'} transition-colors`} />
                </div>

                <h3 className={`font-heading font-bold text-xl sm:text-2xl mb-2 sm:mb-3 ${isFeatured ? "text-white" : "text-foreground group-hover:text-primary"} transition-colors duration-300`}>{name}</h3>
                <p className={`font-body text-sm sm:text-base mb-6 sm:mb-8 leading-relaxed ${isFeatured ? "text-white/70" : "text-muted-foreground"}`}>{desc}</p>

                {plan.price_monthly > 0 && (
                  <div className="mb-4">
                    <span className={`font-heading font-bold text-2xl ${isFeatured ? 'text-white' : 'text-foreground'}`}>
                      {plan.price_monthly}
                    </span>
                    <span className={`text-xs ms-1 ${isFeatured ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {isRTL ? 'ر.س/شهر' : 'SAR/mo'}
                    </span>
                  </div>
                )}
                {plan.price_monthly === 0 && (
                  <div className="mb-4">
                    <span className={`font-heading font-bold text-2xl ${isFeatured ? 'text-white' : 'text-foreground'}`}>
                      {isRTL ? 'مجاناً' : 'Free'}
                    </span>
                  </div>
                )}

                <ul className="space-y-3 sm:space-y-3.5 mb-7 sm:mb-9">
                  {features.slice(0, 5).map((feat, fi) => (
                    <li
                      key={fi}
                      className={`flex items-center gap-3 font-body text-sm ${isFeatured ? "text-white/85" : "text-muted-foreground group-hover:text-foreground"} transition-all duration-300`}
                      style={{ transitionDelay: `${fi * 50}ms` }}
                    >
                      <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 ${isFeatured ? 'bg-white/15' : 'bg-primary-light'}`}>
                        <Check className={`w-3 h-3 ${isFeatured ? 'text-white' : 'text-primary'}`} />
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link to="/membership">
                  <Button variant={isFeatured ? "primary" : "outline"} className={`w-full text-sm sm:text-base py-3 transition-all duration-300 active:scale-95 ${!isFeatured ? "group-hover:bg-primary group-hover:text-white group-hover:border-primary" : "shadow-lg"}`}>
                    {t('membership.start')}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
