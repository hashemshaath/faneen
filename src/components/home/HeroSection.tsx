import { Link } from "react-router-dom";
import { Search, Star, Shield, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEffect, useRef } from "react";
import heroBg from "@/assets/hero-bg.jpg";

export const HeroSection = () => {
  const { t } = useLanguage();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (imgRef.current) {
        const scrollY = window.scrollY;
        imgRef.current.style.transform = `translateY(${scrollY * 0.4}px) scale(1.1)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden">
      <img ref={imgRef} src={heroBg} alt="أعمال الألمنيوم والحديد والزجاج والخشب" className="absolute inset-0 w-full h-full object-cover will-change-transform scale-110" width={1920} height={1080} />
      <div className="absolute inset-0 bg-gradient-navy opacity-85" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(220 35% 10% / 0.3) 0%, hsl(220 35% 10% / 0.9) 100%)" }} />
      <div className="relative z-10 container text-center px-4 sm:px-6 animate-fade-up pt-16 sm:pt-0">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-gold/30 bg-gold/10 mb-6 sm:mb-8">
          <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
          <span className="text-xs sm:text-sm font-body text-gold">{t('hero.badge')}</span>
        </div>
        <h2 className="font-heading font-black text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-surface-nav-foreground leading-tight mb-4 sm:mb-6">
          {t('hero.title1')}
          <br />
          <span className="text-gradient-gold">{t('hero.title2')}</span>
        </h2>
        <p className="font-body text-base sm:text-lg md:text-xl text-surface-nav-foreground/70 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
          {t('hero.desc')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-12">
          <Link to="/search" className="w-full sm:w-auto">
            <Button variant="hero" size="lg" className="text-sm sm:text-base px-8 sm:px-10 py-5 sm:py-6 w-full sm:w-auto">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              {t('hero.search')}
            </Button>
          </Link>
          <Link to="/auth" className="w-full sm:w-auto">
            <Button variant="heroOutline" size="lg" className="text-sm sm:text-base px-8 sm:px-10 py-5 sm:py-6 w-full sm:w-auto">
              {t('hero.provider')}
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-surface-nav-foreground/60 font-body text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
            <span>{t('hero.providers_count')}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
            <span>{t('hero.reviews_count')}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
            <span>{t('hero.protection')}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
