import { Layers, Shield, Building2, Wrench, Users, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Link } from "react-router-dom";

import catAluminum from "@/assets/cat-aluminum.jpg";
import catIron from "@/assets/cat-iron.jpg";
import catGlass from "@/assets/cat-glass.jpg";
import catWood from "@/assets/cat-wood.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import catDesigners from "@/assets/cat-designers.jpg";

const categories = [
  { icon: Layers, image: catAluminum, titleKey: 'cat.aluminum' as const, descKey: 'cat.aluminum.desc' as const },
  { icon: Shield, image: catIron, titleKey: 'cat.iron' as const, descKey: 'cat.iron.desc' as const },
  { icon: Layers, image: catGlass, titleKey: 'cat.glass' as const, descKey: 'cat.glass.desc' as const },
  { icon: Building2, image: catWood, titleKey: 'cat.wood' as const, descKey: 'cat.wood.desc' as const },
  { icon: Wrench, image: catAccessories, titleKey: 'cat.accessories' as const, descKey: 'cat.accessories.desc' as const },
  { icon: Users, image: catDesigners, titleKey: 'cat.designers' as const, descKey: 'cat.designers.desc' as const },
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
              className={`group relative rounded-2xl overflow-hidden border border-border/30 dark:border-border/20 hover:border-accent/40 active:scale-[0.97] sm:hover:-translate-y-2 transition-all duration-500 cursor-pointer aspect-[4/3] sm:aspect-[5/3] ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
            >
              {/* Cover Image */}
              <img
                src={cat.image}
                alt={t(cat.titleKey)}
                loading="lazy"
                width={640}
                height={512}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-[0.35] group-hover:brightness-[0.25]"
              />
              {/* Unified accent overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/20 backdrop-blur-sm flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-accent/30 transition-colors">
                  <cat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <h3 className="font-heading font-bold text-sm sm:text-xl text-foreground mb-1 sm:mb-1.5 group-hover:text-accent transition-colors duration-300">
                  {t(cat.titleKey)}
                </h3>
                <p className="font-body text-muted-foreground text-[10px] sm:text-sm line-clamp-2 mb-2 sm:mb-3">
                  {t(cat.descKey)}
                </p>
                <div className="flex items-center gap-1 text-accent/70 group-hover:text-accent text-xs sm:text-sm font-medium transition-colors">
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
