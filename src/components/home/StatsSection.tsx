import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const stats = [
  { value: "2,500+", labelKey: 'stats.providers' as const },
  { value: "15,000+", labelKey: 'stats.reviews' as const },
  { value: "8,200+", labelKey: 'stats.projects' as const },
  { value: "98%", labelKey: 'stats.satisfaction' as const },
];

export const StatsSection = () => {
  const { t } = useLanguage();
  const parallaxRef = useParallax<HTMLDivElement>(0.08);
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section className="py-16 bg-muted/50 overflow-hidden">
      <div ref={visRef} className="container">
        <div ref={parallaxRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 will-change-transform">
          {stats.map((stat, i) => (
            <div
              key={stat.labelKey}
              className={`text-center transition-all duration-700 ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'both' }}
            >
              <div className="font-heading font-black text-3xl md:text-4xl text-gradient-gold mb-2">{stat.value}</div>
              <div className="font-body text-sm text-muted-foreground">{t(stat.labelKey)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
