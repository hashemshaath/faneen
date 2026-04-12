import { Search, Star, FileText, CreditCard, Shield, Award, Video, BarChart3 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  { icon: Search, titleKey: 'feat.search' as const, descKey: 'feat.search.desc' as const },
  { icon: Star, titleKey: 'feat.reviews' as const, descKey: 'feat.reviews.desc' as const },
  { icon: FileText, titleKey: 'feat.contracts' as const, descKey: 'feat.contracts.desc' as const },
  { icon: CreditCard, titleKey: 'feat.installments' as const, descKey: 'feat.installments.desc' as const },
  { icon: Shield, titleKey: 'feat.warranty' as const, descKey: 'feat.warranty.desc' as const },
  { icon: Award, titleKey: 'feat.certified' as const, descKey: 'feat.certified.desc' as const },
  { icon: Video, titleKey: 'feat.gallery' as const, descKey: 'feat.gallery.desc' as const },
  { icon: BarChart3, titleKey: 'feat.analytics' as const, descKey: 'feat.analytics.desc' as const },
];

export const FeaturesSection = () => {
  const { t } = useLanguage();
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section id="features" className="py-16 sm:py-28 bg-muted/30 dark:bg-card/20 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
      <div className="container px-4 sm:px-6 relative">
        <div className="text-center mb-12 sm:mb-20">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-body font-semibold mb-4 sm:mb-5">
            {t('features.label')}
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-foreground leading-tight">{t('features.title')}</h2>
        </div>
        <div ref={visRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feat, i) => (
            <div
              key={feat.titleKey}
              className={`relative p-5 sm:p-7 rounded-2xl bg-card dark:bg-card/60 border border-border/50 dark:border-border/30 hover:shadow-xl hover:shadow-accent/5 hover:border-accent/40 active:scale-[0.97] sm:hover:-translate-y-1.5 transition-all duration-500 group overflow-hidden ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-accent/10 dark:bg-accent/15 flex items-center justify-center mb-4 sm:mb-5 group-hover:bg-gradient-gold group-hover:scale-110 transition-all duration-300">
                  <feat.icon className="w-6 h-6 sm:w-7 sm:h-7 text-accent group-hover:text-secondary-foreground transition-colors duration-300" />
                </div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground mb-2 sm:mb-2.5 group-hover:text-accent transition-colors duration-300">{t(feat.titleKey)}</h3>
                <p className="font-body text-[11px] sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">{t(feat.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
