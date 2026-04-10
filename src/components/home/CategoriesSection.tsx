import { Layers, Shield, Building2, Wrench, Users, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Link } from "react-router-dom";

const categories = [
  { icon: Layers, titleKey: 'cat.aluminum' as const, descKey: 'cat.aluminum.desc' as const, gradient: "from-blue-500 to-cyan-400", bgGlow: "bg-blue-500/10 dark:bg-blue-400/10" },
  { icon: Shield, titleKey: 'cat.iron' as const, descKey: 'cat.iron.desc' as const, gradient: "from-slate-600 to-slate-400", bgGlow: "bg-slate-500/10 dark:bg-slate-400/10" },
  { icon: Layers, titleKey: 'cat.glass' as const, descKey: 'cat.glass.desc' as const, gradient: "from-cyan-500 to-teal-400", bgGlow: "bg-cyan-500/10 dark:bg-cyan-400/10" },
  { icon: Building2, titleKey: 'cat.wood' as const, descKey: 'cat.wood.desc' as const, gradient: "from-amber-600 to-amber-400", bgGlow: "bg-amber-500/10 dark:bg-amber-400/10" },
  { icon: Wrench, titleKey: 'cat.accessories' as const, descKey: 'cat.accessories.desc' as const, gradient: "from-rose-500 to-pink-400", bgGlow: "bg-rose-500/10 dark:bg-rose-400/10" },
  { icon: Users, titleKey: 'cat.designers' as const, descKey: 'cat.designers.desc' as const, gradient: "from-violet-500 to-purple-400", bgGlow: "bg-violet-500/10 dark:bg-violet-400/10" },
];

export const CategoriesSection = () => {
  const { t, isRTL } = useLanguage();
  const { ref: visRef, isVisible } = useScrollAnimation();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section id="categories" className="py-14 sm:py-28 bg-background overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-20 start-10 w-72 h-72 bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 end-10 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
      </div>
      <div className="container px-4 sm:px-6 relative">
        <div className="text-center mb-10 sm:mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-body font-semibold mb-3 sm:mb-4">
            {t('categories.label')}
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-5xl text-foreground">{t('categories.title')}</h2>
          <p className="font-body text-muted-foreground mt-3 sm:mt-5 max-w-xl mx-auto text-xs sm:text-base">{t('categories.desc')}</p>
        </div>
        <div ref={visRef} className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {categories.map((cat, i) => (
            <Link
              to="/search"
              key={cat.titleKey}
              className={`group relative p-5 sm:p-8 rounded-2xl bg-card dark:bg-card/60 border border-border/50 dark:border-border/30 hover:border-accent/40 active:scale-[0.97] sm:hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
            >
              <div className={`absolute inset-0 ${cat.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-3 sm:mb-5 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  <cat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="font-heading font-bold text-sm sm:text-xl text-card-foreground mb-1.5 sm:mb-2.5 group-hover:text-accent transition-colors duration-300">{t(cat.titleKey)}</h3>
                <p className="font-body text-muted-foreground text-[11px] sm:text-sm line-clamp-2 mb-3 sm:mb-4">{t(cat.descKey)}</p>
                <div className="flex items-center gap-1 text-accent/60 group-hover:text-accent text-xs sm:text-sm font-medium transition-colors">
                  <span>{isRTL ? 'استكشف' : 'Explore'}</span>
                  <ArrowIcon className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
