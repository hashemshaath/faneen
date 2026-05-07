import { Link, useNavigate } from "react-router-dom";
import { Search, Star, Shield, Building2, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEffect, useRef, useState, useCallback, memo, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// HeroParticles is purely decorative — defer it past LCP to keep the main
// thread free during the initial paint (improves INP/TBT on mobile).
const HeroParticles = lazy(() =>
  import("./HeroParticles").then((m) => ({ default: m.HeroParticles })),
);
// First slide is served from /public so we can <link rel="preload"> it from
// index.html — that preload only matches if the URL is identical here.
const heroBg1 = "/hero-bg.webp";
import heroBg2 from "@/assets/hero-slide-2.webp";
import heroBg3 from "@/assets/hero-slide-3.webp";

const slidesData = [
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
const slides = slidesData;

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
      <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-2xl shadow-black/30 ring-1 ring-inset ring-white/[0.05]">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search aria-hidden="true" className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/55" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={isRTL ? 'كلمة البحث' : 'Search query'}
              className="w-full pe-11 ps-3 sm:pe-12 sm:ps-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white/[0.06] text-white placeholder:text-white/60 font-body text-sm border-0 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-nav focus:bg-white/[0.1] transition-all"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            aria-label={isRTL ? 'تصفية حسب القسم' : 'Filter by category'}
            className="sm:w-44 py-3.5 sm:py-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/[0.06] text-white/80 font-body text-sm border-0 outline-none focus:ring-2 focus:ring-gold/40 appearance-none cursor-pointer"
          >
            <option value="" className="bg-surface-nav text-surface-nav-foreground">{isRTL ? 'جميع الأقسام' : 'All Categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-surface-nav text-surface-nav-foreground">
                {language === 'ar' ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>
          <select
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            aria-label={isRTL ? 'تصفية حسب المدينة' : 'Filter by city'}
            className="sm:w-40 py-3.5 sm:py-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/[0.06] text-white/80 font-body text-sm border-0 outline-none focus:ring-2 focus:ring-gold/40 appearance-none cursor-pointer hidden sm:block"
          >
            <option value="" className="bg-surface-nav text-surface-nav-foreground">{isRTL ? 'جميع المدن' : 'All Cities'}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id} className="bg-surface-nav text-surface-nav-foreground">
                {language === 'ar' ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>
          <Button type="submit" variant="hero" size="lg" className="px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl active:scale-95 transition-transform shadow-lg shadow-gold/25 text-sm sm:text-base font-semibold tracking-wide">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 me-2" />
            {t('search.btn')}
          </Button>
        </div>
      </div>
    </form>
  );
});
SearchBar.displayName = 'SearchBar';

// Splits text into <span class="hero-word"> tokens with staggered delay.
// Adds non-breaking spaces between words to keep natural wrapping.
const WordFade = memo(({ text, baseDelay = 0, stepMs = 110, className = '' }: { text: string; baseDelay?: number; stepMs?: number; className?: string }) => {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={`${i}-${w}`} className="hero-word" style={{ animationDelay: `${baseDelay + i * stepMs}ms` }}>
          {w}
          {i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  );
});
WordFade.displayName = 'WordFade';

const HeroTitle = memo(({ slides, current, language, t }: { slides: typeof slidesData; current: number; language: string; t: (key: string) => string }) => {
  const slide = slides[current];
  const line1 = 'titleKey1' in slide && slide.titleKey1
    ? t(slide.titleKey1 as string)
    : (slide as Record<string, string>)[`title1${language === 'ar' ? 'Ar' : 'En'}`];
  const line2 = 'titleKey2' in slide && slide.titleKey2
    ? t(slide.titleKey2 as string)
    : (slide as Record<string, string>)[`title2${language === 'ar' ? 'Ar' : 'En'}`];
  const desc = 'descKey' in slide && slide.descKey
    ? t(slide.descKey as string)
    : (slide as Record<string, string>)[`desc${language === 'ar' ? 'Ar' : 'En'}`];

  const line1Words = line1.split(/\s+/).filter(Boolean).length;
  const stepMs = 130; // calm cadence
  const baseDelay = 200;
  const line2Delay = baseDelay + line1Words * stepMs + 250;
  const line2Words = line2.split(/\s+/).filter(Boolean).length;
  const descDelay = line2Delay + line2Words * stepMs + 200;

  // Re-trigger animation per slide via key
  const animKey = `${current}-${language}`;

  return (
    <div className="min-h-[130px] sm:min-h-[200px] flex flex-col items-center justify-center">
      <div key={animKey}>
        <h2 className="font-heading font-black text-[1.8rem] leading-[1.2] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.75rem] text-white sm:leading-[1.15] mb-3 sm:mb-6 tracking-tight">
          <WordFade text={line1} baseDelay={baseDelay} stepMs={stepMs} />
          <br />
          <WordFade text={line2} baseDelay={line2Delay} stepMs={stepMs} className="text-gradient-gold-shimmer" />
        </h2>
        <p
          className="font-body text-sm sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed px-2 hero-word"
          style={{ animationDelay: `${descDelay}ms`, animationDuration: '1.1s' }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
});
HeroTitle.displayName = 'HeroTitle';

export const HeroSection = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const parallaxY = useRef(0);
  const rafRef = useRef<number>();
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement | null>(null);
  const currentRef = useRef(0);

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
    // Skip parallax entirely for users that prefer reduced motion AND on
    // narrow viewports where it adds INP cost without visual benefit.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const section = sectionRef.current;
    if (!section) return;
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - parallaxY.current) > 2) {
          parallaxY.current = y;
          // Only transform the visible slide — skips two no-op writes per frame
          const img = imgRefs.current[currentRef.current];
          if (img) img.style.transform = `translateY(${y * 0.35}px) scale(1.15)`;
        }
        rafRef.current = undefined;
      });
    };
    // Only listen while hero is intersecting — saves work once user scrolls past
    let attached = false;
    const attach = () => {
      if (attached) return;
      window.addEventListener("scroll", handleScroll, { passive: true });
      attached = true;
    };
    const detach = () => {
      if (!attached) return;
      window.removeEventListener("scroll", handleScroll);
      attached = false;
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries[0]?.isIntersecting ? attach() : detach();
      },
      { threshold: 0 },
    );
    io.observe(section);
    return () => {
      io.disconnect();
      detach();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const goTo = useCallback((idx: number) => { setCurrent(idx); resetTimer(); }, [resetTimer]);
  useEffect(() => { currentRef.current = current; }, [current]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);

  const handleSearch = useCallback((params: string) => {
    navigate(`/search?${params}`);
  }, [navigate]);

  return (
    <section ref={sectionRef} id="main-content" role="banner" aria-label={language === 'ar' ? 'القسم الرئيسي' : 'Hero section'} className="relative min-h-[85vh] sm:min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Slides — only first image is eager, others lazy */}
      {slides.map((slide, i) => (
        <img
          key={i}
          ref={el => { imgRefs.current[i] = el; }}
          src={i === 0 ? slide.image : (current === i ? slide.image : undefined)}
          data-src={slide.image}
          alt={i === current ? (language === 'ar' ? 'خلفية قسم البحث الرئيسي' : 'Hero background') : ''}
          className={`absolute inset-0 w-full h-full object-cover will-change-transform scale-[1.15] transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          width={1920}
          height={1080}
          {...(i === 0 ? { fetchpriority: "high" as const } : {})}
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/85" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 25%, hsl(42 85% 55% / 0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 30%, transparent 20%, hsl(220 35% 6% / 0.7) 70%)" }} />

      {/* Particles — deferred past first paint, no fallback (purely decorative) */}
      <Suspense fallback={null}>
        <HeroParticles />
      </Suspense>

      {/* Content */}
      <div className="relative z-10 container text-center px-4 sm:px-6 pt-24 sm:pt-28 pb-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gold/25 bg-gold/[0.08] backdrop-blur-xl mb-6 sm:mb-8 animate-fade-in shadow-sm shadow-gold/10">
          <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold fill-gold/30" />
          <span className="text-[11px] sm:text-sm font-body font-medium text-gold/90 tracking-wide">{t('hero.badge')}</span>
        </div>

        {/* Title with slide transition + typing animation */}
        <HeroTitle slides={slides} current={current} language={language} t={t} />

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
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 mt-4 sm:mt-6">
          {categories.slice(0, 5).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/search?category=${cat.id}`)}
              className="px-3.5 sm:px-4.5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-body font-medium text-white/80 border border-white/15 hover:bg-gold/10 hover:text-gold hover:border-gold/30 active:scale-95 cursor-pointer transition-all duration-300 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            >
              {language === 'ar' ? cat.name_ar : cat.name_en}
            </button>
          ))}
        </div>

        {/* Slide controls */}
        <div className="flex items-center justify-center gap-3 mt-8 sm:mt-10">
          <button onClick={prev} aria-label={language === 'ar' ? 'الشريحة السابقة' : 'Previous slide'} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/85 hover:text-gold hover:bg-gold/15 hover:border-gold/40 transition-all active:scale-90 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none">
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-500 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none ${i === current ? 'bg-gold w-8' : 'bg-white/25 w-1.5 hover:bg-white/40'}`}
                aria-label={`${language === 'ar' ? 'انتقل للشريحة' : 'Go to slide'} ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
              />
            ))}
          </div>
          <button onClick={next} aria-label={language === 'ar' ? 'الشريحة التالية' : 'Next slide'} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/85 hover:text-gold hover:bg-gold/15 hover:border-gold/40 transition-all active:scale-90 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none">
            {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10 text-white/75 font-body text-[10px] sm:text-sm mt-6 sm:mt-10">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold/70" />
            <span>{t('hero.providers_count')}</span>
          </div>
          <div className="w-px h-3 bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold/70" />
            <span>{t('hero.reviews_count')}</span>
          </div>
          <div className="w-px h-3 bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold/70" />
            <span>{t('hero.protection')}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

