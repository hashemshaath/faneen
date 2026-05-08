import { Layers, Shield, Building2, Wrench, Users, ArrowRight, ArrowLeft, Zap, Paintbrush } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Link } from "react-router-dom";

import catAluminum from "@/assets/cat-aluminum.jpg";
import catIron from "@/assets/cat-iron.jpg";
import catGlass from "@/assets/cat-glass.jpg";
import catWood from "@/assets/cat-wood.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import catDesigners from "@/assets/cat-designers.jpg";
import catEnergy from "@/assets/cat-energy.jpg";
import catGypsum from "@/assets/cat-gypsum.jpg";
import catFacades from "@/assets/cat-facades.jpg";

const categories = [
  { icon: Layers, image: catAluminum, titleKey: 'cat.aluminum' as const, descKey: 'cat.aluminum.desc' as const, categoryId: '50cdcb8d-3ec3-4cdc-98ad-1c699d6c1abf' },
  { icon: Shield, image: catIron, titleKey: 'cat.iron' as const, descKey: 'cat.iron.desc' as const, categoryId: '9bbdbf31-b6e3-45ad-b565-941152ff1699' },
  { icon: Layers, image: catGlass, titleKey: 'cat.glass' as const, descKey: 'cat.glass.desc' as const, categoryId: '9abffeee-d88c-4fd8-8b8f-469d65ee0942' },
  { icon: Building2, image: catWood, titleKey: 'cat.wood' as const, descKey: 'cat.wood.desc' as const, categoryId: 'a49e779f-58d3-4003-a825-9bc161af8286' },
  { icon: Wrench, image: catAccessories, titleKey: 'cat.accessories' as const, descKey: 'cat.accessories.desc' as const, categoryId: '6995ec61-e346-4d3d-ae93-35a9a80b77c6' },
  { icon: Users, image: catDesigners, titleKey: 'cat.designers' as const, descKey: 'cat.designers.desc' as const, categoryId: 'f7ed2200-a91f-4a11-b783-748317fd5903' },
  { icon: Zap, image: catEnergy, titleKey: 'cat.energy' as const, descKey: 'cat.energy.desc' as const, categoryId: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e' },
  { icon: Paintbrush, image: catGypsum, titleKey: 'cat.gypsum' as const, descKey: 'cat.gypsum.desc' as const, categoryId: 'c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f' },
  { icon: Building2, image: catFacades, titleKey: 'cat.facades' as const, descKey: 'cat.facades.desc' as const, categoryId: 'd3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f80' },
];

export const CategoriesSection = () => {
  const { t, isRTL } = useLanguage();
  const { ref: visRef, isVisible } = useScrollAnimation();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section id="categories" className="py-8 sm:py-16 bg-background overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-20 start-10 w-72 h-72 bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 end-10 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
      </div>
      <div className="container-app relative">
        <div className="text-center mb-12 sm:mb-20">
          <span className="section-eyebrow font-body mb-4 sm:mb-5">
            {t('categories.label')}
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-foreground leading-tight">{t('categories.title')}</h2>
          <p className="font-body text-muted-foreground mt-4 sm:mt-6 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">{t('categories.desc')}</p>
        </div>
        <div ref={visRef} className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-7">
          {categories.map((cat, i) => (
            <Link
              to={`/search?category=${cat.categoryId}`}
              key={cat.titleKey}
              className={`group relative rounded-2xl sm:rounded-3xl overflow-hidden border border-border/40 dark:border-border/20 hover:border-accent/50 shadow-sm hover:shadow-2xl hover:shadow-accent/10 active:scale-[0.97] sm:hover:-translate-y-2 transition-all duration-500 cursor-pointer aspect-[4/3] sm:aspect-[5/3] ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
            >
              {/* Cover Image */}
              <img
                src={cat.image}
                alt={t(cat.titleKey)}
                loading="lazy"
                width={640}
                height={512}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-[0.3] group-hover:brightness-[0.2]"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 z-10">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-accent/15 backdrop-blur-md border border-accent/20 flex items-center justify-center mb-3 sm:mb-5 group-hover:bg-accent/25 group-hover:border-accent/40 group-hover:scale-110 transition-all duration-300">
                  <cat.icon className="w-5 h-5 sm:w-7 sm:h-7 text-accent" />
                </div>
                <h3 className="font-heading font-bold text-base sm:text-2xl text-white mb-1.5 sm:mb-2.5 group-hover:text-accent transition-colors duration-300">
                  {t(cat.titleKey)}
                </h3>
                <p className="font-body text-white/60 text-[11px] sm:text-sm leading-relaxed line-clamp-2 mb-2.5 sm:mb-4">
                  {t(cat.descKey)}
                </p>
                <div className="flex items-center gap-1.5 text-accent/80 group-hover:text-accent text-xs sm:text-sm font-semibold tracking-wide transition-colors">
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
