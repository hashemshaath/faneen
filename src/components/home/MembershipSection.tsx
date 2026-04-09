import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const memberships = [
  {
    titleKey: 'membership.individual' as const,
    descKey: 'membership.individual.desc' as const,
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

  const titleRef = useParallax<HTMLDivElement>(0.1);
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container">
        <div ref={titleRef} className="text-center mb-16 will-change-transform">
          <span className="text-sm font-body text-accent font-semibold">{t('membership.label')}</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">{t('membership.title')}</h2>
        </div>
        <div ref={visRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {memberships.map((plan, idx) => (
            <div
              key={plan.titleKey}
              className={`group relative p-8 rounded-2xl border transition-all duration-500 ${
                plan.featured
                  ? "bg-gradient-navy border-gold/40 scale-105 shadow-gold hover:shadow-[0_20px_60px_-10px_hsl(var(--gold)/0.4)] hover:scale-[1.08]"
                  : "bg-card border-border hover:border-gold/30 hover:-translate-y-3 hover:shadow-xl hover:shadow-accent/10"
              } ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
            >
              {/* Glow effect on hover for non-featured */}
              {!plan.featured && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              )}
              {/* Shine sweep on hover for featured */}
              {plan.featured && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              )}
              {plan.featured && (
                <div className="absolute -top-4 right-1/2 translate-x-1/2 px-4 py-1 rounded-full bg-gradient-gold text-xs font-heading font-bold text-secondary-foreground shadow-lg">
                  {t('membership.popular')}
                </div>
              )}
              <h3 className={`font-heading font-bold text-2xl mb-2 transition-colors duration-300 ${plan.featured ? "text-primary-foreground" : "text-foreground group-hover:text-gold"}`}>{t(plan.titleKey)}</h3>
              <p className={`font-body text-sm mb-6 ${plan.featured ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{t(plan.descKey)}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, fi) => (
                  <li
                    key={f.en}
                    className={`flex items-center gap-2 font-body text-sm transition-all duration-300 ${plan.featured ? "text-primary-foreground/80" : "text-muted-foreground group-hover:text-foreground"}`}
                    style={{ transitionDelay: `${fi * 50}ms` }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full bg-gold transition-transform duration-300 group-hover:scale-150`} />
                    {language === 'ar' ? f.ar : f.en}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button variant={plan.featured ? "hero" : "outline"} className={`w-full transition-all duration-300 ${!plan.featured ? "group-hover:bg-gold group-hover:text-secondary-foreground group-hover:border-gold" : ""}`}>
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
