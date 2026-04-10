import { Layers, Shield, Building2, Wrench, Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const categories = [
  { icon: Layers, titleKey: 'cat.aluminum' as const, descKey: 'cat.aluminum.desc' as const, color: "from-blue-500/20 to-blue-600/5 dark:from-blue-400/15 dark:to-blue-500/5" },
  { icon: Shield, titleKey: 'cat.iron' as const, descKey: 'cat.iron.desc' as const, color: "from-slate-500/20 to-slate-600/5 dark:from-slate-400/15 dark:to-slate-500/5" },
  { icon: Layers, titleKey: 'cat.glass' as const, descKey: 'cat.glass.desc' as const, color: "from-cyan-500/20 to-cyan-600/5 dark:from-cyan-400/15 dark:to-cyan-500/5" },
  { icon: Building2, titleKey: 'cat.wood' as const, descKey: 'cat.wood.desc' as const, color: "from-amber-500/20 to-amber-600/5 dark:from-amber-400/15 dark:to-amber-500/5" },
  { icon: Wrench, titleKey: 'cat.accessories' as const, descKey: 'cat.accessories.desc' as const, color: "from-rose-500/20 to-rose-600/5 dark:from-rose-400/15 dark:to-rose-500/5" },
  { icon: Users, titleKey: 'cat.designers' as const, descKey: 'cat.designers.desc' as const, color: "from-violet-500/20 to-violet-600/5 dark:from-violet-400/15 dark:to-violet-500/5" },
];

export const CategoriesSection = () => {
  const { t } = useLanguage();
  const titleRef = useParallax<HTMLDivElement>(0.12);
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section id="categories" className="py-16 sm:py-24 bg-background overflow-hidden">
      <div className="container px-4 sm:px-6">
        <div ref={titleRef} className="text-center mb-10 sm:mb-16 will-change-transform">
          <span className="text-sm font-body text-accent font-semibold tracking-wider">{t('categories.label')}</span>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-foreground mt-2 sm:mt-3">{t('categories.title')}</h2>
          <p className="font-body text-muted-foreground mt-3 sm:mt-4 max-w-xl mx-auto text-sm sm:text-base">{t('categories.desc')}</p>
        </div>
        <div ref={visRef} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {categories.map((cat, i) => (
            <div
              key={cat.titleKey}
              className={`group relative p-5 sm:p-8 rounded-xl sm:rounded-2xl bg-card border border-border hover:border-accent/40 hover:-translate-y-1 sm:hover:-translate-y-1.5 transition-all duration-500 cursor-pointer ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
            >
              <div className={`absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-gold flex items-center justify-center mb-3 sm:mb-5 group-hover:scale-110 transition-transform duration-300">
                  <cat.icon className="w-5 h-5 sm:w-7 sm:h-7 text-secondary-foreground" />
                </div>
                <h3 className="font-heading font-bold text-base sm:text-xl text-card-foreground mb-1 sm:mb-2 transition-colors duration-300 group-hover:text-accent">{t(cat.titleKey)}</h3>
                <p className="font-body text-muted-foreground text-xs sm:text-sm line-clamp-2">{t(cat.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
