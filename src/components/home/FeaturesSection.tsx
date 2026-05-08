import { Search, Star, FileText, CreditCard, Shield, Award, Video, BarChart3, Sparkles } from "lucide-react";
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
    <section id="features" className="relative py-12 sm:py-20 bg-muted/30 dark:bg-card/20 overflow-hidden">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 start-[-10%] w-[380px] h-[380px] bg-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] end-[-10%] w-[380px] h-[380px] bg-accent/[0.06] rounded-full blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>

      <div className="container-app relative">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-14 max-w-2xl mx-auto px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4 sm:mb-5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="font-body text-[11px] sm:text-xs font-semibold text-accent tracking-wide">
              {t('features.label')}
            </span>
          </div>
          <h2 className="font-heading font-bold text-[24px] sm:text-4xl md:text-5xl text-foreground leading-[1.15] tracking-tight">
            {t('features.title')}
          </h2>
        </div>

        {/* Grid — premium mobile design */}
        <div ref={visRef} className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
          {features.map((feat, i) => (
            <div
              key={feat.titleKey}
              className={`group relative rounded-2xl bg-card/80 dark:bg-card/50 backdrop-blur-sm border border-border/50 dark:border-border/30 p-3.5 sm:p-6 overflow-hidden hover:border-accent/40 hover:shadow-[0_18px_40px_-22px_hsl(var(--accent)/0.35)] active:scale-[0.97] sm:hover:-translate-y-1.5 transition-all duration-500 ${isVisible ? 'animate-card-slide-up' : ''}`}
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}
            >
              {/* Gradient sheen on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {/* Top corner glow */}
              <div className="absolute -top-10 -end-10 w-24 h-24 bg-accent/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 flex flex-col h-full">
                {/* Icon */}
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-accent/10 dark:bg-accent/15 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-gradient-gold group-hover:scale-110 transition-all duration-300 shadow-sm">
                  <feat.icon className="w-[18px] h-[18px] sm:w-6 sm:h-6 text-accent group-hover:text-secondary-foreground transition-colors duration-300" />
                </div>

                {/* Title */}
                <h3 className="font-heading font-bold text-[13px] sm:text-base leading-snug text-foreground mb-1.5 sm:mb-2 group-hover:text-accent transition-colors duration-300 line-clamp-2">
                  {t(feat.titleKey)}
                </h3>

                {/* Description */}
                <p className="font-body text-[11px] sm:text-[13.5px] text-muted-foreground leading-relaxed line-clamp-3">
                  {t(feat.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
