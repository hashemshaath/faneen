import { Link, useNavigate } from "react-router-dom";
import { Search, Star, Shield, Building2, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroBg1 from "@/assets/hero-bg.jpg";
import heroBg2 from "@/assets/hero-slide-2.jpg";
import heroBg3 from "@/assets/hero-slide-3.jpg";

const slides = [
  {
    image: heroBg1,
    titleKey1: 'hero.title1',
    titleKey2: 'hero.title2',
    descKey: 'hero.desc',
  },
  {
    image: heroBg2,
    title1Ar: 'واجهات زجاجية وألمنيوم',
    title1En: 'Glass & Aluminum Facades',
    title2Ar: 'بأعلى المعايير العالمية',
    title2En: 'With Global Standards',
    descAr: 'نوافذ، أبواب، واجهات معمارية بأحدث التقنيات وأفضل الخامات العالمية',
    descEn: 'Windows, doors, and architectural facades with the latest technologies',
  },
  {
    image: heroBg3,
    title1Ar: 'أعمال خشبية وحديدية',
    title1En: 'Wood & Iron Works',
    title2Ar: 'بلمسات احترافية مميزة',
    title2En: 'With Professional Touch',
    descAr: 'مطابخ فاخرة، خزائن، درابزين حديد، وأبواب بتصاميم عصرية',
    descEn: 'Luxury kitchens, cabinets, iron railings, and modern door designs',
  },
];

// Preload next slide images in background
const preloadImage = (src: string) => {
  const img = new Image();
  img.src = src;
};

const SearchBar = memo(({ categories, cities, language, isRTL, t, onSearch }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedCity) params.set('city', selectedCity);
    onSearch(params.toString());
  };

  return (
    <form onSubmit={handleSearch} className="mt-8 sm:mt-12 max-w-4xl mx-auto">
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-2xl shadow-black/20">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/40`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className={`w-full ${isRTL ? 'pr-11 pl-3' : 'pl-11 pr-3'} sm:${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/10 text-white placeholder:text-white/30 font-body text-sm border-0 outline-none focus:ring-2 focus:ring-gold/40 focus:bg-white/15 transition-all`}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="sm:w-44 py-3 sm:py-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/10 text-white font-body text-sm border-0 outline-none focus:ring-2 focus:ring-gold/40 appearance-none cursor-pointer"
          >
            <option value="" className="bg-surface-nav text-surface-nav-foreground">{isRTL ? 'جميع الأقسام' : 'All Categories'}</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id} className="bg-surface-nav text-surface-nav-foreground">
                {language === 'ar' ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>
          <select
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            className="sm:w-40 py-3 sm:py-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/10 text-white font-body text-sm border-0 outline-none focus:ring-2 focus:ring-gold/40 appearance-none cursor-pointer hidden sm:block"
          >
            <option value="" className="bg-surface-nav text-surface-nav-foreground">{isRTL ? 'جميع المدن' : 'All Cities'}</option>
            {cities.map((c: any) => (
              <option key={c.id} value={c.id} className="bg-surface-nav text-surface-nav-foreground">
                {language === 'ar' ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>
          <Button type="submit" variant="hero" size="lg" className="px-8 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl active:scale-95 transition-transform shadow-lg shadow-gold/30 text-sm sm:text-base">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 me-2" />
            {t('search.btn')}
          </Button>
        </div>
      </div>
    </form>
  );
});
SearchBar.displayName = 'SearchBar';

export const HeroSection = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const parallaxY = useRef(0);
  const rafRef = useRef<number>();
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

  const { data: categories = [] } = useQuery({
    queryKey: ['nav-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_ar, name_en, slug').eq('is_active', true).order('sort_order').limit(6);
      return data || [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['nav-cities'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name_ar, name_en').eq('is_active', true).limit(10);
      return data || [];
    },
  });

  // Preload non-current slide images after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      slides.forEach((slide, i) => {
        if (i !== 0) preloadImage(slide.image);
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-play
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(p => (p + 1) % slides.length), 6000);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  // Optimized parallax with rAF throttle
  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - parallaxY.current) > 2) {
          parallaxY.current = y;
          imgRefs.current.forEach(img => {
            if (img) img.style.transform = `translateY(${y * 0.35}px) scale(1.15)`;
          });
        }
        rafRef.current = undefined;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const goTo = useCallback((idx: number) => { setCurrent(idx); resetTimer(); }, [resetTimer]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);

  const handleSearch = useCallback((params: string) => {
    navigate(`/search?${params}`);
  }, [navigate]);

  return (
    <section className="relative min-h-[85vh] sm:min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Slides — only first image is eager, others lazy */}
      {slides.map((slide, i) => (
        <img
          key={i}
          ref={el => { imgRefs.current[i] = el; }}
          src={i === 0 ? slide.image : (current === i ? slide.image : undefined)}
          data-src={slide.image}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover will-change-transform scale-115 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          width={1920}
          height={1080}
          fetchPriority={i === 0 ? "high" : undefined}
          decoding={i === 0 ? "sync" : "async"}
          loading={i === 0 ? "eager" : "lazy"}
          onError={(e) => {
            // Fallback: load from data-src if src was undefined
            const img = e.currentTarget;
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc && img.src !== dataSrc) img.src = dataSrc;
          }}
        />
      ))}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, transparent 20%, hsl(220 35% 8% / 0.6) 70%)" }} />

      {/* Content */}
      <div className="relative z-10 container text-center px-4 sm:px-6 pt-24 sm:pt-28 pb-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/30 bg-gold/10 backdrop-blur-md mb-6 sm:mb-8 animate-fade-in">
          <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
          <span className="text-[11px] sm:text-sm font-body text-gold">{t('hero.badge')}</span>
        </div>

        {/* Title with slide transition */}
        <div className="min-h-[120px] sm:min-h-[180px] flex flex-col items-center justify-center">
          {slides.map((slide, i) => (
            <div key={i} className={`transition-all duration-700 absolute ${i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className="font-heading font-black text-[1.7rem] leading-[1.25] sm:text-4xl md:text-5xl lg:text-6xl text-white sm:leading-tight mb-3 sm:mb-5">
                {'titleKey1' in slide && slide.titleKey1
                  ? <>{t(slide.titleKey1 as any)}<br /><span className="text-gradient-gold">{t(slide.titleKey2 as any)}</span></>
                  : <>{(slide as any)[`title1${language === 'ar' ? 'Ar' : 'En'}`]}<br /><span className="text-gradient-gold">{(slide as any)[`title2${language === 'ar' ? 'Ar' : 'En'}`]}</span></>
                }
              </h2>
              <p className="font-body text-sm sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed px-2">
                {'descKey' in slide && slide.descKey
                  ? t(slide.descKey as any)
                  : (slide as any)[`desc${language === 'ar' ? 'Ar' : 'En'}`]
                }
              </p>
            </div>
          ))}
        </div>

        {/* Memoized Search Bar */}
        <SearchBar
          categories={categories}
          cities={cities}
          language={language}
          isRTL={isRTL}
          t={t}
          onSearch={handleSearch}
        />

        {/* Quick tags */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
          {categories.slice(0, 5).map((cat: any) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/search?category=${cat.id}`)}
              className="px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-body text-white/60 border border-white/15 hover:bg-gold/15 hover:text-gold hover:border-gold/30 active:scale-95 cursor-pointer transition-all duration-300"
            >
              {language === 'ar' ? cat.name_ar : cat.name_en}
            </button>
          ))}
        </div>

        {/* Slide controls */}
        <div className="flex items-center justify-center gap-3 mt-8 sm:mt-10">
          <button onClick={prev} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/60 hover:text-gold hover:bg-gold/15 hover:border-gold/30 transition-all active:scale-90">
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? 'bg-gold w-8' : 'bg-white/25 w-1.5 hover:bg-white/40'}`}
              />
            ))}
          </div>
          <button onClick={next} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/60 hover:text-gold hover:bg-gold/15 hover:border-gold/30 transition-all active:scale-90">
            {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-10 text-white/50 font-body text-[11px] sm:text-sm mt-6 sm:mt-10">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
            <span>{t('hero.providers_count')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
            <span>{t('hero.reviews_count')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
            <span>{t('hero.protection')}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
