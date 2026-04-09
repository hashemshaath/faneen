import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";

const stats = [
  { end: 2500, suffix: "+", labelKey: 'stats.providers' as const },
  { end: 15000, suffix: "+", labelKey: 'stats.reviews' as const },
  { end: 8200, suffix: "+", labelKey: 'stats.projects' as const },
  { end: 98, suffix: "%", labelKey: 'stats.satisfaction' as const },
];

const StatItem = ({ end, suffix, labelKey, index, isVisible }: {
  end: number; suffix: string; labelKey: string; index: number; isVisible: boolean;
}) => {
  const { t } = useLanguage();
  const display = useCountUp(end, isVisible, 2200);

  return (
    <div
      className={`text-center transition-all duration-700 ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'both' }}
    >
      <div className="font-heading font-black text-3xl md:text-4xl text-gradient-gold mb-2">
        {isVisible ? display + suffix : "0" + suffix}
      </div>
      <div className="font-body text-sm text-muted-foreground">{t(labelKey as any)}</div>
    </div>
  );
};

export const StatsSection = () => {
  const parallaxRef = useParallax<HTMLDivElement>(0.08);
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section className="py-16 bg-muted/50 overflow-hidden">
      <div ref={visRef} className="container">
        <div ref={parallaxRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 will-change-transform">
          {stats.map((stat, i) => (
            <StatItem key={stat.labelKey} {...stat} index={i} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
};
