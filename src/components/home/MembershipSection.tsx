import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

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

  return (
    <section className="py-24 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-body text-gold font-semibold">{t('membership.label')}</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">{t('membership.title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {memberships.map(plan => (
            <div key={plan.titleKey} className={`relative p-8 rounded-2xl border transition-all duration-300 ${plan.featured ? "bg-gradient-navy border-gold/40 scale-105 shadow-gold" : "bg-card border-border hover:border-gold/30"}`}>
              {plan.featured && (
                <div className="absolute -top-4 right-1/2 translate-x-1/2 px-4 py-1 rounded-full bg-gradient-gold text-xs font-heading font-bold text-secondary-foreground">
                  {t('membership.popular')}
                </div>
              )}
              <h3 className={`font-heading font-bold text-2xl mb-2 ${plan.featured ? "text-primary-foreground" : "text-foreground"}`}>{t(plan.titleKey)}</h3>
              <p className={`font-body text-sm mb-6 ${plan.featured ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{t(plan.descKey)}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f.en} className={`flex items-center gap-2 font-body text-sm ${plan.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                    {language === 'ar' ? f.ar : f.en}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button variant={plan.featured ? "hero" : "outline"} className="w-full">
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
