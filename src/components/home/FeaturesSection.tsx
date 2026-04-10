import { Search, Star, FileText, CreditCard, Shield, Award, Video, BarChart3 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";
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
  const titleRef = useParallax<HTMLDivElement>(0.1);
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section id="features" className="py-12 sm:py-24 bg-muted/50 dark:bg-card/30 overflow-hidden">
      <div className="container px-4 sm:px-6">
        <div ref={titleRef} className="text-center mb-8 sm:mb-16 will-change-transform">
          <span className="text-xs sm:text-sm font-body text-accent font-semibold">{t('features.label')}</span>
          <h2 className="font-heading font-bold text-xl sm:text-3xl md:text-4xl text-foreground mt-1.5 sm:mt-3">{t('features.title')}</h2>
        </div>
        <div ref={visRef} className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
          {features.map((feat, i) => (
            <div
              key={feat.titleKey}
              className={`p-3.5 sm:p-6 rounded-xl bg-card dark:bg-card/80 border border-border dark:border-border/40 hover:shadow-lg hover:border-accent/30 active:scale-[0.97] sm:hover:-translate-y-1 transition-all duration-500 group ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center mb-2.5 sm:mb-4 group-hover:bg-gradient-gold transition-all duration-300">
                <feat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-accent group-hover:text-secondary-foreground transition-colors duration-300" />
              </div>
              <h3 className="font-heading font-bold text-xs sm:text-base text-foreground mb-1 sm:mb-2 transition-colors duration-300 group-hover:text-accent">{t(feat.titleKey)}</h3>
              <p className="font-body text-[11px] sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">{t(feat.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
