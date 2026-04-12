import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Check, Sparkles, Crown, Building2 } from "lucide-react";

const memberships = [
  {
    titleKey: 'membership.individual' as const,
    descKey: 'membership.individual.desc' as const,
    icon: Check,
    features: [
      { ar: 'تصفح وبحث', en: 'Browse & Search' },
      { ar: 'تقييمات ومراجعات', en: 'Ratings & Reviews' },
      { ar: 'طلب عروض أسعار', en: 'Request Quotes' },
      { ar: 'سجل الأعمال', en: 'Work History' },
    ],
  },
  {
    titleKey: 'membership.business' as const,
    descKey: 'membership.business.desc' as const,
    featured: true,
    icon: Crown,
    features: [
      { ar: 'صفحة تعريفية', en: 'Profile Page' },
      { ar: 'معرض أعمال', en: 'Work Gallery' },
      { ar: 'استقبال طلبات', en: 'Receive Requests' },
      { ar: 'عقود إلكترونية', en: 'E-Contracts' },
      { ar: 'إعلانات مميزة', en: 'Featured Ads' },
    ],
  },
  {
    titleKey: 'membership.company' as const,
    descKey: 'membership.company.desc' as const,
    icon: Building2,
    features: [
      { ar: 'كل مميزات الأعمال', en: 'All Business Features' },
      { ar: 'تحليلات متقدمة', en: 'Advanced Analytics' },
      { ar: 'أولوية ظهور', en: 'Priority Listing' },
      { ar: 'دعم مخصص', en: 'Dedicated Support' },
      { ar: 'تقارير أداء', en: 'Performance Reports' },
    ],
  },
];

export const MembershipSection = () => {
  const { t, language } = useLanguage();
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section className="py-16 sm:py-28 bg-background overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px]" />
      </div>
      <div className="container px-4 sm:px-6 relative">
        <div className="text-center mb-12 sm:mb-20">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-body font-semibold mb-4 sm:mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            {t('membership.label')}
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-foreground leading-tight">{t('membership.title')}</h2>
        </div>
        <div ref={visRef} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 max-w-5xl mx-auto">
          {memberships.map((plan, idx) => (
            <div
              key={plan.titleKey}
              className={`group relative p-7 sm:p-10 rounded-2xl sm:rounded-3xl border transition-all duration-500 ${
                plan.featured
                  ? "bg-gradient-navy border-gold/40 md:scale-105 shadow-2xl shadow-gold/10 hover:shadow-[0_20px_60px_-10px_hsl(var(--gold)/0.3)] md:hover:scale-[1.08]"
                  : "bg-card dark:bg-card/60 border-border/50 dark:border-border/30 hover:border-accent/40 active:scale-[0.97] sm:hover:-translate-y-3 hover:shadow-xl hover:shadow-accent/5"
              } ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
            >
              {plan.featured && (
                <>
                  <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                  <div className="absolute -top-4 right-1/2 translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-gold text-xs font-heading font-bold text-secondary-foreground shadow-lg shadow-gold/20">
                    <Sparkles className="w-3 h-3 inline me-1" />
                    {t('membership.popular')}
                  </div>
                </>
              )}

              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-5 sm:mb-6 ${
                plan.featured ? 'bg-gold/20' : 'bg-accent/10 dark:bg-accent/15 group-hover:bg-gradient-gold'
              } transition-all duration-300`}>
                <plan.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${plan.featured ? 'text-gold' : 'text-accent group-hover:text-secondary-foreground'} transition-colors`} />
              </div>

              <h3 className={`font-heading font-bold text-xl sm:text-2xl mb-2 sm:mb-3 ${plan.featured ? "text-surface-nav-foreground" : "text-foreground group-hover:text-accent"} transition-colors duration-300`}>{t(plan.titleKey)}</h3>
              <p className={`font-body text-sm sm:text-base mb-6 sm:mb-8 leading-relaxed ${plan.featured ? "text-surface-nav-foreground/60" : "text-muted-foreground"}`}>{t(plan.descKey)}</p>

              <ul className="space-y-3 sm:space-y-3.5 mb-7 sm:mb-9">
                {plan.features.map((f, fi) => (
                  <li
                    key={f.en}
                    className={`flex items-center gap-3 font-body text-sm ${plan.featured ? "text-surface-nav-foreground/80" : "text-muted-foreground group-hover:text-foreground"} transition-all duration-300`}
                    style={{ transitionDelay: `${fi * 50}ms` }}
                  >
                    <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 ${plan.featured ? 'bg-gold/20' : 'bg-accent/10'}`}>
                      <Check className={`w-3 h-3 ${plan.featured ? 'text-gold' : 'text-accent'}`} />
                    </div>
                    {language === 'ar' ? f.ar : f.en}
                  </li>
                ))}
              </ul>

              <Link to="/auth">
                <Button variant={plan.featured ? "hero" : "outline"} className={`w-full text-sm sm:text-base py-3 transition-all duration-300 active:scale-95 ${!plan.featured ? "group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent" : "shadow-lg shadow-gold/20"}`}>
                  {t('membership.start')}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
