import { Layers, Shield, Building2, Wrench, Users, ArrowRight, ArrowLeft, Zap, Paintbrush, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Link } from "react-router-dom";
import { useCategoryCounts } from '@/services/categories/useCategoryCounts';


import catAluminum from "@/assets/cat-aluminum.webp";
import catIron from "@/assets/cat-iron.webp";
import catGlass from "@/assets/cat-glass.webp";
import catWood from "@/assets/cat-wood.webp";
import catAccessories from "@/assets/cat-accessories.webp";
import catDesigners from "@/assets/cat-designers.webp";
import catEnergy from "@/assets/cat-energy.webp";
import catGypsum from "@/assets/cat-gypsum.webp";
import catFacades from "@/assets/cat-facades.webp";

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
  const { byId } = useCategoryCounts();

  return (
    <section id="categories" className="relative py-14 sm:py-24 bg-background overflow-hidden">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 start-[-10%] w-[420px] h-[420px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] end-[-10%] w-[420px] h-[420px] bg-primary/[0.06] rounded-full blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>

      <div className="container-app relative">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16 max-w-2xl mx-auto px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="font-body text-[11px] sm:text-xs font-semibold text-primary tracking-wide">
              {t('categories.label')}
            </span>
          </div>
          <h2 className="font-heading font-bold text-[26px] sm:text-4xl md:text-5xl text-foreground leading-[1.15] tracking-tight">
            {t('categories.title')}
          </h2>
          <p className="font-body text-muted-foreground mt-3 sm:mt-5 text-[14px] sm:text-base leading-relaxed">
            {t('categories.desc')}
          </p>
        </div>

        {/* Grid */}
        <div ref={visRef} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
          {categories.map((cat, i) => {
            const count = byId.get(cat.categoryId)?.providers_count;
            return (
            <Link
              to={`/search?category=${cat.categoryId}`}
              key={cat.titleKey}
              aria-label={t(cat.titleKey)}
              className={`group relative rounded-2xl sm:rounded-[22px] overflow-hidden bg-card border border-border/50 dark:border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.25)] hover:border-primary/40 active:scale-[0.98] sm:hover:-translate-y-1.5 transition-all duration-500 ${isVisible ? 'animate-card-slide-up' : ''}`}
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}
            >
              {/* Image area */}
              <div className="relative aspect-[4/3] sm:aspect-[5/3] overflow-hidden">
                <img
                  src={cat.image}
                  alt={t(cat.titleKey)}
                  loading="lazy"
                  width={480}
                  height={384}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.08]"
                />
                {/* Soft tint for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                {/* Top-start icon chip */}
                <div className="absolute top-2.5 start-2.5 sm:top-3.5 sm:start-3.5">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:border-primary transition-colors duration-300">
                    <cat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white transition-colors duration-300" />
                  </div>
                </div>
                {/* Title overlay (mobile-friendly) */}
                <div className="absolute inset-x-0 bottom-0 p-3 sm:hidden">
                  <h3 className="font-heading font-bold text-[13.5px] text-white leading-tight line-clamp-1 drop-shadow">
                    {t(cat.titleKey)}
                  </h3>
                  {typeof count === 'number' && count > 0 && (
                    <p className="font-body text-[11px] text-white/80 drop-shadow mt-0.5">
                      {isRTL ? `${count} مزود` : `${count} providers`}
                    </p>
                  )}
                </div>
              </div>

              {/* Body — desktop/tablet */}
              <div className="hidden sm:flex flex-col p-5 lg:p-6">
                <h3 className="font-heading font-bold text-lg lg:text-xl text-foreground leading-tight group-hover:text-primary transition-colors duration-300">
                  {t(cat.titleKey)}
                </h3>
                <p className="font-body text-muted-foreground text-[13px] lg:text-sm leading-relaxed mt-1.5 line-clamp-2">
                  {t(cat.descKey)}
                </p>
                {typeof count === 'number' && count > 0 && (
                  <span className="font-body text-[11px] text-muted-foreground/60 mt-1">
                    {isRTL ? `${count} مزود` : `${count} providers`}
                  </span>
                )}
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="font-body text-[12.5px] font-semibold text-primary tracking-wide">
                    {isRTL ? 'استكشف القسم' : 'Explore'}
                  </span>
                  <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                    <ArrowIcon className="w-3.5 h-3.5 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                  </span>
                </div>
              </div>

              {/* Body — mobile compact */}
              <div className="sm:hidden flex items-center justify-between px-3 py-2.5">
                <p className="font-body text-muted-foreground text-[11px] leading-snug line-clamp-1 flex-1">
                  {t(cat.descKey)}
                </p>
                <ArrowIcon className="w-3.5 h-3.5 text-primary shrink-0 ms-2" />
              </div>
            </Link>
          );
        })}
        </div>
      </div>
    </section>
  );
};
